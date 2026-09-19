import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { categoriesApi } from '@/api/endpoints'
import type { Category, CategoryKind } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldSelect } from '@/components/FieldSelect'
import { descendantIds } from '@/lib/categoryTree'
import { strings } from '@/strings'

const NO_PARENT = 'none'
const KINDS: CategoryKind[] = ['EXPENSE', 'INCOME']

/**
 * Create takes name, kind and parent; edit takes name and parent only — kind
 * is fixed once set, since it decides which transactions may use the category
 * and changing it would strand every row already filed under it.
 */
export function CategoryForm({
  category,
  /** Pre-selects a parent when adding beneath an existing row. */
  defaultParentId,
  categories,
  open,
  onOpenChange,
}: {
  category: Category | null
  defaultParentId?: string
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const isEditing = category !== null

  const [name, setName] = useState(category?.name ?? '')
  const [kind, setKind] = useState<CategoryKind>(
    category?.kind ??
      categories.find((row) => row.id === defaultParentId)?.kind ??
      'EXPENSE',
  )
  const [parentId, setParentId] = useState(
    category?.parentId ?? defaultParentId ?? NO_PARENT,
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // A parent must share the category's kind, and may not be the category
  // itself or anything beneath it — that would detach the branch.
  const forbidden = isEditing ? descendantIds(categories, category.id) : new Set<string>()
  const parentOptions = categories.filter(
    (row) => row.kind === kind && !forbidden.has(row.id),
  )

  const mutation = useMutation({
    mutationFn: () => {
      const parent = parentId === NO_PARENT ? null : parentId
      if (isEditing) {
        const patch: Parameters<typeof categoriesApi.update>[1] = {}
        if (name !== category.name) patch.name = name
        if (parent !== category.parentId) patch.parentId = parent
        return categoriesApi.update(category.id, patch)
      }
      return categoriesApi.create({ name, kind, parentId: parent })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(isEditing ? strings.categories.updated : strings.categories.created)
      onOpenChange(false)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.hasFieldErrors) {
        setFieldErrors(error.fieldErrors)
        return
      }
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? strings.categories.editTitle : strings.categories.addTitle}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="category-name">{strings.categories.name}</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {fieldErrors.name !== undefined && (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{strings.categories.kind}</Label>
            {isEditing ? (
              <p className="text-sm">{strings.categories.kinds[category.kind]}</p>
            ) : (
              <FieldSelect
                value={kind}
                onChange={(value) => {
                  setKind(value as CategoryKind)
                  // The old parent may belong to the other kind now.
                  setParentId(NO_PARENT)
                }}
                options={KINDS.map((categoryKind) => ({
                  value: categoryKind,
                  label: strings.categories.kinds[categoryKind],
                }))}
              />
            )}
            {!isEditing && (
              <p className="text-xs text-muted-foreground">{strings.categories.kindHint}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>{strings.categories.parent}</Label>
            <FieldSelect
              value={parentId}
              onChange={setParentId}
              options={[
                { value: NO_PARENT, label: strings.categories.noParent },
                ...parentOptions.map((option) => ({ value: option.id, label: option.name })),
              ]}
            />
            {fieldErrors.parentId !== undefined && (
              <p className="text-sm text-destructive">{fieldErrors.parentId}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {strings.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={mutation.isPending || name.trim() === ''}
            onClick={() => mutation.mutate()}
          >
            {strings.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

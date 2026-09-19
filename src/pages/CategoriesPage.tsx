import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { categoriesApi } from '@/api/endpoints'
import type { Category, CategoryKind } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { CategoryForm } from '@/components/categories/CategoryForm'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { buildCategoryTree, type CategoryNode } from '@/lib/categoryTree'
import { strings } from '@/strings'

type FormState =
  | { mode: 'closed' }
  | { mode: 'create'; parentId?: string }
  | { mode: 'edit'; category: Category }

export function CategoriesPage() {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<FormState>({ mode: 'closed' })
  const [deleting, setDeleting] = useState<Category | null>(null)

  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  const rows = categories.data ?? []

  const remove = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['categories'] })
      toast.success(strings.categories.deleted)
      setDeleting(null)
    },
    onError: (error) => {
      // Two different blocks share a 409: live sub-categories, or a budget
      // whose version is still open. The server's message names which.
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{strings.categories.title}</h1>
        <Button onClick={() => setForm({ mode: 'create' })}>{strings.categories.add}</Button>
      </div>

      {form.mode !== 'closed' && (
        <CategoryForm
          key={form.mode === 'edit' ? form.category.id : (form.parentId ?? 'new')}
          category={form.mode === 'edit' ? form.category : null}
          defaultParentId={form.mode === 'create' ? form.parentId : undefined}
          categories={rows}
          open
          onOpenChange={(next) => !next && setForm({ mode: 'closed' })}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{strings.categories.deleteTitle}</AlertDialogTitle>
            {/* Historical transactions keep the category and keep rendering
                its name — deleting only removes it from the pickers. */}
            <AlertDialogDescription>{strings.categories.deleteHint}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{strings.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={() => {
                if (deleting !== null) remove.mutate(deleting.id)
              }}
            >
              {strings.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QueryState query={categories} empty={strings.categories.empty}>
        {(all: Category[]) => (
          <div className="grid gap-4 lg:grid-cols-2">
            {(['EXPENSE', 'INCOME'] as CategoryKind[]).map((kind) => (
              <Card key={kind}>
                <CardContent className="py-4">
                  <p className="pb-2 text-sm font-medium">{strings.categories.kinds[kind]}</p>
                  {/* The API returns a flat list with parentId to arbitrary
                      depth; the tree is built client-side. */}
                  <ul>
                    {buildCategoryTree(all.filter((category) => category.kind === kind)).map(
                      (node) => (
                        <TreeRow
                          key={node.category.id}
                          node={node}
                          onAddChild={(parentId) => setForm({ mode: 'create', parentId })}
                          onEdit={(category) => setForm({ mode: 'edit', category })}
                          onDelete={setDeleting}
                        />
                      ),
                    )}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryState>
    </section>
  )
}

function TreeRow({
  node,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: CategoryNode
  onAddChild: (parentId: string) => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}) {
  return (
    <>
      <li
        className="group flex items-center gap-2 py-1"
        // Indent by depth: the tree is arbitrarily deep, so this can't be a
        // fixed two-level layout.
        style={{ paddingInlineStart: `${node.depth * 20}px` }}
      >
        <span className="min-w-0 flex-1 truncate text-sm">{node.category.name}</span>
        <span className="flex shrink-0 gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            variant="ghost"
            size="sm"
            aria-label={strings.categories.addChild}
            onClick={() => onAddChild(node.category.id)}
          >
            +
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onEdit(node.category)}>
            {strings.common.edit}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(node.category)}>
            {strings.common.delete}
          </Button>
        </span>
      </li>
      {node.children.map((child) => (
        <TreeRow
          key={child.category.id}
          node={child}
          onAddChild={onAddChild}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </>
  )
}

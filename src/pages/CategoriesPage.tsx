import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react'
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
import { cn } from '@/lib/utils'
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

  const actions: RowActionHandlers = {
    onAddChild: (parentId) => setForm({ mode: 'create', parentId }),
    onEdit: (category) => setForm({ mode: 'edit', category }),
    onDelete: setDeleting,
  }

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
          <div className="grid items-start gap-4 lg:grid-cols-2">
            {(['EXPENSE', 'INCOME'] as CategoryKind[]).map((kind) => (
              <Card key={kind}>
                <CardContent className="space-y-3">
                  <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    {strings.categories.kinds[kind]}
                  </p>
                  {/* The API returns a flat list with parentId to arbitrary
                      depth; the tree is built client-side. */}
                  <ul className="space-y-2">
                    {buildCategoryTree(all.filter((category) => category.kind === kind)).map(
                      (node) => (
                        <CategoryGroup key={node.category.id} node={node} actions={actions} />
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

interface RowActionHandlers {
  onAddChild: (parentId: string) => void
  onEdit: (category: Category) => void
  onDelete: (category: Category) => void
}

/**
 * A top-level category and everything under it, as one bordered block: the
 * parent is a tinted header, the sub-categories sit on the plain surface
 * below. On a white card, indent alone didn't separate the two.
 */
function CategoryGroup({ node, actions }: { node: CategoryNode; actions: RowActionHandlers }) {
  return (
    <li className="overflow-hidden rounded-lg border">
      <CategoryRow
        category={node.category}
        actions={actions}
        className="bg-muted py-1 pr-1.5 pl-3 font-medium"
      />
      {node.children.length > 0 && (
        <div className="border-t py-1.5 pr-1.5 pl-4">
          <Branch nodes={node.children} actions={actions} />
        </div>
      )}
    </li>
  )
}

/**
 * One level of sub-categories, hung off a guide line. Recursive rather than a
 * fixed second level: the tree is arbitrarily deep, and each level draws its
 * own line so depth stays readable.
 */
function Branch({ nodes, actions }: { nodes: CategoryNode[]; actions: RowActionHandlers }) {
  return (
    <ul className="border-l pl-3">
      {nodes.map((node) => (
        <li key={node.category.id}>
          <CategoryRow category={node.category} actions={actions} />
          {node.children.length > 0 && <Branch nodes={node.children} actions={actions} />}
        </li>
      ))}
    </ul>
  )
}

function CategoryRow({
  category,
  actions,
  className,
}: {
  category: Category
  actions: RowActionHandlers
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-2 text-sm', className)}>
      <span className="min-w-0 flex-1 truncate">{category.name}</span>
      {/* Always visible, not revealed on hover: a phone has no hover. */}
      <span className="flex shrink-0 text-muted-foreground">
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={strings.categories.addChild}
          title={strings.categories.addChild}
          onClick={() => actions.onAddChild(category.id)}
        >
          <PlusIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={strings.common.edit}
          title={strings.common.edit}
          onClick={() => actions.onEdit(category)}
        >
          <PencilIcon />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={strings.common.delete}
          title={strings.common.delete}
          onClick={() => actions.onDelete(category)}
        >
          <Trash2Icon />
        </Button>
      </span>
    </div>
  )
}

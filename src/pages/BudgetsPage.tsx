import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { budgetsApi, categoriesApi } from '@/api/endpoints'
import type { Budget } from '@/api/types'
import { MonthSelector } from '@/components/MonthSelector'
import { QueryState } from '@/components/QueryState'
import { BudgetBar } from '@/components/budgets/BudgetBar'
import { BudgetForm } from '@/components/budgets/BudgetForm'
import { BudgetUsageChart } from '@/components/budgets/BudgetUsageChart'
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
import { currentMonthInAlmaty } from '@/lib/format'
import { strings } from '@/strings'

export function BudgetsPage() {
  const [month, setMonth] = useState(currentMonthInAlmaty)
  const [editing, setEditing] = useState<Budget | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Budget | null>(null)
  const queryClient = useQueryClient()

  const budgets = useQuery({
    queryKey: ['budgets', month],
    queryFn: () => budgetsApi.list(month),
  })
  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const remove = useMutation({
    mutationFn: (id: string) => budgetsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast.success(strings.budgets.deleted)
      setDeleting(null)
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  const budgetedCategoryIds = new Set((budgets.data ?? []).map((budget) => budget.category.id))

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{strings.budgets.title}</h1>
        <div className="flex items-center gap-3">
          <MonthSelector month={month} onChange={setMonth} />
          <Button
            onClick={() => {
              setEditing(null)
              setIsFormOpen(true)
            }}
          >
            {strings.budgets.add}
          </Button>
        </div>
      </div>

      {isFormOpen && (
        <BudgetForm
          key={editing?.id ?? 'new'}
          budget={editing}
          categories={categories.data ?? []}
          budgetedCategoryIds={budgetedCategoryIds}
          open
          onOpenChange={(next) => !next && setIsFormOpen(false)}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{strings.budgets.deleteTitle}</AlertDialogTitle>
            {/* Deleting stops it from this month on; history is kept. */}
            <AlertDialogDescription>{strings.budgets.deleteHint}</AlertDialogDescription>
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

      {/* A month before any budget existed returns [] — that is a real state,
          not a missing configuration. */}
      <QueryState query={budgets} empty={strings.budgets.noneThisMonth}>
        {(rows: Budget[]) => (
          <div className="space-y-4">
            <BudgetUsageChart budgets={rows} />

            <ul className="space-y-3">
              {rows.map((budget) => (
                <li key={budget.id}>
                  <Card>
                    <CardContent className="flex items-center gap-4 py-4">
                      <div className="min-w-0 flex-1">
                        <BudgetBar budget={budget} />
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditing(budget)
                            setIsFormOpen(true)
                          }}
                        >
                          {strings.common.edit}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setDeleting(budget)}>
                          {strings.common.delete}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          </div>
        )}
      </QueryState>
    </section>
  )
}

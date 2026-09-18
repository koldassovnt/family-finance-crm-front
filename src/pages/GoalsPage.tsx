import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { accountsApi, categoriesApi, goalsApi } from '@/api/endpoints'
import type { Goal } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { GoalCard } from '@/components/goals/GoalCard'
import { GoalForm } from '@/components/goals/GoalForm'
import { TransactionForm } from '@/components/transactions/TransactionForm'
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
import { strings } from '@/strings'

export function GoalsPage() {
  const queryClient = useQueryClient()
  const [showAll, setShowAll] = useState(false)
  const [editing, setEditing] = useState<Goal | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [deleting, setDeleting] = useState<Goal | null>(null)
  const [contributingTo, setContributingTo] = useState<Goal | null>(null)

  // The API returns every status, so the filtering is ours to do.
  const goals = useQuery({
    queryKey: ['goals'],
    queryFn: goalsApi.list,
    select: (rows: Goal[]) => (showAll ? rows : rows.filter((goal) => goal.status === 'ACTIVE')),
  })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const remove = useMutation({
    mutationFn: (id: string) => goalsApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success(strings.goals.deleted)
      setDeleting(null)
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{strings.goals.title}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAll((previous) => !previous)}>
            {showAll ? strings.goals.showActive : strings.goals.showAll}
          </Button>
          <Button
            onClick={() => {
              setEditing(null)
              setIsFormOpen(true)
            }}
          >
            {strings.goals.add}
          </Button>
        </div>
      </div>

      {isFormOpen && (
        <GoalForm
          key={editing?.id ?? 'new'}
          goal={editing}
          accounts={accounts.data ?? []}
          open
          onOpenChange={(next) => !next && setIsFormOpen(false)}
        />
      )}

      {/* There is no contribute endpoint: progress is read off the linked
          account's balance, so contributing means recording an ordinary
          transaction into it. Pre-filled as a TRANSFER rather than INCOME —
          moving money between your own accounts isn't income, and filing it as
          such would double-count it in the monthly summary. The type stays
          switchable, since a salary paid straight in genuinely is income. */}
      {contributingTo !== null && (
        <TransactionForm
          key={contributingTo.id}
          open
          onOpenChange={(next) => !next && setContributingTo(null)}
          accounts={accounts.data ?? []}
          categories={categories.data ?? []}
          defaults={{ type: 'TRANSFER', toAccountId: contributingTo.linkedAccount.id }}
        />
      )}

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{strings.goals.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{strings.goals.deleteHint}</AlertDialogDescription>
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

      <QueryState
        query={goals}
        empty={showAll ? strings.common.empty : strings.goals.onlyActiveEmpty}
      >
        {(rows: Goal[]) => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                onContribute={() => setContributingTo(goal)}
                onEdit={() => {
                  setEditing(goal)
                  setIsFormOpen(true)
                }}
                onDelete={() => setDeleting(goal)}
              />
            ))}
          </div>
        )}
      </QueryState>
    </section>
  )
}

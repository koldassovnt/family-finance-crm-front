import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { transactionsApi } from '@/api/endpoints'
import type { Transaction } from '@/api/types'
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
import { formatDate, formatMoneyWithCurrency } from '@/lib/format'
import { strings } from '@/strings'

/**
 * Deleting is a soft delete server-side, but it **reverses the balance
 * effect** on both accounts of a transfer — a hidden transaction can't leave
 * a balance that assumes it still happened. That makes it the one row action
 * that silently changes a number elsewhere on screen, so it confirms first.
 */
export function DeleteTransactionDialog({
  transaction,
  open,
  onOpenChange,
}: {
  transaction: Transaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()

  const mutation = useMutation({
    mutationFn: (id: string) => transactionsApi.remove(id),
    onSuccess: () => {
      for (const key of ['transactions', 'account-transactions', 'accounts', 'summary', 'budgets', 'goals']) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
      toast.success(strings.transactions.deleted)
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{strings.transactions.deleteTitle}</AlertDialogTitle>
          <AlertDialogDescription>
            {transaction !== null && (
              <>
                {formatDate(transaction.occurredOn)} ·{' '}
                {formatMoneyWithCurrency(transaction.amount, transaction.currency)}
                <br />
              </>
            )}
            {strings.transactions.deleteWarning}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{strings.common.cancel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={mutation.isPending}
            onClick={() => {
              if (transaction !== null) mutation.mutate(transaction.id)
            }}
          >
            {strings.common.delete}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

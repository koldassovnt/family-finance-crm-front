import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { accountsApi } from '@/api/endpoints'
import type { Account } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatMoneyWithCurrency, parseMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

/**
 * Corrects a drifted balance by recording what the bank actually shows.
 *
 * The balance is never edited directly — the backend computes the delta and
 * writes an ADJUSTMENT for it, so the ledger always explains the balance.
 * That is also why the ordinary transaction endpoint rejects ADJUSTMENT:
 * this is the only route to one.
 */
export function ReconcileDialog({
  account,
  open,
  onOpenChange,
}: {
  account: Account
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [actual, setActual] = useState('')
  const [rate, setRate] = useState('')
  const [note, setNote] = useState('')

  const parsedActual = parseMoney(actual)
  const hasActual = !Number.isNaN(parsedActual) && actual.trim() !== ''
  const difference = hasActual ? parsedActual - account.balance : 0
  const needsRate = account.currency !== 'KZT'

  const mutation = useMutation({
    mutationFn: () =>
      accountsApi.reconcile(account.id, {
        actualBalance: parsedActual,
        exchangeRate: needsRate ? parseMoney(rate) : undefined,
        note: note.trim() === '' ? undefined : note.trim(),
      }),
    onSuccess: () => {
      for (const key of ['accounts', 'transactions', 'account-transactions']) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
      toast.success(strings.accounts.reconciled)
      reset()
      onOpenChange(false)
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  function reset() {
    setActual('')
    setRate('')
    setNote('')
  }

  // The API 400s when nothing drifted. Saying so up front is friendlier than
  // letting the user submit into a rejection.
  const isNoOp = hasActual && difference === 0

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{strings.accounts.reconcileTitle}</DialogTitle>
          <DialogDescription>{strings.accounts.reconcileHint}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{strings.accounts.currentBalance}</span>
            <span className="tabular-nums">
              {formatMoneyWithCurrency(account.balance, account.currency)}
            </span>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="actual">
              {strings.accounts.actualBalance}, {account.currency}
            </Label>
            <Input
              id="actual"
              inputMode="decimal"
              placeholder="0,00"
              value={actual}
              onChange={(event) => setActual(event.target.value)}
            />
          </div>

          {needsRate && (
            <div className="space-y-1.5">
              <Label htmlFor="rate">{strings.transactions.exchangeRate}</Label>
              <Input
                id="rate"
                inputMode="decimal"
                placeholder="478,35"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {strings.transactions.exchangeRateHint}
              </p>
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="reconcile-note">{strings.transactions.note}</Label>
            <Input
              id="reconcile-note"
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          {hasActual && (
            <div className="flex justify-between border-t pt-3 text-sm">
              <span className="text-muted-foreground">{strings.accounts.difference}</span>
              <span className={cn('tabular-nums', difference < 0 && 'text-destructive')}>
                {difference > 0 ? '+' : ''}
                {formatMoneyWithCurrency(difference, account.currency)}
              </span>
            </div>
          )}

          {isNoOp && (
            <p className="text-sm text-muted-foreground">{strings.accounts.reconcileNoChange}</p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {strings.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={!hasActual || isNoOp || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {strings.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

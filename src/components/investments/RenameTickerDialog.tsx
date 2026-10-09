import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { accountsApi } from '@/api/endpoints'
import type { Holding } from '@/api/types'
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
import { tickerRule } from '@/lib/tickers'
import { strings } from '@/strings'

/**
 * Renames a ticker across every trade of it in one account — for an asset
 * that changed its name, as TON did to GRAM. Editing the trades one by one
 * would do the same, slowly, and would pass through states where the position
 * is split across two tickers.
 *
 * It cannot merge: renaming onto a ticker the account already trades is a
 * 409, since two cost histories would have to become one.
 */
export function RenameTickerDialog({
  holding,
  open,
  onOpenChange,
}: {
  holding: Holding
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [to, setTo] = useState('')
  const [error, setError] = useState<string | undefined>()

  // The new name answers to the same format as any ticker in this account.
  const rule = tickerRule(holding.accountType, holding.currency)

  const mutation = useMutation({
    mutationFn: () =>
      accountsApi.renameHolding(holding.accountId, {
        from: holding.ticker,
        to: to.trim().toUpperCase(),
      }),
    onSuccess: () => {
      // The ticker is rewritten on the ledger rows too, not only the position.
      for (const key of ['investments', 'account-holdings', 'transactions', 'account-transactions']) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
      toast.success(strings.investments.renamed)
      onOpenChange(false)
    },
    onError: (failure) => {
      if (failure instanceof ApiError && failure.code === 'CONFLICT') {
        setError(strings.investments.renameConflict)
        return
      }
      if (failure instanceof ApiError && failure.hasFieldErrors) {
        // `from` is not an input here — it is the row that was clicked — so
        // its error has nowhere of its own to go and shares the one line.
        setError(failure.fieldErrors.to ?? failure.fieldErrors.from)
        return
      }
      toast.error(failure instanceof ApiError ? failure.message : strings.common.error)
    },
  })

  function save() {
    const next = to.trim().toUpperCase()
    if (next === '') {
      setError(strings.investments.errors.tickerRequired)
      return
    }
    if (next === holding.ticker) {
      setError(strings.investments.errors.tickerUnchanged)
      return
    }
    const formatError = rule?.validate(next)
    if (formatError != null) {
      setError(formatError)
      return
    }
    setError(undefined)
    mutation.mutate()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{strings.investments.renameTitle}</DialogTitle>
          <DialogDescription>
            {strings.investments.renameHint(holding.ticker, holding.accountName)}
          </DialogDescription>
        </DialogHeader>

        <form
          noValidate
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault()
            save()
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="rename-to">{strings.investments.renameTo}</Label>
            <Input
              id="rename-to"
              autoCapitalize="characters"
              autoComplete="off"
              maxLength={32}
              className="uppercase"
              placeholder={rule?.example}
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
            {error !== undefined && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {strings.common.cancel}
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {strings.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

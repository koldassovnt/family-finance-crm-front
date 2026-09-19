import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { transactionsApi } from '@/api/endpoints'
import type { Category, Transaction } from '@/api/types'
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
import { FieldSelect } from '@/components/FieldSelect'
import { parseMoney, todayInAlmaty } from '@/lib/format'
import { strings } from '@/strings'

const NO_CATEGORY = 'none'

/**
 * Edits the five things PATCH accepts. Type and both accounts are immutable —
 * changing those means delete and recreate — so they aren't offered.
 *
 * The cross-currency transfer is the case with a real rule behind it: the
 * server requires `amount` and `toAmount` in the same request, because moving
 * one side without the other leaves the two implying a rate that no longer
 * holds. So both inputs are shown together and submitted together.
 */
export function EditTransactionDialog({
  transaction,
  categories,
  open,
  onOpenChange,
}: {
  transaction: Transaction
  categories: Category[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()

  // `toAmount` is non-null only on a cross-currency transfer — no account
  // lookup needed to tell.
  const isCrossCurrency = transaction.type === 'TRANSFER' && transaction.toAmount !== null
  const isTransfer = transaction.type === 'TRANSFER'
  const needsRate = transaction.currency !== 'KZT'

  const [amount, setAmount] = useState(String(transaction.amount))
  const [toAmount, setToAmount] = useState(
    transaction.toAmount === null ? '' : String(transaction.toAmount),
  )
  const [rate, setRate] = useState(String(transaction.exchangeRate))
  const [occurredOn, setOccurredOn] = useState(transaction.occurredOn)
  const [categoryId, setCategoryId] = useState(transaction.category?.id ?? NO_CATEGORY)
  const [note, setNote] = useState(transaction.note ?? '')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: () => transactionsApi.update(transaction.id, buildPatch()),
    onSuccess: () => {
      for (const key of ['transactions', 'account-transactions', 'accounts', 'summary', 'budgets', 'goals']) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
      toast.success(strings.transactions.updated)
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

  /**
   * Only what changed. An absent key means "leave unchanged" and an explicit
   * null means "clear this", so sending the whole form would wipe a note or a
   * category the user never touched.
   */
  function buildPatch() {
    const patch: Parameters<typeof transactionsApi.update>[1] = {}

    const parsedAmount = parseMoney(amount)
    const amountChanged = !Number.isNaN(parsedAmount) && parsedAmount !== transaction.amount
    if (amountChanged) patch.amount = parsedAmount

    if (isCrossCurrency) {
      const parsedTo = parseMoney(toAmount)
      const toChanged = !Number.isNaN(parsedTo) && parsedTo !== transaction.toAmount
      if (amountChanged) {
        // The server rejects a lone amount here: both sides move together or
        // the transfer ends up implying a rate that no longer holds.
        patch.toAmount = parsedTo
      } else if (toChanged) {
        // Correcting only the destination is valid on its own.
        patch.toAmount = parsedTo
      }
    }

    const parsedRate = parseMoney(rate)
    if (needsRate && !Number.isNaN(parsedRate) && parsedRate !== transaction.exchangeRate) {
      patch.exchangeRate = parsedRate
    }

    if (occurredOn !== transaction.occurredOn) patch.occurredOn = occurredOn

    if (!isTransfer) {
      const current = transaction.category?.id ?? NO_CATEGORY
      if (categoryId !== current) {
        // Explicit null clears it; a real id sets it.
        patch.categoryId = categoryId === NO_CATEGORY ? null : categoryId
      }
    }

    const currentNote = transaction.note ?? ''
    if (note !== currentNote) patch.note = note.trim() === '' ? null : note.trim()

    return patch
  }

  const selectableCategories = categories.filter(
    (category) => category.kind === (transaction.type === 'INCOME' ? 'INCOME' : 'EXPENSE'),
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{strings.transactions.editTitle}</DialogTitle>
          <DialogDescription>{strings.transactions.immutableHint}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <EditField
            label={`${strings.transactions.amount}, ${transaction.currency}`}
            error={fieldErrors.amount}
          >
            <Input
              inputMode="decimal"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </EditField>

          {isCrossCurrency && (
            <EditField
              label={strings.transactions.toAmount}
              error={fieldErrors.toAmount}
              hint={strings.transactions.crossCurrencyHint}
            >
              <Input
                inputMode="decimal"
                value={toAmount}
                onChange={(event) => setToAmount(event.target.value)}
              />
            </EditField>
          )}

          {needsRate && (
            <EditField
              label={strings.transactions.exchangeRate}
              error={fieldErrors.exchangeRate}
              hint={strings.transactions.exchangeRateHint}
            >
              <Input
                inputMode="decimal"
                value={rate}
                onChange={(event) => setRate(event.target.value)}
              />
            </EditField>
          )}

          {!isTransfer && (
            <EditField label={strings.transactions.category} error={fieldErrors.categoryId}>
              <FieldSelect
                value={categoryId}
                onChange={setCategoryId}
                options={[
                  { value: NO_CATEGORY, label: strings.transactions.noCategory },
                  ...selectableCategories.map((category) => ({
                    value: category.id,
                    label: category.name,
                  })),
                ]}
              />
            </EditField>
          )}

          <EditField label={strings.transactions.date} error={fieldErrors.occurredOn}>
            <Input
              type="date"
              max={todayInAlmaty()}
              value={occurredOn}
              onChange={(event) => setOccurredOn(event.target.value)}
            />
          </EditField>

          <EditField label={strings.transactions.note} error={fieldErrors.note}>
            <Input value={note} onChange={(event) => setNote(event.target.value)} />
          </EditField>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {strings.common.cancel}
          </Button>
          <Button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()}>
            {strings.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditField({
  label,
  error,
  hint,
  children,
}: {
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {children}
      {hint !== undefined && error === undefined && (
        <p className="text-xs text-muted-foreground">{hint}</p>
      )}
      {error !== undefined && <p className="text-sm text-destructive">{error}</p>}
    </div>
  )
}

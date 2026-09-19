import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { billsApi } from '@/api/endpoints'
import type { Bill } from '@/api/types'
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
import { parseMoney } from '@/lib/format'
import { strings } from '@/strings'

/**
 * A bill is deliberately minimal: name, amount, currency, due date. It carries
 * no exchange rate and no KZT figure, because nothing sums bills — a total
 * across currencies would need the same treatment transactions get.
 */
export function BillForm({
  bill,
  open,
  onOpenChange,
}: {
  bill: Bill | null
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const isEditing = bill !== null

  const [name, setName] = useState(bill?.name ?? '')
  const [amount, setAmount] = useState(bill === null ? '' : String(bill.amount))
  const [currency, setCurrency] = useState(bill?.currency ?? 'KZT')
  const [dueDate, setDueDate] = useState(bill?.dueDate ?? '')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: () => {
      if (isEditing) {
        const patch: Parameters<typeof billsApi.update>[1] = {}
        if (name !== bill.name) patch.name = name
        if (dueDate !== bill.dueDate) patch.dueDate = dueDate

        const parsedAmount = parseMoney(amount)
        const currencyChanged = currency !== bill.currency
        if (currencyChanged) {
          // Changing the currency requires restating the amount — nothing
          // converts it, so the old figure would silently mean something else.
          patch.currency = currency
          patch.amount = parsedAmount
        } else if (parsedAmount !== bill.amount) {
          patch.amount = parsedAmount
        }

        return billsApi.update(bill.id, patch)
      }
      return billsApi.create({
        name,
        amount: parseMoney(amount),
        currency: currency.toUpperCase(),
        dueDate,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['bills'] })
      toast.success(isEditing ? strings.bills.updated : strings.bills.created)
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
          <DialogTitle>{isEditing ? strings.bills.editTitle : strings.bills.addTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="bill-name">{strings.bills.name}</Label>
            <Input id="bill-name" value={name} onChange={(event) => setName(event.target.value)} />
            {fieldErrors.name !== undefined && (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="bill-amount">{strings.bills.amount}</Label>
              <Input
                id="bill-amount"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
              {fieldErrors.amount !== undefined && (
                <p className="text-sm text-destructive">{fieldErrors.amount}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bill-currency">{strings.bills.currency}</Label>
              <Input
                id="bill-currency"
                maxLength={3}
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              />
              {fieldErrors.currency !== undefined && (
                <p className="text-sm text-destructive">{fieldErrors.currency}</p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="bill-date">{strings.bills.dueDate}</Label>
            {/* Unlike a transaction, a bill is meant to be in the future. */}
            <Input
              id="bill-date"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
            {fieldErrors.dueDate !== undefined && (
              <p className="text-sm text-destructive">{fieldErrors.dueDate}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {strings.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={
              mutation.isPending || name.trim() === '' || amount.trim() === '' || dueDate === ''
            }
            onClick={() => mutation.mutate()}
          >
            {strings.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

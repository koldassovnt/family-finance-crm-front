import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { billsApi } from '@/api/endpoints'
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
import { addMonths, currentMonthInAlmaty, formatDate, parseMoney } from '@/lib/format'
import { strings } from '@/strings'

/** The API rejects a batch larger than this. */
const MAX_ROWS = 120

/**
 * Expands a pattern into ordinary bills in one call — there is no recurrence
 * engine and no job generating rows later. Once created they are independent
 * bills: editing one month's amount doesn't touch its siblings.
 *
 * The preview exists because of the clamping rule: asking for the 31st in a
 * 30-day month lands on the 30th rather than skipping the month or rolling
 * into the next. That is easy to state and hard to believe until you see the
 * actual dates.
 */
export function BillBatchForm({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('KZT')
  const [dayOfMonth, setDayOfMonth] = useState('15')
  const [startMonth, setStartMonth] = useState(currentMonthInAlmaty)
  const [endMonth, setEndMonth] = useState(() => addMonths(currentMonthInAlmaty(), 2))
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const day = Number(dayOfMonth)
  const preview = buildPreview(startMonth, endMonth, day)
  const rangeInverted = startMonth > endMonth
  const tooMany = preview.length > MAX_ROWS

  const mutation = useMutation({
    mutationFn: () =>
      billsApi.createBatch({
        name,
        amount: parseMoney(amount),
        currency: currency.toUpperCase(),
        dayOfMonth: day,
        startMonth,
        endMonth,
      }),
    onSuccess: (created) => {
      void queryClient.invalidateQueries({ queryKey: ['bills'] })
      toast.success(`${strings.bills.batchCreated}: ${created.length}`)
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{strings.bills.batchTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="batch-name">{strings.bills.name}</Label>
            <Input
              id="batch-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            {fieldErrors.name !== undefined && (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="batch-amount">{strings.bills.amount}</Label>
              <Input
                id="batch-amount"
                inputMode="decimal"
                placeholder="0,00"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="batch-currency">{strings.bills.currency}</Label>
              <Input
                id="batch-currency"
                maxLength={3}
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="batch-day">{strings.bills.dayOfMonth}</Label>
            <Input
              id="batch-day"
              inputMode="numeric"
              value={dayOfMonth}
              onChange={(event) => setDayOfMonth(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">{strings.bills.clampHint}</p>
            {fieldErrors.dayOfMonth !== undefined && (
              <p className="text-sm text-destructive">{fieldErrors.dayOfMonth}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="batch-start">{strings.bills.startMonth}</Label>
              <Input
                id="batch-start"
                type="month"
                value={startMonth}
                onChange={(event) => setStartMonth(event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="batch-end">{strings.bills.endMonth}</Label>
              <Input
                id="batch-end"
                type="month"
                value={endMonth}
                onChange={(event) => setEndMonth(event.target.value)}
              />
            </div>
          </div>

          {rangeInverted && (
            <p className="text-sm text-destructive">{strings.bills.invalidRange}</p>
          )}
          {tooMany && <p className="text-sm text-destructive">{strings.bills.tooManyRows}</p>}

          {/* The real dates, clamping included, before anything is created. */}
          {!rangeInverted && !tooMany && preview.length > 0 && (
            <div className="space-y-1 rounded-md border p-3">
              <p className="text-xs text-muted-foreground">
                {strings.bills.preview}: {preview.length}
              </p>
              <ul className="max-h-32 space-y-0.5 overflow-y-auto text-sm tabular-nums">
                {preview.map((date) => (
                  <li key={date}>{formatDate(date)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {strings.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={
              mutation.isPending ||
              rangeInverted ||
              tooMany ||
              name.trim() === '' ||
              amount.trim() === '' ||
              !(day >= 1 && day <= 31)
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

/**
 * Mirrors the backend's expansion, including the clamp to a short month's last
 * day. Preview only — the server still does the real thing.
 */
function buildPreview(startMonth: string, endMonth: string, day: number): string[] {
  if (!(day >= 1 && day <= 31) || startMonth > endMonth) return []

  const dates: string[] = []
  let month = startMonth
  while (month <= endMonth && dates.length <= MAX_ROWS) {
    const [year, monthNumber] = month.split('-').map(Number)
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
    const clamped = Math.min(day, lastDay)
    dates.push(`${month}-${String(clamped).padStart(2, '0')}`)
    month = addMonths(month, 1)
  }
  return dates
}

import type { Bill } from '@/api/types'
import { formatMoneyWithCurrency, todayInAlmaty } from '@/lib/format'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

/**
 * A month grid of bills, weeks starting Monday as Russian calendars do.
 *
 * Built from the ISO date strings rather than Date objects: `dueDate` is a
 * plain `yyyy-MM-dd` with no time or zone, and turning it into a Date would
 * reintroduce the browser's timezone into something the backend deliberately
 * keeps zone-free.
 */
export function BillCalendar({
  month,
  bills,
  onSelect,
}: {
  /** `yyyy-MM`. */
  month: string
  bills: Bill[]
  onSelect: (bill: Bill) => void
}) {
  const [year, monthNumber] = month.split('-').map(Number)
  const daysInMonth = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()
  // getUTCDay is Sunday-based; shift so Monday is 0.
  const firstWeekday = (new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay() + 6) % 7
  const today = todayInAlmaty()

  const byDay = new Map<number, Bill[]>()
  for (const bill of bills) {
    const day = Number(bill.dueDate.slice(8, 10))
    byDay.set(day, [...(byDay.get(day) ?? []), bill])
  }

  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => index + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs text-muted-foreground">
        {strings.bills.weekdays.map((weekday) => (
          <div key={weekday} className="py-2">
            {weekday}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {cells.map((day, index) => {
          if (day === null) {
            return <div key={`empty-${index}`} className="min-h-24 border-b border-r bg-muted/20" />
          }
          const iso = `${month}-${String(day).padStart(2, '0')}`
          const dayBills = byDay.get(day) ?? []
          return (
            <div
              key={iso}
              className={cn(
                'min-h-24 space-y-1 border-b border-r p-1.5',
                iso === today && 'bg-accent/40',
              )}
            >
              <div className="text-xs text-muted-foreground tabular-nums">{day}</div>
              {dayBills.map((bill) => (
                <button
                  key={bill.id}
                  type="button"
                  onClick={() => onSelect(bill)}
                  className={cn(
                    'block w-full truncate rounded px-1 py-0.5 text-left text-xs',
                    // overdue comes from the server; never recomputed here.
                    bill.overdue
                      ? 'bg-destructive/15 text-destructive'
                      : bill.isPaid
                        ? 'bg-muted text-muted-foreground line-through'
                        : 'bg-[var(--chart-1)]/15',
                  )}
                  title={`${bill.name} · ${formatMoneyWithCurrency(bill.amount, bill.currency)}`}
                >
                  {bill.name}
                </button>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

import { Button } from '@/components/ui/button'
import { addMonths, currentMonthInAlmaty, formatMonth } from '@/lib/format'

interface MonthSelectorProps {
  /** `yyyy-MM`. */
  month: string
  onChange: (month: string) => void
  /** Lets the selector step past the current month. Off unless the screen needs it. */
  allowFuture?: boolean
}

/**
 * Shared by the dashboard and /budgets so the two read as one system.
 *
 * Future months are unreachable by default: the budgets endpoint rejects them,
 * and a future summary could only ever be zero, which looks exactly like a
 * real month with no spending. Bills are the exception — a bill is by nature
 * something due later — so /bills opts in with `allowFuture`.
 */
export function MonthSelector({ month, onChange, allowFuture = false }: MonthSelectorProps) {
  const isAtCurrentMonth = !allowFuture && month >= currentMonthInAlmaty()

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        aria-label="Предыдущий месяц"
        onClick={() => onChange(addMonths(month, -1))}
      >
        <span aria-hidden="true">←</span>
      </Button>
      <span className="min-w-44 text-center text-sm font-medium first-letter:uppercase">
        {formatMonth(month)}
      </span>
      <Button
        variant="outline"
        size="icon"
        aria-label="Следующий месяц"
        disabled={isAtCurrentMonth}
        onClick={() => onChange(addMonths(month, 1))}
      >
        <span aria-hidden="true">→</span>
      </Button>
    </div>
  )
}

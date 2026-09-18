import type { Budget } from '@/api/types'
import { formatMoney, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

/**
 * Amber past the budget's own `alertThresholdPercent`, red past 100%.
 * Styling only — nothing alerts anywhere in this system; the threshold is a
 * number the API returns for exactly this purpose.
 */
function budgetBarColor(budget: Budget): string {
  if (budget.percentUsed >= 100) return 'bg-destructive'
  if (budget.alertThresholdPercent !== null && budget.percentUsed >= budget.alertThresholdPercent) {
    return 'bg-amber-500'
  }
  return 'bg-[var(--chart-1)]'
}

/**
 * Shared by the dashboard panel and /budgets so the two can't drift apart.
 *
 * The bar's width clamps at 100% so it cannot overflow its track, but the
 * figures beside it don't: `percentUsed` runs past 100 and `remaining` goes
 * negative. Overspend is information to show, not hide.
 */
export function BudgetBar({ budget }: { budget: Budget }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate">{budget.category.name}</span>
        <span className="shrink-0 tabular-nums text-muted-foreground">
          {formatMoney(budget.spent)} / {formatMoney(budget.limitAmount)}
        </span>
      </div>
      <div
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={Math.round(budget.percentUsed)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={budget.category.name}
      >
        <div
          className={cn('h-full rounded-full transition-all', budgetBarColor(budget))}
          style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span className="tabular-nums">{formatPercent(budget.percentUsed)}</span>
        <span className={cn('tabular-nums', budget.remaining < 0 && 'text-destructive')}>
          {strings.budgets.remaining}: {formatMoney(budget.remaining)}
        </span>
      </div>
    </div>
  )
}

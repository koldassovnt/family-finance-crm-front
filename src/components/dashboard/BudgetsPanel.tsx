import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { budgetsApi } from '@/api/endpoints'
import type { Budget } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoney, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

/**
 * Amber past the budget's own alertThresholdPercent, red past 100%. Styling
 * only — no alerting exists anywhere in the system, the threshold is just a
 * number the API hands back for this purpose.
 */
function barColor(budget: Budget): string {
  if (budget.percentUsed >= 100) return 'bg-destructive'
  if (budget.alertThresholdPercent !== null && budget.percentUsed >= budget.alertThresholdPercent) {
    return 'bg-amber-500'
  }
  return 'bg-[var(--chart-1)]'
}

export function BudgetsPanel({ month }: { month: string }) {
  const query = useQuery({
    queryKey: ['budgets', month],
    queryFn: () => budgetsApi.list(month),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Link to="/budgets" className="underline-offset-4 hover:underline">
            {strings.dashboard.budgets}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* An empty month means "no budget existed then", not "none configured". */}
        <QueryState query={query} empty={strings.budgets.noneThisMonth}>
          {(budgets: Budget[]) => (
            <ul className="space-y-4">
              {budgets.map((budget) => (
                <li key={budget.id} className="space-y-1.5">
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
                    {/* Width clamps at 100 so the bar can't overflow its track,
                        but the figures beside it stay uncapped. */}
                    <div
                      className={cn('h-full rounded-full transition-all', barColor(budget))}
                      style={{ width: `${Math.min(budget.percentUsed, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span className="tabular-nums">{formatPercent(budget.percentUsed)}</span>
                    {/* Remaining goes negative on overspend — show the real number. */}
                    <span className={cn('tabular-nums', budget.remaining < 0 && 'text-destructive')}>
                      {strings.budgets.remaining}: {formatMoney(budget.remaining)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </CardContent>
    </Card>
  )
}

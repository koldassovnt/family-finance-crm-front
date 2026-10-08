import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '@/api/endpoints'
import type { CategorySummary, MonthlySummary } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoneyWithCurrency } from '@/lib/format'
import { strings } from '@/strings'

/**
 * Every expense category of the month with its total, largest first.
 *
 * The bar chart above carries the same title but stops at ten bars and folds
 * the rest into «Прочее»; this is where that remainder can be read row by row.
 * Always KZT, like the summary it comes from.
 *
 * Shares the summary panel's query key, so it costs no second request.
 */
export function CategoryExpensesPanel({ month }: { month: string }) {
  const query = useQuery({
    queryKey: ['summary', month],
    queryFn: () => transactionsApi.summary(month),
    select: (summary: MonthlySummary) =>
      [...summary.expenseByCategory].sort((a, b) => b.total - a.total),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{strings.dashboard.spendingByCategory}</CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState query={query} empty={strings.dashboard.noExpenses}>
          {(rows: CategorySummary[]) => (
            <ul className="divide-y">
              {rows.map((row) => (
                // A null category is a real, expected row — an uncategorised
                // expense — and there is at most one, so it can key itself.
                <li
                  key={row.categoryId ?? 'uncategorized'}
                  className="flex items-center justify-between gap-4 py-2"
                >
                  <span className="truncate text-sm">
                    {row.categoryName ?? strings.common.uncategorized}
                  </span>
                  <span className="shrink-0 text-sm tabular-nums">
                    {formatMoneyWithCurrency(row.total, 'KZT')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </CardContent>
    </Card>
  )
}

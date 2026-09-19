import { useQuery } from '@tanstack/react-query'
import { transactionsApi } from '@/api/endpoints'
import type { MonthlySummary } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoneyWithCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'
import { CategoryBarChart } from '@/components/charts/CategoryBarChart'
import { CategoryPieChart } from '@/components/charts/CategoryPieChart'

/**
 * Income vs expense for the month, always in KZT — the backend converts each
 * transaction at its own stored rate, so these totals are never a mix of
 * currencies. TRANSFER and ADJUSTMENT are excluded server-side: moving money
 * between your own accounts isn't spending, and neither is a correction.
 */
export function SummaryPanel({ month }: { month: string }) {
  const query = useQuery({
    queryKey: ['summary', month],
    queryFn: () => transactionsApi.summary(month),
  })

  return (
    <QueryState query={query}>
      {(summary: MonthlySummary) => (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <Tile label={strings.dashboard.income} value={summary.totalIncome} />
            <Tile label={strings.dashboard.expense} value={summary.totalExpense} />
            <Tile label={strings.dashboard.net} value={summary.net} signed />
          </div>
          {/* Each side gets both views: the bar ranks the categories, the pie
              shows what share of the month each one took. Income is charted
              the same way so the two read as one screen — it is usually two
              or three rows, and both charts return null when empty. */}
          <div className="grid gap-4 lg:grid-cols-2">
            <CategoryBarChart
              rows={summary.expenseByCategory}
              title={strings.dashboard.spendingByCategory}
            />
            <CategoryPieChart
              rows={summary.expenseByCategory}
              title={strings.dashboard.expensesShare}
            />
            <CategoryBarChart
              rows={summary.incomeByCategory}
              title={strings.dashboard.incomeByCategory}
            />
            <CategoryPieChart
              rows={summary.incomeByCategory}
              title={strings.dashboard.incomeShare}
            />
          </div>
        </div>
      )}
    </QueryState>
  )
}

function Tile({
  label,
  value,
  signed = false,
}: {
  label: string
  value: number
  /** Net can legitimately be negative; income and expense are magnitudes. */
  signed?: boolean
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-normal text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            'text-2xl font-semibold tabular-nums',
            signed && value < 0 && 'text-destructive',
          )}
        >
          {formatMoneyWithCurrency(value, 'KZT')}
        </p>
      </CardContent>
    </Card>
  )
}

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { CategorySummary } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatMoney, formatMoneyWithCurrency } from '@/lib/format'
import { strings } from '@/strings'

/**
 * Spending by category, as a sorted horizontal bar in a single hue.
 *
 * The reader's job here is comparing magnitudes, which is what a bar does and
 * a donut doesn't — arc lengths are hard to rank, and category names are long
 * enough in Russian that a pie legend would carry all the meaning anyway. One
 * series means one hue and no legend: the title names it.
 */
const chartConfig = {
  total: { label: strings.dashboard.spent, color: 'var(--chart-1)' },
} satisfies ChartConfig

export function SpendingByCategoryChart({ rows }: { rows: CategorySummary[] }) {
  if (rows.length === 0) return null

  const data = [...rows]
    .sort((a, b) => b.total - a.total)
    .map((row) => ({
      // A null category is a real, expected row — an uncategorised expense.
      name: row.categoryName ?? strings.common.uncategorized,
      total: row.total,
    }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{strings.dashboard.spendingByCategory}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[320px] w-full">
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ right: 56 }}>
            {/* Recessive grid: one axis of reference lines, not a cage. */}
            <CartesianGrid horizontal={false} />
            <XAxis type="number" dataKey="total" hide />
            <YAxis
              type="category"
              dataKey="name"
              width={140}
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              className="text-xs"
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  hideLabel={false}
                  formatter={(value) => formatMoneyWithCurrency(Number(value), 'KZT')}
                />
              }
            />
            <Bar
              dataKey="total"
              fill="var(--color-total)"
              radius={[0, 4, 4, 0]}
              label={{
                position: 'right',
                className: 'fill-muted-foreground text-xs tabular-nums',
                formatter: (value: unknown) => formatMoney(Number(value)),
              }}
            />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

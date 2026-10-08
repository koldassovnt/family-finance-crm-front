import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { CategorySummary } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatMoney, formatMoneyWithCurrency, sumMoney } from '@/lib/format'
import { strings } from '@/strings'

/**
 * Category totals as a sorted horizontal bar in a single hue.
 *
 * This is the ranking view: comparing magnitudes is what a bar does well and
 * a pie does badly, since arc lengths are hard to order by eye. One series
 * means one hue and no legend — the title names it. The pie beside it answers
 * the other question, what share of the whole each category takes.
 */
/**
 * The chart has a fixed height, so every extra category thins all the bars
 * and crowds their labels. Past ten the tail folds into one «Прочее» bar, as
 * the pie beside it does — there the limit is how many hues stay tellable
 * apart, here it is how many rows stay readable.
 */
const MAX_BARS = 10

const chartConfig = {
  total: { label: strings.dashboard.spent, color: 'var(--chart-1)' },
} satisfies ChartConfig

export function CategoryBarChart({
  rows,
  title,
}: {
  rows: CategorySummary[]
  title: string
}) {
  if (rows.length === 0) return null

  const sorted = [...rows].sort((a, b) => b.total - a.total)
  const tail = sorted.slice(MAX_BARS)

  const data = [
    ...sorted.slice(0, MAX_BARS).map((row) => ({
      // A null category is a real, expected row — an uncategorised expense.
      name: row.categoryName ?? strings.common.uncategorized,
      total: row.total,
    })),
    // Last, even when it outweighs the bars above it: it is a remainder, not
    // a category, and ranking it among them would suggest otherwise.
    ...(tail.length > 0
      ? [
          {
            name: strings.dashboard.otherCategories,
            total: sumMoney(tail.map((row) => row.total)),
          },
        ]
      : []),
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
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

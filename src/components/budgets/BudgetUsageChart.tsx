import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import type { Budget } from '@/api/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart'
import { formatMoney, formatMoneyWithCurrency } from '@/lib/format'
import { strings } from '@/strings'

/**
 * Spending against each limit, in absolute KZT.
 *
 * The bars beside each budget already show the percentage, so repeating it
 * here would say nothing new — what a percentage hides is scale, and 90% of
 * 500 000 ₸ is a different problem from 90% of 10 000 ₸.
 *
 * This is emphasis rather than two peer series: spent carries the hue, the
 * limit is context in muted grey. That keeps it to one validated colour, and
 * the grey reads as a reference rather than a competing category.
 */
const chartConfig = {
  spent: { label: strings.budgets.spent, color: 'var(--chart-1)' },
  limit: { label: strings.budgets.limit, color: 'var(--muted-foreground)' },
} satisfies ChartConfig

export function BudgetUsageChart({ budgets }: { budgets: Budget[] }) {
  if (budgets.length === 0) return null

  const data = budgets.map((budget) => ({
    name: budget.category.name,
    spent: budget.spent,
    limit: budget.limitAmount,
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{strings.budgets.usageVsLimit}</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={chartConfig}
          className="w-full"
          style={{ height: `${Math.max(180, budgets.length * 72)}px` }}
        >
          <BarChart accessibilityLayer data={data} layout="vertical" margin={{ right: 56 }}>
            <CartesianGrid horizontal={false} />
            <XAxis type="number" hide />
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
                  formatter={(value, name) => (
                    <span className="flex w-full justify-between gap-3">
                      <span className="text-muted-foreground">
                        {name === 'spent' ? strings.budgets.spent : strings.budgets.limit}
                      </span>
                      <span className="tabular-nums">
                        {formatMoneyWithCurrency(Number(value), 'KZT')}
                      </span>
                    </span>
                  )}
                />
              }
            />
            {/* A legend is present because there are two series; the spent bar
                is also directly labelled, so identity never rests on colour. */}
            <ChartLegend content={<ChartLegendContent />} />
            <Bar
              dataKey="spent"
              fill="var(--color-spent)"
              radius={[0, 4, 4, 0]}
              label={{
                position: 'right',
                className: 'fill-muted-foreground text-xs tabular-nums',
                formatter: (value: unknown) => formatMoney(Number(value)),
              }}
            />
            <Bar dataKey="limit" fill="var(--color-limit)" fillOpacity={0.25} radius={[0, 4, 4, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}

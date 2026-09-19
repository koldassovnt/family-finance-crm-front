import { Cell, Pie, PieChart } from 'recharts'
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

/** Six validated categorical hues, assigned in fixed order — never cycled. */
const SLICE_COLORS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--chart-6)',
]

/**
 * Past six slices the hues stop being tellable apart, so the tail folds into
 * one grey «Прочее» rather than generating a seventh colour.
 */
const MAX_SLICES = SLICE_COLORS.length
const OTHER_COLOR = 'var(--muted-foreground)'

/**
 * Share of the month by category.
 *
 * The bar beside it answers "which is biggest"; this answers "how much of the
 * whole" — the one question a pie is genuinely better at. Slices are ordered
 * largest first, which also puts the palette in its fixed order around the
 * ring, so neighbouring slices are the pairs the palette was validated on.
 *
 * Three of the six hues sit below 3:1 against the light surface, so the
 * relief rule applies: every slice carries a visible label, and colour never
 * carries identity by itself.
 */
export function CategoryPieChart({ rows, title }: { rows: CategorySummary[]; title: string }) {
  if (rows.length === 0) return null

  const sorted = [...rows].sort((a, b) => b.total - a.total)
  const head = sorted.slice(0, MAX_SLICES)
  const tail = sorted.slice(MAX_SLICES)

  const data = [
    ...head.map((row, index) => ({
      name: row.categoryName ?? strings.common.uncategorized,
      total: row.total,
      color: SLICE_COLORS[index],
    })),
    ...(tail.length > 0
      ? [
          {
            name: strings.dashboard.otherCategories,
            total: tail.reduce((sum, row) => sum + row.total, 0),
            color: OTHER_COLOR,
          },
        ]
      : []),
  ]

  const total = data.reduce((sum, slice) => sum + slice.total, 0)

  const chartConfig = Object.fromEntries(
    data.map((slice) => [slice.name, { label: slice.name, color: slice.color }]),
  ) satisfies ChartConfig

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Taller than the bar beside it: six outside labels need the room,
            and the relief rule means they cannot be dropped. */}
        <ChartContainer config={chartConfig} className="h-[360px] w-full">
          <PieChart>
            <ChartTooltip
              content={
                <ChartTooltipContent
                  hideLabel
                  formatter={(value, name) => (
                    <span className="flex w-full justify-between gap-3">
                      <span className="text-muted-foreground">{name}</span>
                      <span className="tabular-nums">
                        {formatMoneyWithCurrency(Number(value), 'KZT')}
                      </span>
                    </span>
                  )}
                />
              }
            />
            <Pie
              data={data}
              dataKey="total"
              nameKey="name"
              innerRadius="40%"
              outerRadius="62%"
              // A 2px surface gap between slices, as between stacked segments.
              paddingAngle={2}
              stroke="var(--card)"
              strokeWidth={2}
              isAnimationActive={false}
              label={({ name, value }: { name?: string; value?: number }) =>
                `${name} · ${Math.round(((value ?? 0) / total) * 100)}%`
              }
              labelLine={{ stroke: 'var(--border)' }}
              className="text-xs [&_text]:fill-muted-foreground"
            >
              {data.map((slice) => (
                <Cell key={slice.name} fill={slice.color} />
              ))}
            </Pie>
          </PieChart>
        </ChartContainer>
        <p className="pt-2 text-center text-sm text-muted-foreground tabular-nums">
          {strings.dashboard.total}: {formatMoney(total)} ₸
        </p>
      </CardContent>
    </Card>
  )
}

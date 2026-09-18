import type { Goal } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatMoneyWithCurrency, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

/**
 * Progress is derived on read from the linked account's balance against the
 * target — there is no stored figure and no contribution ledger. That is also
 * why `targetAmount` is denominated in the linked account's currency: they are
 * compared directly, with no conversion anywhere.
 */
export function GoalCard({
  goal,
  onContribute,
  onEdit,
  onDelete,
}: {
  goal: Goal
  onContribute: () => void
  onEdit: () => void
  onDelete: () => void
}) {
  const currency = goal.linkedAccount.currency

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate font-medium">{goal.name}</p>
            <p className="text-xs text-muted-foreground">
              {strings.goals.types[goal.type]} · {goal.linkedAccount.name}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {/* `achieved` is derived, not a status — an achieved goal still
                sits in whatever status the user left it in. */}
            {goal.achieved && <Badge>{strings.goals.achieved}</Badge>}
            {goal.status !== 'ACTIVE' && (
              <Badge variant="secondary">{strings.goals.statuses[goal.status]}</Badge>
            )}
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="flex items-baseline justify-between gap-2 text-sm">
            <span className="tabular-nums text-muted-foreground">
              {formatMoneyWithCurrency(goal.linkedAccount.balance, currency)}
            </span>
            <span className="tabular-nums text-muted-foreground">
              {formatMoneyWithCurrency(goal.targetAmount, currency)}
            </span>
          </div>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={Math.round(goal.progressPercent)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={goal.name}
          >
            {/* progressPercent is clamped 0–100 server-side, unlike a budget's
                percentUsed — no client clamp needed. */}
            <div
              className={cn(
                'h-full rounded-full transition-all',
                goal.achieved ? 'bg-emerald-600 dark:bg-emerald-500' : 'bg-[var(--chart-1)]',
              )}
              style={{ width: `${goal.progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span className="tabular-nums">{formatPercent(goal.progressPercent)}</span>
            <span>
              {goal.targetDate === null
                ? strings.goals.noTargetDate
                : formatDate(goal.targetDate)}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1">
          {/* Contributing to an abandoned or archived goal makes no sense, and
              its account may well be closed. */}
          {goal.status === 'ACTIVE' && (
            <Button size="sm" variant="outline" onClick={onContribute}>
              {strings.goals.contribute}
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={onEdit}>
            {strings.common.edit}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDelete}>
            {strings.common.delete}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

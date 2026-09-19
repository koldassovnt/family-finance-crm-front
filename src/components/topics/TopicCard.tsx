import { Link } from 'react-router-dom'
import type { Topic } from '@/api/types'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { formatDate, formatMoneyWithCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

/**
 * Every figure here is KZT: the backend converts each transaction at its own
 * stored rate, so a trip paid partly abroad still totals in one currency.
 *
 * `received` is shown beside `spent` rather than only the gross, because a
 * refunded booking makes a trip look more expensive than it was — net is the
 * honest number.
 */
export function TopicCard({ topic }: { topic: Topic }) {
  const hasPlan = topic.plannedAmount !== null && topic.remaining !== null
  const overspent = topic.remaining !== null && topic.remaining < 0

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              to={`/topics/${topic.id}`}
              className="truncate font-medium underline-offset-4 hover:underline"
            >
              {topic.name}
            </Link>
            {topic.description !== null && (
              <p className="truncate text-xs text-muted-foreground">{topic.description}</p>
            )}
          </div>
          {topic.status === 'CLOSED' && (
            <Badge variant="secondary">{strings.topics.statuses.CLOSED}</Badge>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
          <dt className="text-muted-foreground">{strings.topics.spent}</dt>
          <dd className="text-right tabular-nums">
            {formatMoneyWithCurrency(topic.spent, 'KZT')}
          </dd>

          {topic.received > 0 && (
            <>
              <dt className="text-muted-foreground">{strings.topics.received}</dt>
              <dd className="text-right tabular-nums text-emerald-600 dark:text-emerald-400">
                −{formatMoneyWithCurrency(topic.received, 'KZT')}
              </dd>
              <dt className="text-muted-foreground">{strings.topics.net}</dt>
              <dd className="text-right font-medium tabular-nums">
                {formatMoneyWithCurrency(topic.net, 'KZT')}
              </dd>
            </>
          )}

          {hasPlan && (
            <>
              <dt className="text-muted-foreground">{strings.topics.planned}</dt>
              <dd className="text-right tabular-nums text-muted-foreground">
                {formatMoneyWithCurrency(topic.plannedAmount ?? 0, 'KZT')}
              </dd>
              <dt className="text-muted-foreground">{strings.topics.remaining}</dt>
              <dd className={cn('text-right tabular-nums', overspent && 'text-destructive')}>
                {formatMoneyWithCurrency(topic.remaining ?? 0, 'KZT')}
              </dd>
            </>
          )}
        </dl>

        <p className="text-xs text-muted-foreground">
          {/* The real span, not the declared window — a flight booked early
              legitimately falls outside startDate. */}
          {topic.firstTransactionOn === null
            ? strings.topics.noTransactions
            : `${formatDate(topic.firstTransactionOn)} — ${formatDate(topic.lastTransactionOn ?? topic.firstTransactionOn)} · ${strings.topics.transactionCount}: ${topic.transactionCount}`}
        </p>
      </CardContent>
    </Card>
  )
}

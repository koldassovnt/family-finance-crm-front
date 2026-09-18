import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { billsApi } from '@/api/endpoints'
import type { Bill } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDate, formatMoneyWithCurrency, todayInAlmaty } from '@/lib/format'
import { strings } from '@/strings'

/** Anything due within this window counts as "soon" on the dashboard. */
const DUE_SOON_DAYS = 14

/**
 * Attention panel for bills.
 *
 * It asks for `?unpaid=true` rather than the current month on purpose: a month
 * query returns only bills *due* that month, so an unpaid August bill vanishes
 * the moment you look at September. Unpaid returns everything still owed
 * regardless of when it fell due.
 *
 * But "unpaid" is not "late" — it includes bills due months from now — so the
 * filtering to overdue-or-due-soon happens here. `overdue` itself comes from
 * the server, computed in Almaty time; recomputing it from the browser clock
 * would disagree for most of the day in another timezone.
 */
export function BillsPanel() {
  const query = useQuery({
    queryKey: ['bills', { unpaid: true }],
    queryFn: () => billsApi.list({ unpaid: true }),
    select: (bills: Bill[]) => {
      const cutoff = addDays(todayInAlmaty(), DUE_SOON_DAYS)
      return bills
        .filter((bill) => bill.overdue || bill.dueDate <= cutoff)
        .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Link to="/bills" className="underline-offset-4 hover:underline">
            {strings.dashboard.billsDue}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState query={query} empty={strings.dashboard.nothingDue}>
          {(bills: Bill[]) => (
            <ul className="divide-y">
              {bills.map((bill) => (
                <li key={bill.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm">{bill.name}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {formatDate(bill.dueDate)}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {/* Status is never colour alone — the badge carries a word. */}
                    {bill.overdue && <Badge variant="destructive">{strings.bills.overdue}</Badge>}
                    <span className="text-sm tabular-nums">
                      {formatMoneyWithCurrency(bill.amount, bill.currency)}
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

/** Date arithmetic on the ISO string, so it stays anchored to Almaty. */
function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  const shifted = new Date(Date.UTC(year, month - 1, day + days))
  return shifted.toISOString().slice(0, 10)
}

import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { accountsApi } from '@/api/endpoints'
import type { Account } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatMoneyWithCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

/**
 * Balances in each account's own currency, with no combined total — a
 * cross-currency sum would need a current rate, which the backend
 * deliberately doesn't store.
 */
export function AccountsPanel() {
  const query = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Link to="/accounts" className="underline-offset-4 hover:underline">
            {strings.dashboard.accounts}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <QueryState query={query}>
          {(accounts: Account[]) => (
            <ul className="divide-y">
              {accounts.map((account) => (
                <li key={account.id} className="flex items-center justify-between gap-4 py-2">
                  <Link
                    to={`/accounts/${account.id}`}
                    className="truncate text-sm underline-offset-4 hover:underline"
                  >
                    {account.name}
                  </Link>
                  {/* Negative is legal — flagged, never blocked. */}
                  <span
                    className={cn(
                      'shrink-0 text-sm tabular-nums',
                      account.balance < 0 && 'text-destructive',
                    )}
                  >
                    {formatMoneyWithCurrency(account.balance, account.currency)}
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

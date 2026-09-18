import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { accountsApi } from '@/api/endpoints'
import type { Account } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMoneyWithCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

export function AccountsPage() {
  const query = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{strings.accounts.title}</h1>

      {/* Balances are per-currency and never summed — no conversion exists. */}
      <QueryState query={query}>
        {(accounts: Account[]) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{strings.accounts.title}</TableHead>
                <TableHead>{strings.accounts.type}</TableHead>
                <TableHead>{strings.accounts.bank}</TableHead>
                <TableHead className="text-right">{strings.accounts.balance}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {accounts.map((account) => (
                <TableRow key={account.id}>
                  <TableCell>
                    <Link to={`/accounts/${account.id}`} className="underline-offset-4 hover:underline">
                      {account.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {strings.accounts.types[account.type]}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {account.bank?.name ?? strings.accounts.noBank}
                  </TableCell>
                  {/* Negative balances are legal — flagged, never blocked. */}
                  <TableCell
                    className={cn(
                      'text-right tabular-nums',
                      account.balance < 0 && 'text-destructive',
                    )}
                  >
                    {formatMoneyWithCurrency(account.balance, account.currency)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </QueryState>
    </section>
  )
}

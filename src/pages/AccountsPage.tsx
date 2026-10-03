import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { accountsApi } from '@/api/endpoints'
import type { Account } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { AccountForm } from '@/components/accounts/AccountForm'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatMoneyWithCurrency, sumMoney } from '@/lib/format'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

export function AccountsPage() {
  const query = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
  const [editing, setEditing] = useState<Account | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{strings.accounts.title}</h1>
        <Button
          onClick={() => {
            setEditing(null)
            setIsFormOpen(true)
          }}
        >
          {strings.accounts.add}
        </Button>
      </div>

      {/* Keyed so the inputs reset between creating and editing a row. */}
      {isFormOpen && (
        <AccountForm
          key={editing?.id ?? 'new'}
          account={editing}
          open
          onOpenChange={(next) => !next && setIsFormOpen(false)}
        />
      )}

      <QueryState query={query}>
        {(accounts: Account[]) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{strings.accounts.title}</TableHead>
                <TableHead>{strings.accounts.type}</TableHead>
                <TableHead>{strings.accounts.bank}</TableHead>
                <TableHead className="text-right">{strings.accounts.balance}</TableHead>
                <TableHead className="w-20" />
              </TableRow>
            </TableHeader>
            {groupByCurrency(accounts).map((group) => (
              <TableBody key={group.currency}>
                <TableRow className="bg-muted/50 font-medium hover:bg-muted/50">
                  <TableCell colSpan={3}>{strings.accounts.currencyTotal(group.currency)}</TableCell>
                  <TableCell
                    className={cn('text-right tabular-nums', group.total < 0 && 'text-destructive')}
                  >
                    {formatMoneyWithCurrency(group.total, group.currency)}
                  </TableCell>
                  <TableCell />
                </TableRow>
                {group.accounts.map((account) => (
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
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditing(account)
                          setIsFormOpen(true)
                        }}
                      >
                        {strings.common.edit}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            ))}
          </Table>
        )}
      </QueryState>
    </section>
  )
}

interface CurrencyGroup {
  currency: string
  accounts: Account[]
  total: number
}

/**
 * One group per currency, each with its own total. Nothing converts between
 * currencies, so no figure spans groups: a grand total would need a rate the
 * system doesn't have. KZT leads as the base currency, the rest follow by
 * code, and accounts keep the server's order within a group.
 */
function groupByCurrency(accounts: Account[]): CurrencyGroup[] {
  const byCurrency = new Map<string, Account[]>()
  for (const account of accounts) {
    byCurrency.set(account.currency, [...(byCurrency.get(account.currency) ?? []), account])
  }
  return [...byCurrency]
    .sort(([a], [b]) => (a === 'KZT' ? -1 : b === 'KZT' ? 1 : a.localeCompare(b)))
    .map(([currency, group]) => ({
      currency,
      accounts: group,
      total: sumMoney(group.map((account) => account.balance)),
    }))
}

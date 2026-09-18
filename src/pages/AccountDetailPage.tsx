import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { accountsApi } from '@/api/endpoints'
import type { Transaction } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { ReconcileDialog } from '@/components/accounts/ReconcileDialog'
import { TransactionAmount } from '@/components/transactions/TransactionAmount'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { accountNameLookup } from '@/lib/accounts'
import { currentMonthInAlmaty, formatDate, formatMoneyWithCurrency, todayInAlmaty } from '@/lib/format'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

export function AccountDetailPage() {
  const { id = '' } = useParams()
  const [from, setFrom] = useState(() => `${currentMonthInAlmaty()}-01`)
  const [to, setTo] = useState(todayInAlmaty)
  const [isReconcileOpen, setIsReconcileOpen] = useState(false)

  const account = useQuery({
    queryKey: ['accounts', id],
    queryFn: () => accountsApi.get(id),
  })

  // Needed to name the other side of a transfer, which arrives as an id.
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
  const lookup = accountNameLookup(accounts.data)

  const history = useQuery({
    queryKey: ['account-transactions', id, { from, to }],
    queryFn: () => accountsApi.transactions(id, from, to),
  })

  return (
    <section className="space-y-4">
      <QueryState query={account}>
        {(data) => (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold">{data.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {strings.accounts.types[data.type]} · {data.bank?.name ?? strings.accounts.noBank}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <span
                  className={cn(
                    'text-xl font-semibold tabular-nums',
                    data.balance < 0 && 'text-destructive',
                  )}
                >
                  {formatMoneyWithCurrency(data.balance, data.currency)}
                </span>
                <Button variant="outline" onClick={() => setIsReconcileOpen(true)}>
                  {strings.accounts.reconcile}
                </Button>
              </div>
            </div>

            {data.balance < 0 && (
              <Alert>
                <AlertDescription>{strings.accounts.negativeHint}</AlertDescription>
              </Alert>
            )}

            <ReconcileDialog
              account={data}
              open={isReconcileOpen}
              onOpenChange={setIsReconcileOpen}
            />
          </>
        )}
      </QueryState>

      <h2 className="pt-2 text-lg font-medium">{strings.accounts.history}</h2>

      {/* from/to are required by this endpoint — there is no unbounded history. */}
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="from">{strings.transactions.from}</Label>
          <Input
            id="from"
            type="date"
            value={from}
            max={todayInAlmaty()}
            onChange={(event) => setFrom(event.target.value)}
            className="w-40"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="to">{strings.transactions.to}</Label>
          <Input
            id="to"
            type="date"
            value={to}
            max={todayInAlmaty()}
            onChange={(event) => setTo(event.target.value)}
            className="w-40"
          />
        </div>
      </div>

      <QueryState query={history} empty={strings.transactions.noneInRange}>
        {(rows: Transaction[]) => (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-28">{strings.transactions.date}</TableHead>
                <TableHead>{strings.transactions.category}</TableHead>
                <TableHead>{strings.transactions.account}</TableHead>
                <TableHead className="text-right">{strings.transactions.amount}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="tabular-nums">
                    {formatDate(transaction.occurredOn)}
                  </TableCell>
                  <TableCell>
                    {transaction.category?.name ?? strings.transactions.types[transaction.type]}
                    {transaction.note !== null && (
                      <p className="truncate text-xs text-muted-foreground">{transaction.note}</p>
                    )}
                  </TableCell>
                  {/* A transfer appears in both accounts' histories, so show
                      both sides rather than assuming this account is the source. */}
                  <TableCell className="text-muted-foreground">
                    {lookup.name(transaction.accountId)}
                    {transaction.toAccountId !== null && (
                      <> → {lookup.name(transaction.toAccountId)}</>
                    )}
                  </TableCell>
                  <TableCell>
                    <TransactionAmount transaction={transaction} />
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

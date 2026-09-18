import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { accountsApi, categoriesApi, transactionsApi } from '@/api/endpoints'
import type { Transaction } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { TransactionAmount } from '@/components/transactions/TransactionAmount'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { accountNameLookup } from '@/lib/accounts'
import { currentMonthInAlmaty, formatDate, todayInAlmaty } from '@/lib/format'
import { strings } from '@/strings'

/** The API caps the window at a year; anything longer is a 400. */
function rangeError(from: string, to: string): string | null {
  if (from > to) return strings.transactions.rangeInverted
  const [year, month, day] = from.split('-').map(Number)
  const maximum = new Date(Date.UTC(year + 1, month - 1, day)).toISOString().slice(0, 10)
  return to > maximum ? strings.transactions.rangeTooLong : null
}

const ALL = 'all'

export function TransactionsPage() {
  const [from, setFrom] = useState(() => `${currentMonthInAlmaty()}-01`)
  const [to, setTo] = useState(todayInAlmaty)
  const [accountId, setAccountId] = useState<string>(ALL)
  const [categoryId, setCategoryId] = useState<string>(ALL)

  const invalidRange = rangeError(from, to)

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })

  const transactions = useQuery({
    queryKey: ['transactions', { from, to, accountId, categoryId }],
    queryFn: () =>
      transactionsApi.list({
        from,
        to,
        accountId: accountId === ALL ? undefined : accountId,
        categoryId: categoryId === ALL ? undefined : categoryId,
      }),
    // Don't spend a request on a range the API will reject.
    enabled: invalidRange === null,
  })

  const lookup = accountNameLookup(accounts.data)

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{strings.transactions.title}</h1>

      {/* The range is mandatory, not a convenience: an unbounded "all
          transactions" view is not something the API can serve. */}
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

        <div className="space-y-1">
          <Label htmlFor="account">{strings.transactions.account}</Label>
          <Select value={accountId} onValueChange={(value) => setAccountId(value ?? ALL)}>
            <SelectTrigger id="account" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{strings.transactions.allAccounts}</SelectItem>
              {(accounts.data ?? []).map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="category">{strings.transactions.category}</Label>
          <Select value={categoryId} onValueChange={(value) => setCategoryId(value ?? ALL)}>
            <SelectTrigger id="category" className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>{strings.transactions.allCategories}</SelectItem>
              {(categories.data ?? []).map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {invalidRange !== null ? (
        <Alert variant="destructive">
          <AlertDescription>{invalidRange}</AlertDescription>
        </Alert>
      ) : (
        <QueryState query={transactions} empty={strings.transactions.noneInRange}>
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
                      {/* The category is embedded and keeps its name after
                          deletion, so it is never resolved by id here. */}
                      <span>
                        {transaction.category?.name ??
                          strings.transactions.types[transaction.type]}
                      </span>
                      {transaction.note !== null && (
                        <p className="truncate text-xs text-muted-foreground">
                          {transaction.note}
                        </p>
                      )}
                    </TableCell>
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
      )}
    </section>
  )
}

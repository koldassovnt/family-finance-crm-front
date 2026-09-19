import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { accountsApi, categoriesApi, topicsApi, transactionsApi } from '@/api/endpoints'
import type { Transaction } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { TransactionAmount } from '@/components/transactions/TransactionAmount'
import { DeleteTransactionDialog } from '@/components/transactions/DeleteTransactionDialog'
import { EditTransactionDialog } from '@/components/transactions/EditTransactionDialog'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldSelect } from '@/components/FieldSelect'
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
  const [topicId, setTopicId] = useState<string>(ALL)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [deleting, setDeleting] = useState<Transaction | null>(null)

  const invalidRange = rangeError(from, to)

  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
  const categories = useQuery({ queryKey: ['categories'], queryFn: categoriesApi.list })
  // ACTIVE only for the entry form's picker; the filter below wants every
  // topic, since you still look back at a finished trip.
  const activeTopics = useQuery({
    queryKey: ['topics', { showAll: false }],
    queryFn: () => topicsApi.list('ACTIVE'),
  })
  const allTopics = useQuery({
    queryKey: ['topics', { showAll: true }],
    queryFn: () => topicsApi.list(),
  })

  const transactions = useQuery({
    queryKey: ['transactions', { from, to, accountId, categoryId, topicId }],
    queryFn: () =>
      transactionsApi.list({
        from,
        to,
        accountId: accountId === ALL ? undefined : accountId,
        categoryId: categoryId === ALL ? undefined : categoryId,
        topicId: topicId === ALL ? undefined : topicId,
      }),
    // Don't spend a request on a range the API will reject.
    enabled: invalidRange === null,
  })

  const lookup = accountNameLookup(accounts.data)

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{strings.transactions.title}</h1>
        <Button onClick={() => setIsFormOpen(true)}>{strings.transactions.add}</Button>
      </div>

      <TransactionForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        accounts={accounts.data ?? []}
        categories={categories.data ?? []}
        topics={activeTopics.data ?? []}
      />

      {/* Keyed so the dialog's inputs reset when a different row is opened. */}
      {editing !== null && (
        <EditTransactionDialog
          key={editing.id}
          transaction={editing}
          categories={categories.data ?? []}
          open
          onOpenChange={(next) => !next && setEditing(null)}
        />
      )}

      <DeleteTransactionDialog
        transaction={deleting}
        open={deleting !== null}
        onOpenChange={(next) => !next && setDeleting(null)}
      />

      {/* The range is mandatory, not a convenience: an unbounded "all
          transactions" view is not something the API can serve. */}
      {/* A grid, not flex-wrap with fixed widths: five fixed controls total
          more than 900px, so the last one dropped to a second line on any
          window narrower than a maximised laptop. The grid shares the width
          instead and wraps in whole rows. */}
      <div className="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <div className="space-y-1">
          <Label htmlFor="from">{strings.transactions.from}</Label>
          <Input
            id="from"
            type="date"
            value={from}
            max={todayInAlmaty()}
            onChange={(event) => setFrom(event.target.value)}
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
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="account">{strings.transactions.account}</Label>
          <FieldSelect
            id="account"
            value={accountId}
            onChange={setAccountId}
            options={[
              { value: ALL, label: strings.transactions.allAccounts },
              ...(accounts.data ?? []).map((account) => ({
                value: account.id,
                label: account.name,
              })),
            ]}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="category">{strings.transactions.category}</Label>
          <FieldSelect
            id="category"
            value={categoryId}
            onChange={setCategoryId}
            options={[
              { value: ALL, label: strings.transactions.allCategories },
              ...(categories.data ?? []).map((category) => ({
                value: category.id,
                label: category.name,
              })),
            ]}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="topic">{strings.topics.topicField}</Label>
          <FieldSelect
            id="topic"
            value={topicId}
            onChange={setTopicId}
            options={[
              { value: ALL, label: strings.topics.allTopics },
              ...(allTopics.data ?? []).map((topic) => ({
                value: topic.id,
                label: topic.name,
              })),
            ]}
          />
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
                  <TableHead className="w-24" />
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
                      {/* Embedded like the category, and like it keeps
                          resolving after the topic is soft-deleted. */}
                      {transaction.topic !== null && (
                        <p className="truncate text-xs text-muted-foreground">
                          {transaction.topic.name}
                        </p>
                      )}
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
                    <TableCell className="text-right whitespace-nowrap">
                      {/* ADJUSTMENT rows come from reconcile and are corrected
                          by reconciling again, not edited by hand. */}
                      {transaction.type !== 'ADJUSTMENT' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={strings.common.edit}
                          onClick={() => setEditing(transaction)}
                        >
                          {strings.common.edit}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        aria-label={strings.common.delete}
                        onClick={() => setDeleting(transaction)}
                      >
                        {strings.common.delete}
                      </Button>
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

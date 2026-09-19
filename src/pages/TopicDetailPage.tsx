import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { accountsApi, topicsApi } from '@/api/endpoints'
import type { TopicDetail, Transaction } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { CategoryBarChart } from '@/components/charts/CategoryBarChart'
import { AttachCandidatesDialog } from '@/components/topics/AttachCandidatesDialog'
import { TopicForm } from '@/components/topics/TopicForm'
import { TransactionAmount } from '@/components/transactions/TransactionAmount'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { accountNameLookup } from '@/lib/accounts'
import { formatDate, formatMoneyWithCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

export function TopicDetailPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isAttachOpen, setIsAttachOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const detail = useQuery({ queryKey: ['topic', id], queryFn: () => topicsApi.get(id) })
  // Membership is the bound, so this needs no date range.
  const transactions = useQuery({
    queryKey: ['topic', id, 'transactions'],
    queryFn: () => topicsApi.transactions(id),
  })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
  const lookup = accountNameLookup(accounts.data)

  function invalidate() {
    for (const key of ['topics', 'topic', 'topic-candidates', 'transactions']) {
      void queryClient.invalidateQueries({ queryKey: [key] })
    }
  }

  const detach = useMutation({
    mutationFn: (transactionId: string) => topicsApi.detach(id, transactionId),
    onSuccess: () => {
      invalidate()
      toast.success(strings.topics.detached)
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  const remove = useMutation({
    mutationFn: () => topicsApi.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success(strings.topics.deleted)
      void navigate('/topics', { replace: true })
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  return (
    <section className="space-y-4">
      <QueryState query={detail}>
        {({ topic, expenseByCategory, incomeByCategory }: TopicDetail) => (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl font-semibold">{topic.name}</h1>
                  {topic.status === 'CLOSED' && (
                    <Badge variant="secondary">{strings.topics.statuses.CLOSED}</Badge>
                  )}
                </div>
                {topic.description !== null && (
                  <p className="text-sm text-muted-foreground">{topic.description}</p>
                )}
                <p className="pt-1 text-xs text-muted-foreground">
                  {/* Declared window and real span are different things, and
                      the real one is usually more informative. */}
                  {topic.startDate === null || topic.endDate === null
                    ? strings.topics.noDates
                    : `${strings.topics.declaredSpan}: ${formatDate(topic.startDate)} — ${formatDate(topic.endDate)}`}
                  {topic.firstTransactionOn !== null && (
                    <>
                      {' · '}
                      {strings.topics.actualSpan}: {formatDate(topic.firstTransactionOn)} —{' '}
                      {formatDate(topic.lastTransactionOn ?? topic.firstTransactionOn)}
                    </>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsAttachOpen(true)}
                  // A CLOSED topic still accepts attachments — a late invoice
                  // is normal. Closing affects the picker, not the API.
                >
                  {strings.topics.attach}
                </Button>
                <Button variant="ghost" onClick={() => setIsFormOpen(true)}>
                  {strings.common.edit}
                </Button>
                <Button variant="ghost" onClick={() => setIsDeleteOpen(true)}>
                  {strings.common.delete}
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Figure label={strings.topics.spent} value={topic.spent} />
              <Figure label={strings.topics.received} value={topic.received} />
              <Figure label={strings.topics.net} value={topic.net} emphasis />
              {topic.remaining !== null && (
                <Figure
                  label={strings.topics.remaining}
                  value={topic.remaining}
                  negative={topic.remaining < 0}
                />
              )}
            </div>

            {isFormOpen && (
              <TopicForm key={topic.id} topic={topic} open onOpenChange={setIsFormOpen} />
            )}
            <AttachCandidatesDialog
              topicId={topic.id}
              hasDates={topic.startDate !== null && topic.endDate !== null}
              open={isAttachOpen}
              onOpenChange={setIsAttachOpen}
            />

            {/* The same chart the dashboard uses — the breakdown comes back in
                the monthly summary's CategorySummary shape precisely so this
                doesn't need a second one. */}
            <CategoryBarChart
              rows={expenseByCategory}
              title={strings.dashboard.spendingByCategory}
            />

            {/* Income is usually one or two rows — a refund, a repayment — so
                it gets a list rather than a second chart competing with the
                expense one. Dropping it would hide why net is below spent. */}
            {incomeByCategory.length > 0 && (
              <Card>
                <CardContent className="py-4">
                  <p className="pb-2 text-sm font-medium">{strings.topics.received}</p>
                  <ul className="divide-y">
                    {incomeByCategory.map((row) => (
                      <li
                        key={row.categoryId ?? 'uncategorized'}
                        className="flex justify-between gap-4 py-1.5 text-sm"
                      >
                        <span className="truncate">
                          {row.categoryName ?? strings.common.uncategorized}
                        </span>
                        <span className="shrink-0 tabular-nums text-emerald-600 dark:text-emerald-400">
                          {formatMoneyWithCurrency(row.total, 'KZT')}
                        </span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </QueryState>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{strings.topics.deleteTitle}</AlertDialogTitle>
            <AlertDialogDescription>{strings.topics.deleteHint}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{strings.common.cancel}</AlertDialogCancel>
            <AlertDialogAction disabled={remove.isPending} onClick={() => remove.mutate()}>
              {strings.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <QueryState query={transactions} empty={strings.topics.noTransactions}>
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
                    {transaction.category?.name ?? strings.transactions.types[transaction.type]}
                    {transaction.note !== null && (
                      <p className="truncate text-xs text-muted-foreground">{transaction.note}</p>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {lookup.name(transaction.accountId)}
                  </TableCell>
                  <TableCell>
                    <TransactionAmount transaction={transaction} />
                  </TableCell>
                  <TableCell className="text-right">
                    {/* Detaching leaves the transaction untouched in the
                        ledger — only the link goes. */}
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={detach.isPending}
                      onClick={() => detach.mutate(transaction.id)}
                    >
                      {strings.topics.detach}
                    </Button>
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

function Figure({
  label,
  value,
  emphasis = false,
  negative = false,
}: {
  label: string
  value: number
  emphasis?: boolean
  negative?: boolean
}) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p
          className={cn(
            'text-xl tabular-nums',
            emphasis && 'font-semibold',
            negative && 'text-destructive',
          )}
        >
          {formatMoneyWithCurrency(value, 'KZT')}
        </p>
      </CardContent>
    </Card>
  )
}

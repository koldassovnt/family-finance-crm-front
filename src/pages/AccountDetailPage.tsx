import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { accountsApi } from '@/api/endpoints'
import type { Holding, Transaction } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { ReconcileDialog } from '@/components/accounts/ReconcileDialog'
import { HoldingsTable } from '@/components/investments/HoldingsTable'
import { RenameTickerDialog } from '@/components/investments/RenameTickerDialog'
import { ShareButton } from '@/components/sharing/ShareButton'
import { ViewerNotice } from '@/components/sharing/ViewerNotice'
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
import { accountNameLookup, isInvestmentAccount } from '@/lib/accounts'
import { currentMonthInAlmaty, formatDate, formatMoneyWithCurrency, todayInAlmaty } from '@/lib/format'
import { tradeDetails, transactionTitle } from '@/lib/transactions'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

export function AccountDetailPage() {
  const { id = '' } = useParams()
  const [from, setFrom] = useState(() => `${currentMonthInAlmaty()}-01`)
  const [to, setTo] = useState(todayInAlmaty)
  const [isReconcileOpen, setIsReconcileOpen] = useState(false)
  const [renaming, setRenaming] = useState<Holding | null>(null)

  const account = useQuery({
    queryKey: ['accounts', id],
    queryFn: () => accountsApi.get(id),
  })

  const isViewer = account.data?.access === 'VIEWER'

  // Needed to name the other side of a transfer, which arrives as an id.
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })

  /*
   * A viewer's misses mean something different, and there are more of them.
   * `GET /accounts` is own-scoped, so for a viewer it does not even contain the
   * account being viewed — hence seeding it below. What remains unresolved is
   * the far side of a transfer into an account that was not shared: it exists
   * and is perfectly healthy, so «Удалённый счёт» would state something false.
   */
  const lookup = accountNameLookup(
    isViewer && account.data !== undefined ? [account.data] : accounts.data,
    isViewer ? strings.common.otherAccount : undefined,
  )

  const history = useQuery({
    queryKey: ['account-transactions', id, { from, to }],
    queryFn: () => accountsApi.transactions(id, from, to),
  })

  // Asked only of an account that can hold positions. Unlike `GET /investments`
  // this one answers a viewer too, so a shared broker account shows its assets.
  const holdsPositions = account.data !== undefined && isInvestmentAccount(account.data.type)
  const holdings = useQuery({
    queryKey: ['account-holdings', id],
    queryFn: () => accountsApi.holdings(id),
    enabled: holdsPositions,
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
                {/* Absent for a viewer, not disabled. The server rejects the
                    write regardless; the UI's job is to not offer it. */}
                {data.access === 'OWNER' && (
                  <>
                    <Button variant="outline" onClick={() => setIsReconcileOpen(true)}>
                      {strings.accounts.reconcile}
                    </Button>
                    <ShareButton
                      resourceType="ACCOUNT"
                      resourceId={data.id}
                      resourceName={data.name}
                    />
                  </>
                )}
              </div>
            </div>

            {data.access === 'VIEWER' && <ViewerNotice owner={data.owner} />}

            {/* A negative balance asks the owner to reconcile, which a viewer
                cannot do — so the prompt would be an instruction to nobody. */}
            {data.balance < 0 && data.access === 'OWNER' && (
              <Alert>
                <AlertDescription>{strings.accounts.negativeHint}</AlertDescription>
              </Alert>
            )}

            {data.access === 'OWNER' && (
              <ReconcileDialog
                account={data}
                open={isReconcileOpen}
                onOpenChange={setIsReconcileOpen}
              />
            )}
          </>
        )}
      </QueryState>

      {holdsPositions && (
        <>
          <div className="pt-2">
            <h2 className="text-lg font-medium">{strings.investments.holdings}</h2>
            <p className="text-xs text-muted-foreground">{strings.investments.priceHint}</p>
          </div>
          <QueryState query={holdings}>
            {(data) =>
              data.holdings.length === 0 ? (
                <p className="text-muted-foreground">{strings.investments.empty}</p>
              ) : (
                // Renaming is owner-only — a viewer gets 404 — so the action
                // is absent for one, like reconcile above.
                <HoldingsTable
                  data={data}
                  showAccount={false}
                  onRename={isViewer ? undefined : setRenaming}
                />
              )
            }
          </QueryState>
          {renaming !== null && (
            <RenameTickerDialog
              key={renaming.ticker}
              holding={renaming}
              open
              onOpenChange={(next) => !next && setRenaming(null)}
            />
          )}
        </>
      )}

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
                    {transactionTitle(transaction)}
                    {tradeDetails(transaction) !== null && (
                      <p className="truncate text-xs text-muted-foreground tabular-nums">
                        {tradeDetails(transaction)}
                      </p>
                    )}
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

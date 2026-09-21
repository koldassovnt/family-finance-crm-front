import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { sharedResourcesApi, sharesApi } from '@/api/endpoints'
import type { Account, Bill, Budget, Goal, Share, ShareResourceType, Topic } from '@/api/types'
import { MonthSelector } from '@/components/MonthSelector'
import { QueryState } from '@/components/QueryState'
import { BudgetBar } from '@/components/budgets/BudgetBar'
import { GoalCard } from '@/components/goals/GoalCard'
import { TopicCard } from '@/components/topics/TopicCard'
import { OutgoingShares } from '@/components/sharing/OutgoingShares'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { currentMonthInAlmaty, formatDate, formatMoneyWithCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

/**
 * Things other members have opened to you, and things you have opened to them.
 *
 * A separate screen rather than shared rows badged into the ordinary lists.
 * The backend's rule is that a shared resource contributes nothing to the
 * viewer's own figures, and a list where some rows feed the dashboard and some
 * silently do not is a trap: someone would total the column, disagree with
 * their own dashboard, and be right to. One screen where *nothing* counts is
 * honest; a mixed list where *some* rows do is not.
 */
export function SharedPage() {
  const incoming = useQuery({ queryKey: ['shares', 'incoming'], queryFn: sharesApi.incoming })

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{strings.sharing.title}</h1>

      <Tabs defaultValue="incoming">
        <TabsList>
          <TabsTrigger value="incoming">{strings.sharing.incoming}</TabsTrigger>
          <TabsTrigger value="outgoing">{strings.sharing.outgoing}</TabsTrigger>
        </TabsList>

        <TabsContent value="incoming" className="space-y-6 pt-4">
          <Alert>
            <AlertDescription>{strings.sharing.notInTotals}</AlertDescription>
          </Alert>

          {/* One call covers all five types — there is no reason to fan out
              five scope=SHARED requests to learn what exists. */}
          <QueryState query={incoming} empty={strings.sharing.nothingIncoming}>
            {(shares: Share[]) => <IncomingGroups shares={shares} />}
          </QueryState>
        </TabsContent>

        <TabsContent value="outgoing" className="pt-4">
          <OutgoingShares />
        </TabsContent>
      </Tabs>
    </section>
  )
}

/** Key order is display order. Accounts first: the widest thing most households share. */
const SECTIONS: Record<ShareResourceType, React.ComponentType> = {
  ACCOUNT: SharedAccounts,
  TOPIC: SharedTopics,
  GOAL: SharedGoals,
  BUDGET: SharedBudgets,
  BILL: SharedBills,
}

function IncomingGroups({ shares }: { shares: Share[] }) {
  const present = new Set(shares.map((share) => share.resourceType))

  return (
    <>
      {(Object.keys(SECTIONS) as ShareResourceType[])
        .filter((type) => present.has(type))
        .map((type) => {
          const Section = SECTIONS[type]
          return (
            <div key={type} className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                {strings.sharing.resourceGroups[type]}
              </h2>
              {/* The incoming list decides which groups appear; each renders the resource itself. */}
              <Section />
            </div>
          )
        })}
    </>
  )
}

function SharedAccounts() {
  const accounts = useQuery({ queryKey: ['accounts', 'shared'], queryFn: sharedResourcesApi.accounts })

  return (
    <QueryState query={accounts} empty={strings.sharing.nothingIncoming}>
      {(rows: Account[]) => (
        <ul className="divide-y rounded-md border">
          {rows.map((account) => (
            <li key={account.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <div className="min-w-0">
                <Link
                  to={`/accounts/${account.id}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {account.name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {strings.accounts.types[account.type]} ·{' '}
                  {account.bank?.name ?? strings.accounts.noBank}
                </p>
              </div>
              <div className="ms-auto flex shrink-0 items-center gap-2">
                {/* Balances are per-currency and never summed, here least of
                    all: these belong to someone else's ledger. */}
                <span
                  className={cn('tabular-nums', account.balance < 0 && 'text-destructive')}
                >
                  {formatMoneyWithCurrency(account.balance, account.currency)}
                </span>
                <Badge variant="secondary">{account.owner?.displayName}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </QueryState>
  )
}

function SharedTopics() {
  const topics = useQuery({ queryKey: ['topics', 'shared'], queryFn: sharedResourcesApi.topics })

  return (
    <QueryState query={topics} empty={strings.sharing.nothingIncoming}>
      {(rows: Topic[]) => (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* The same card /topics uses: spent, received, net, plan and the
              real span. It names the owner itself when one is set. */}
          {rows.map((topic) => (
            <TopicCard key={topic.id} topic={topic} />
          ))}
        </div>
      )}
    </QueryState>
  )
}

function SharedGoals() {
  const goals = useQuery({ queryKey: ['goals', 'shared'], queryFn: sharedResourcesApi.goals })

  return (
    <QueryState query={goals} empty={strings.sharing.nothingIncoming}>
      {(rows: Goal[]) => (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((goal) => (
            // No callbacks: the card renders no action row for a goal that
            // isn't yours, and it names the owner in its own subtitle.
            <GoalCard key={goal.id} goal={goal} />
          ))}
        </div>
      )}
    </QueryState>
  )
}

function SharedBudgets() {
  const [month, setMonth] = useState(currentMonthInAlmaty)
  const budgets = useQuery({
    queryKey: ['budgets', 'shared', month],
    queryFn: () => sharedResourcesApi.budgets(month),
  })

  return (
    <div className="space-y-2">
      {/* A budget is a per-month figure, so a shared one needs the same month
          control the owned list has — otherwise it silently means "this month". */}
      <MonthSelector month={month} onChange={setMonth} />
      <QueryState query={budgets} empty={strings.budgets.noneThisMonth}>
        {(rows: Budget[]) => (
          <ul className="space-y-3">
            {rows.map((budget) => (
              <li key={budget.id}>
                <Card>
                  <CardContent className="space-y-2 py-4">
                    <BudgetBar budget={budget} />
                    {budget.owner && (
                      <p className="text-xs text-muted-foreground">
                        {strings.sharing.owner}: {budget.owner.displayName}
                      </p>
                    )}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </div>
  )
}

function SharedBills() {
  const bills = useQuery({ queryKey: ['bills', 'shared'], queryFn: sharedResourcesApi.bills })

  return (
    <QueryState query={bills} empty={strings.sharing.nothingIncoming}>
      {(rows: Bill[]) => (
        <ul className="divide-y rounded-md border">
          {rows.map((bill) => (
            <li key={bill.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate">{bill.name}</p>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {formatDate(bill.dueDate)}
                </p>
              </div>
              <div className="ms-auto flex shrink-0 items-center gap-2">
                {/* Server-computed in Almaty time — never recomputed here. */}
                {bill.overdue && <Badge variant="destructive">{strings.bills.overdue}</Badge>}
                {bill.isPaid && <Badge variant="secondary">{strings.bills.paid}</Badge>}
                <span className="tabular-nums">
                  {formatMoneyWithCurrency(bill.amount, bill.currency)}
                </span>
                <Badge variant="secondary">{bill.owner?.displayName}</Badge>
              </div>
            </li>
          ))}
        </ul>
      )}
    </QueryState>
  )
}

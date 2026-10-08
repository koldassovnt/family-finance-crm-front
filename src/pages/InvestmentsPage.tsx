import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { accountsApi, investmentsApi } from '@/api/endpoints'
import { QueryState } from '@/components/QueryState'
import { HoldingsTable } from '@/components/investments/HoldingsTable'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { Button } from '@/components/ui/button'
import { isInvestmentAccount } from '@/lib/accounts'
import { formatMoneyWithCurrency } from '@/lib/format'
import { strings } from '@/strings'

/**
 * What is held across the caller's own broker and crypto accounts, at cost.
 *
 * Own accounts only: `GET /investments` never includes an account shared with
 * the caller, in keeping with the rule that nothing shared enters your own
 * figures. A shared account's positions are on that account's page instead.
 */
export function InvestmentsPage() {
  const [dialog, setDialog] = useState<'trade' | 'opening' | null>(null)

  const holdings = useQuery({ queryKey: ['investments'], queryFn: investmentsApi.holdings })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })

  // A trade is a 400 on any other account type, so the forms opened from here
  // are never offered one.
  const investmentAccounts = (accounts.data ?? []).filter((account) =>
    isInvestmentAccount(account.type),
  )
  const hasNoAccounts = accounts.isSuccess && investmentAccounts.length === 0

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{strings.investments.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Its own button, not a third side in the trade form: this is how a
              portfolio that predates the app gets in, and it moves no cash. */}
          <Button
            variant="outline"
            disabled={investmentAccounts.length === 0}
            onClick={() => setDialog('opening')}
          >
            {strings.investments.addOpening}
          </Button>
          <Button disabled={investmentAccounts.length === 0} onClick={() => setDialog('trade')}>
            {strings.investments.addTrade}
          </Button>
        </div>
      </div>

      {hasNoAccounts && <p className="text-muted-foreground">{strings.investments.noAccounts}</p>}

      {/* Mounted only while open, and keyed, so each opening starts from its
          own defaults rather than whatever the other dialog left behind. */}
      {dialog !== null && (
        <TransactionForm
          key={dialog}
          open
          onOpenChange={(next) => !next && setDialog(null)}
          accounts={investmentAccounts}
          categories={[]}
          opening={dialog === 'opening'}
          defaults={{ type: 'TRADE', accountId: investmentAccounts[0]?.id ?? '' }}
        />
      )}

      <QueryState query={holdings}>
        {(data) =>
          data.holdings.length === 0 ? (
            // With no accounts the line above already says what to do first.
            !hasNoAccounts && <p className="text-muted-foreground">{strings.investments.empty}</p>
          ) : (
            <>
              <div>
                <p className="text-sm text-muted-foreground">{strings.investments.totalCost}</p>
                <p className="text-2xl font-semibold tabular-nums">
                  {formatMoneyWithCurrency(data.totalCostKzt, 'KZT')}
                </p>
                <p className="text-xs text-muted-foreground">{strings.investments.costHint}</p>
              </div>
              <HoldingsTable data={data} showAccount />
            </>
          )
        }
      </QueryState>
    </section>
  )
}

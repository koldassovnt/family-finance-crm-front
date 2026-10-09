import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { accountsApi, investmentsApi, marketDataApi } from '@/api/endpoints'
import type { Holding } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { HoldingsTable } from '@/components/investments/HoldingsTable'
import { RenameTickerDialog } from '@/components/investments/RenameTickerDialog'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { Button } from '@/components/ui/button'
import { isInvestmentAccount } from '@/lib/accounts'
import { formatMoneyWithCurrency, formatSignedMoneyWithCurrency } from '@/lib/format'
import { suggestedRate } from '@/lib/rates'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

/** Required by the price provider's free plan. */
const PRICE_PROVIDER_URL = 'https://api-ninjas.com'

/**
 * What is held across the caller's own broker and crypto accounts: what it
 * cost, and — where the server has a market price — what it is worth now.
 *
 * Own accounts only: `GET /investments` never includes an account shared with
 * the caller, in keeping with the rule that nothing shared enters your own
 * figures. A shared account's positions are on that account's page instead.
 */
export function InvestmentsPage() {
  const queryClient = useQueryClient()
  const [dialog, setDialog] = useState<'trade' | 'opening' | null>(null)
  const [renaming, setRenaming] = useState<Holding | null>(null)

  const holdings = useQuery({ queryKey: ['investments'], queryFn: investmentsApi.holdings })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
  const rates = useQuery({ queryKey: ['market-rates'], queryFn: marketDataApi.rates })

  // A trade is a 400 on any other account type, so the forms opened from here
  // are never offered one.
  const investmentAccounts = (accounts.data ?? []).filter((account) =>
    isInvestmentAccount(account.type),
  )
  const hasNoAccounts = accounts.isSuccess && investmentAccounts.length === 0

  const refresh = useMutation({
    mutationFn: marketDataApi.refresh,
    onSuccess: (result) => {
      // No API key on the server: nothing was asked, so the counts are all
      // zero and would read as "everything is up to date".
      if (!result.configured) {
        toast.error(strings.investments.refreshNotConfigured)
        return
      }
      for (const key of ['investments', 'account-holdings', 'market-rates']) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
      toast.success(strings.investments.refreshed(result))
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{strings.investments.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {/* Safe to press repeatedly: the server does not ask again for what
              it already fetched today, and refreshes by itself each morning. */}
          <Button variant="ghost" disabled={refresh.isPending} onClick={() => refresh.mutate()}>
            {strings.investments.refresh}
          </Button>
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
          own defaults rather than whatever the other dialog left behind. The
          rate is seeded here because the account is preselected — the form
          only suggests one when an account is picked by hand. */}
      {dialog !== null && (
        <TransactionForm
          key={dialog}
          open
          onOpenChange={(next) => !next && setDialog(null)}
          accounts={investmentAccounts}
          categories={[]}
          opening={dialog === 'opening'}
          defaults={{
            type: 'TRADE',
            accountId: investmentAccounts[0]?.id ?? '',
            exchangeRate: suggestedRate(rates.data, investmentAccounts[0]?.currency),
          }}
        />
      )}

      {renaming !== null && (
        <RenameTickerDialog
          key={`${renaming.ticker}:${renaming.accountId}`}
          holding={renaming}
          open
          onOpenChange={(next) => !next && setRenaming(null)}
        />
      )}

      <QueryState query={holdings}>
        {(data) =>
          data.holdings.length === 0 ? (
            // With no accounts the line above already says what to do first.
            !hasNoAccounts && <p className="text-muted-foreground">{strings.investments.empty}</p>
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-3">
                <Total label={strings.investments.totalCost} value={data.totalCostKzt} />
                <Total label={strings.investments.totalValue} value={data.totalValueKzt} />
                <Total label={strings.investments.gain} value={data.totalGainKzt} signed />
              </div>
              <p className="text-xs text-muted-foreground">
                {/* The cost above covers every holding; value and gain only the
                    priced ones — so they are partial, and say so. */}
                {data.unpriced > 0 && <>{strings.investments.unpricedHint(data.unpriced)} </>}
                {strings.investments.priceHint}
              </p>
              <HoldingsTable data={data} showAccount onRename={setRenaming} />
            </>
          )
        }
      </QueryState>

      <p className="text-xs text-muted-foreground">
        <a
          href={PRICE_PROVIDER_URL}
          target="_blank"
          rel="noreferrer"
          className="underline-offset-4 hover:underline"
        >
          {strings.investments.attribution}
        </a>
      </p>
    </section>
  )
}

/**
 * One of the three KZT totals. Null is a dash, not a zero — the market totals
 * are null when nothing held has a price.
 */
function Total({
  label,
  value,
  signed = false,
}: {
  label: string
  value: number | null
  signed?: boolean
}) {
  return (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={cn(
          'text-2xl font-semibold tabular-nums',
          signed && value !== null && value > 0 && 'text-emerald-600 dark:text-emerald-400',
          signed && value !== null && value < 0 && 'text-destructive',
        )}
      >
        {value === null
          ? '—'
          : signed
            ? formatSignedMoneyWithCurrency(value, 'KZT')
            : formatMoneyWithCurrency(value, 'KZT')}
      </p>
    </div>
  )
}

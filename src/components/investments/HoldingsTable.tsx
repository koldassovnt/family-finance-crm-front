import { Link } from 'react-router-dom'
import type { Holding, HoldingCurrencyTotal, Holdings } from '@/api/types'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  currencySymbol,
  formatAveragePrice,
  formatMoneyWithCurrency,
  formatQuantity,
} from '@/lib/format'
import { strings } from '@/strings'

/**
 * Positions grouped by currency, each group under its own total — the same
 * arrangement as the accounts list, for the same reason: figures in different
 * currencies are never added together. The one cross-currency figure is the
 * KZT cost, which the server computes from each purchase's own rate.
 *
 * Everything shown is **cost**: what was paid for the units still held. There
 * is no price feed, so nothing here is a valuation and no column is labelled
 * as one.
 *
 * Totals come from `totalsByCurrency` and are never re-added here. The KZT
 * figures in particular cannot be: they are sums of per-purchase conversions,
 * not a product of anything on screen.
 */
export function HoldingsTable({
  data,
  showAccount,
}: {
  data: Holdings
  /** Off on an account's own page, where every row would repeat its name. */
  showAccount: boolean
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{strings.investments.ticker}</TableHead>
          <TableHead className="text-right">{strings.investments.quantity}</TableHead>
          <TableHead className="text-right">{strings.investments.averagePrice}</TableHead>
          <TableHead className="text-right">{strings.investments.cost}</TableHead>
        </TableRow>
      </TableHeader>
      {groupByCurrency(data).map(({ total, holdings }) => (
        <TableBody key={total.currency}>
          <TableRow className="bg-muted/50 font-medium hover:bg-muted/50">
            <TableCell colSpan={3}>{strings.investments.currencyCost(total.currency)}</TableCell>
            <TableCell>
              <Figure
                primary={formatMoneyWithCurrency(total.cost, total.currency)}
                kzt={total.costKzt}
                currency={total.currency}
              />
            </TableCell>
          </TableRow>
          {holdings.map((holding) => (
            // One row per ticker per account, so the ticker alone is not a key.
            <TableRow key={`${holding.ticker}:${holding.accountId}`}>
              <TableCell>
                <span className="font-medium">{holding.ticker}</span>
                {showAccount && (
                  <p className="truncate text-xs text-muted-foreground">
                    <Link
                      to={`/accounts/${holding.accountId}`}
                      className="underline-offset-4 hover:underline"
                    >
                      {holding.accountName}
                    </Link>
                  </p>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatQuantity(holding.quantity)}
              </TableCell>
              <TableCell>
                <Figure
                  primary={`${formatAveragePrice(holding.averagePrice)} ${currencySymbol(holding.currency)}`}
                  kzt={holding.averagePriceKzt}
                  currency={holding.currency}
                />
              </TableCell>
              <TableCell>
                <Figure
                  primary={formatMoneyWithCurrency(holding.cost, holding.currency)}
                  kzt={holding.costKzt}
                  currency={holding.currency}
                />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      ))}
    </Table>
  )
}

/**
 * A figure in the account's currency with its KZT counterpart beneath, as the
 * ledger's amount column does. On a KZT account the two are the same number,
 * so the second line is dropped.
 */
function Figure({ primary, kzt, currency }: { primary: string; kzt: number; currency: string }) {
  return (
    <div className="text-right tabular-nums">
      {primary}
      {currency !== 'KZT' && (
        <p className="text-xs text-muted-foreground">{formatMoneyWithCurrency(kzt, 'KZT')}</p>
      )}
    </div>
  )
}

interface CurrencyGroup {
  total: HoldingCurrencyTotal
  holdings: Holding[]
}

/**
 * KZT leads as the base currency and the rest follow by code, matching the
 * accounts list. Rows keep the server's order — ticker, then account name.
 */
function groupByCurrency(data: Holdings): CurrencyGroup[] {
  return [...data.totalsByCurrency]
    .sort((a, b) =>
      a.currency === 'KZT' ? -1 : b.currency === 'KZT' ? 1 : a.currency.localeCompare(b.currency),
    )
    .map((total) => ({
      total,
      holdings: data.holdings.filter((holding) => holding.currency === total.currency),
    }))
}

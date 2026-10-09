import { Link } from 'react-router-dom'
import type { Holding, HoldingCurrencyTotal, Holdings } from '@/api/types'
import { Button } from '@/components/ui/button'
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
  formatInstantDate,
  formatMoneyWithCurrency,
  formatQuantity,
  formatSignedMoneyWithCurrency,
  formatUnitPrice,
} from '@/lib/format'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

/**
 * Positions grouped by currency, each group under its own total — the same
 * arrangement as the accounts list, for the same reason: figures in different
 * currencies are never added together. The cross-currency figures are the KZT
 * ones, which the server computes.
 *
 * Two kinds of figure sit side by side. **Cost** — average price and
 * «Вложено» — is what was paid and is always there. **Market** — price,
 * «Стоимость», «Прибыль» — exists only where the server has a price, and is
 * otherwise «нет цены» and dashes, never a zero: an unpriced holding is not a
 * worthless one. Everything in a KZT broker account is unpriced by design.
 *
 * Totals come from `totalsByCurrency` and are never re-derived here. A
 * group's cost covers every holding and its value only the priced ones, so
 * `value − cost` is not its gain; the `gain` field is.
 */
export function HoldingsTable({
  data,
  showAccount,
  onRename,
}: {
  data: Holdings
  /** Off on an account's own page, where every row would repeat its name. */
  showAccount: boolean
  /** Adds the rename action. Omit for a viewer — it is owner-only. */
  onRename?: (holding: Holding) => void
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{strings.investments.ticker}</TableHead>
          <TableHead className="text-right">{strings.investments.quantity}</TableHead>
          <TableHead className="text-right">{strings.investments.averagePrice}</TableHead>
          <TableHead className="text-right">{strings.investments.cost}</TableHead>
          <TableHead className="text-right">{strings.investments.currentPrice}</TableHead>
          <TableHead className="text-right">{strings.investments.value}</TableHead>
          <TableHead className="text-right">{strings.investments.gain}</TableHead>
          {onRename !== undefined && <TableHead />}
        </TableRow>
      </TableHeader>
      {groupByCurrency(data).map(({ total, holdings }) => (
        <TableBody key={total.currency}>
          <TableRow className="bg-muted/50 font-medium hover:bg-muted/50">
            <TableCell colSpan={3}>{strings.investments.currencyCost(total.currency)}</TableCell>
            <TableCell>
              <Figure value={total.cost} kzt={total.costKzt} currency={total.currency} />
            </TableCell>
            {/* Beside the value it qualifies: the market total is partial
                whenever anything in the group has no price. */}
            <TableCell className="text-right text-xs font-normal text-muted-foreground">
              {total.unpriced > 0 && strings.investments.unpriced(total.unpriced)}
            </TableCell>
            <TableCell>
              <Figure value={total.value} kzt={total.valueKzt} currency={total.currency} />
            </TableCell>
            <TableCell>
              <Figure value={total.gain} kzt={total.gainKzt} currency={total.currency} signed />
            </TableCell>
            {onRename !== undefined && <TableCell />}
          </TableRow>
          {holdings.map((holding) => (
            // One row per ticker per account, so the ticker alone is not a key.
            <TableRow key={`${holding.ticker}:${holding.accountId}`}>
              <TableCell>
                <span className="font-medium">{holding.ticker}</span>
                {(showAccount || holding.exchange !== null) && (
                  <p className="truncate text-xs text-muted-foreground">
                    {showAccount && (
                      <Link
                        to={`/accounts/${holding.accountId}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {holding.accountName}
                      </Link>
                    )}
                    {showAccount && holding.exchange !== null && ' · '}
                    {holding.exchange}
                  </p>
                )}
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {formatQuantity(holding.quantity)}
              </TableCell>
              <TableCell>
                <Figure
                  text={`${formatAveragePrice(holding.averagePrice)} ${currencySymbol(holding.currency)}`}
                  value={holding.averagePrice}
                  kzt={holding.averagePriceKzt}
                  currency={holding.currency}
                />
              </TableCell>
              <TableCell>
                <Figure value={holding.cost} kzt={holding.costKzt} currency={holding.currency} />
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {holding.price === null ? (
                  <span className="text-xs text-muted-foreground">
                    {strings.investments.noPrice}
                  </span>
                ) : (
                  <>
                    {formatUnitPrice(holding.price)} {currencySymbol(holding.currency)}
                    {/* A daily close, so it can be a day or more old. */}
                    {holding.priceAsOf !== null && (
                      <p className="text-xs text-muted-foreground">
                        {strings.investments.priceAsOf(formatInstantDate(holding.priceAsOf))}
                      </p>
                    )}
                  </>
                )}
              </TableCell>
              <TableCell>
                <Figure value={holding.value} kzt={holding.valueKzt} currency={holding.currency} />
              </TableCell>
              <TableCell>
                <Figure
                  value={holding.gain}
                  kzt={holding.gainKzt}
                  currency={holding.currency}
                  signed
                />
              </TableCell>
              {onRename !== undefined && (
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => onRename(holding)}>
                    {strings.investments.rename}
                  </Button>
                </TableCell>
              )}
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
 *
 * Null renders as a dash — the market figures of an unpriced holding. The KZT
 * line can be missing on its own, when only the latest rate is.
 *
 * `signed` is for a gain: «+» on a profit, and coloured, since which side of
 * zero it falls is the whole point of the column.
 */
function Figure({
  value,
  kzt,
  currency,
  text,
  signed = false,
}: {
  value: number | null
  kzt: number | null
  currency: string
  /** Overrides the money formatting — an average price is not rounded as money. */
  text?: string
  signed?: boolean
}) {
  if (value === null) {
    return <div className="text-right text-muted-foreground">—</div>
  }

  const format = signed ? formatSignedMoneyWithCurrency : formatMoneyWithCurrency

  return (
    <div
      className={cn(
        'text-right tabular-nums',
        signed && value > 0 && 'text-emerald-600 dark:text-emerald-400',
        signed && value < 0 && 'text-destructive',
      )}
    >
      {text ?? format(value, currency)}
      {currency !== 'KZT' && kzt !== null && (
        <p className="text-xs text-muted-foreground">{format(kzt, 'KZT')}</p>
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

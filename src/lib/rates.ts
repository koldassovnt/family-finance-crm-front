import type { MarketRate } from '@/api/types'
import { toPlainDecimal } from '@/lib/format'

/**
 * The latest stored KZT rate for a currency, as text for the exchange-rate
 * input — or '' when there is nothing to suggest: a KZT account needs no
 * rate, and the list is empty until the server's first refresh.
 *
 * A suggestion only. It is the latest daily rate, not the rate the user's bank
 * actually applied and not the rate of a back-dated entry, so the input it
 * seeds stays editable and what the user leaves there is what gets sent.
 */
export function suggestedRate(rates: MarketRate[] | undefined, currency: string | undefined): string {
  if (currency === undefined || currency === 'KZT') return ''
  const rate = rates?.find((row) => row.currency === currency)
  return rate === undefined ? '' : toPlainDecimal(rate.rateKzt)
}

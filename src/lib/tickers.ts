import type { AccountType } from '@/api/types'
import { strings } from '@/strings'

const messages = strings.investments.errors

/** What a ticker must look like in one account. */
export interface TickerRule {
  /** A ticker that satisfies the rule, for the input's placeholder. */
  example: string
  /** Null when the ticker is acceptable, otherwise why it is not. */
  validate: (ticker: string) => string | null
}

const CRYPTO_PAIR = /^[A-Z0-9]{1,20}\/[A-Z]{3}$/
const WITH_EXCHANGE = /^[A-Z0-9^-]{1,20}\.[A-Z]{1,6}$/
const PLAIN = /^[A-Z0-9]{1,20}$/

/**
 * The ticker format for an account, mirroring the backend's — which rejects
 * anything else with a 400 on `ticker`. The format is what lets the server
 * find a market price, so it follows where the asset is quoted:
 *
 * - a crypto account takes a pair quoted in the account's own currency,
 *   `TON/USD`;
 * - a broker account in a foreign currency takes the symbol with its
 *   exchange, `VEA.US`;
 * - a KZT broker account takes the plain ticker, `HSBK` — KASE is not covered
 *   by the price provider, so there is no exchange to name.
 *
 * The server trims and uppercases before judging, so this does too and a
 * lower-case entry is not an error. Null for an account that cannot hold
 * positions at all.
 */
export function tickerRule(type: AccountType, currency: string): TickerRule | null {
  if (type === 'CRYPTO') {
    return {
      example: `TON/${currency}`,
      validate: (ticker) => {
        const normalized = ticker.trim().toUpperCase()
        if (!CRYPTO_PAIR.test(normalized)) return messages.tickerCryptoFormat(currency)
        // Well-formed but quoted in something else: a different mistake, and
        // worth its own wording.
        return normalized.endsWith(`/${currency}`) ? null : messages.tickerCryptoCurrency(currency)
      },
    }
  }

  if (type !== 'BROKER') return null

  if (currency === 'KZT') {
    return {
      example: 'HSBK',
      validate: (ticker) =>
        PLAIN.test(ticker.trim().toUpperCase()) ? null : messages.tickerPlain,
    }
  }

  return {
    example: 'VEA.US',
    validate: (ticker) =>
      WITH_EXCHANGE.test(ticker.trim().toUpperCase()) ? null : messages.tickerExchange(currency),
  }
}

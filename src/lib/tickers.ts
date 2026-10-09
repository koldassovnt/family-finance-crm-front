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

const COIN_PAIR = /^[A-Z0-9]{1,20}\/[A-Z]{3}$/
const WITH_EXCHANGE = /^[A-Z0-9^-]{1,20}\.[A-Z]{1,6}$/
const PLAIN = /^[A-Z0-9]{1,20}$/

/** A coin pair must be well-formed and quoted in the account's own currency. */
function validateCoin(normalized: string, currency: string): string | null {
  if (!COIN_PAIR.test(normalized)) return messages.tickerCoinFormat(currency)
  // Well-formed but quoted in something else: a different mistake, and
  // worth its own wording.
  return normalized.endsWith(`/${currency}`) ? null : messages.tickerCoinCurrency(currency)
}

/**
 * The ticker format for an account, mirroring the backend's — which rejects
 * anything else with a 400 on `ticker`. The format is what lets the server
 * find a market price, so it follows where the asset is quoted:
 *
 * - a coin is a pair quoted in the account's own currency, `GRAM/USD`;
 * - a stock in a broker account in a foreign currency is the symbol with its
 *   exchange, `VEA.US`;
 * - a stock in a KZT broker account is the plain ticker, `HSBK` — KASE is not
 *   covered by the price provider, so there is no exchange to name.
 *
 * The `/` decides whether a ticker is a coin, not the account type: the
 * owner's coins sit in a broker account that predates the crypto type, so a
 * broker account takes a coin pair as well as a stock. A crypto account takes
 * coin pairs only.
 *
 * The server trims and uppercases before judging, so this does too and a
 * lower-case entry is not an error. Null for an account that cannot hold
 * positions at all.
 */
export function tickerRule(type: AccountType, currency: string): TickerRule | null {
  if (type === 'CRYPTO') {
    return {
      example: `GRAM/${currency}`,
      validate: (ticker) => validateCoin(ticker.trim().toUpperCase(), currency),
    }
  }

  if (type !== 'BROKER') return null

  const stock =
    currency === 'KZT'
      ? { example: 'HSBK', format: PLAIN, message: messages.tickerPlain }
      : { example: 'VEA.US', format: WITH_EXCHANGE, message: messages.tickerExchange(currency) }

  return {
    example: stock.example,
    validate: (ticker) => {
      const normalized = ticker.trim().toUpperCase()
      if (normalized.includes('/')) return validateCoin(normalized, currency)
      return stock.format.test(normalized) ? null : stock.message
    },
  }
}

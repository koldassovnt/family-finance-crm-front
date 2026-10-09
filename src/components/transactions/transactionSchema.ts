import { z } from 'zod'
import type { Account } from '@/api/types'
import { isInvestmentAccount } from '@/lib/accounts'
import { parseMoney, todayInAlmaty } from '@/lib/format'
import { tickerRule } from '@/lib/tickers'
import { strings } from '@/strings'

const messages = strings.transactions.errors
const tradeMessages = strings.investments.errors

/** The server's limit on a trade's quantity and unit price. */
const TRADE_MAX_DECIMALS = 10

export const transactionFormSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER', 'TRADE']),
  /**
   * Money arrives from the input as text — «45 000,50», "45000.50" — not a
   * number. Parsed here and judged in {@link refineTransaction} rather than
   * rejected on the spot: a trade has no amount input at all, so an empty
   * string is the correct value there and only an error elsewhere.
   */
  amount: z.string().transform((value) => parseMoney(value)),
  accountId: z.string().min(1, { message: messages.accountRequired }),
  toAccountId: z.string().optional(),
  toAmount: z.string().optional(),
  exchangeRate: z.string().optional(),
  categoryId: z.string().optional(),
  topicId: z.string().optional(),
  occurredOn: z.string(),
  note: z.string().max(1000, { message: messages.noteTooLong }),
  /** The four trade fields, read only when `type` is `TRADE`. */
  tradeSide: z.enum(['BUY', 'SELL', 'OPENING']).optional(),
  ticker: z.string().optional(),
  quantity: z.string().optional(),
  unitPrice: z.string().optional(),
})

export type TransactionFormValues = z.input<typeof transactionFormSchema>
export type TransactionFormOutput = z.output<typeof transactionFormSchema>

/** Digits after the decimal separator, as typed — «0,00041» is 5. */
function decimalPlaces(input: string): number {
  const [, fraction = ''] = input.replace(/\s/g, '').replace(',', '.').split('.')
  return fraction.length
}

/**
 * A quantity or a unit price: a number above zero with at most 10 decimals.
 * The decimals are counted on the text, not the parsed number — a float cannot
 * say how many digits the user typed.
 */
function tradeNumberError(input: string, invalid: string): string | null {
  const parsed = parseMoney(input)
  if (Number.isNaN(parsed) || parsed <= 0) return invalid
  return decimalPlaces(input) > TRADE_MAX_DECIMALS ? tradeMessages.tooManyDecimals : null
}

/**
 * The cross-field rules, which need the accounts to know their currencies.
 *
 * These mirror the backend's service-layer validation rather than guessing at
 * it: `toAmount` is *rejected* when the currencies match rather than merely
 * optional, and `exchangeRate` is required whenever the source account isn't
 * KZT. Catching both here means the user sees the problem next to the input
 * instead of as a toast after a round trip.
 */
export function refineTransaction(accounts: Account[]) {
  const byId = new Map(accounts.map((account) => [account.id, account]))

  return (values: TransactionFormOutput, ctx: z.RefinementCtx): void => {
    const source = byId.get(values.accountId)

    if (values.occurredOn > todayInAlmaty()) {
      ctx.addIssue({ code: 'custom', path: ['occurredOn'], message: messages.dateFuture })
    }

    // A non-KZT account needs the rate every backend total is derived from.
    if (source !== undefined && source.currency !== 'KZT') {
      const rate = parseMoney(values.exchangeRate ?? '')
      if (Number.isNaN(rate) || rate <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['exchangeRate'],
          message: messages.exchangeRateRequired,
        })
      }
    }

    if (values.type === 'TRADE') {
      refineTrade(values, source, ctx)
      return
    }

    if (Number.isNaN(values.amount)) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: messages.amountInvalid })
    } else if (values.amount <= 0) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: messages.amountPositive })
    }

    if (values.type !== 'TRANSFER') return

    const destination = byId.get(values.toAccountId ?? '')
    if (destination === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['toAccountId'],
        message: messages.toAccountRequired,
      })
      return
    }

    if (destination.id === values.accountId) {
      ctx.addIssue({ code: 'custom', path: ['toAccountId'], message: messages.toAccountSame })
      return
    }

    // Required when the currencies differ, rejected when they match — the
    // form omits the field entirely in the matching case, so there is nothing
    // to send.
    if (source !== undefined && source.currency !== destination.currency) {
      const converted = parseMoney(values.toAmount ?? '')
      if (Number.isNaN(converted) || converted <= 0) {
        ctx.addIssue({
          code: 'custom',
          path: ['toAmount'],
          message: messages.toAmountRequired,
        })
      }
    }
  }
}

/**
 * A trade's own rules. No amount check: the server derives it as
 * `quantity × unitPrice` and rejects one that is sent.
 *
 * Whether a SELL exceeds what the account holds is left to the server, which
 * answers 400 on `quantity` — the form would need the holdings as of the
 * trade's date to judge it, and would still be racing the ledger.
 */
function refineTrade(
  values: TransactionFormOutput,
  source: Account | undefined,
  ctx: z.RefinementCtx,
): void {
  if (source !== undefined && !isInvestmentAccount(source.type)) {
    ctx.addIssue({
      code: 'custom',
      path: ['accountId'],
      message: tradeMessages.accountNotInvestment,
    })
  }

  // The format depends on the account — a pair on a crypto account, a symbol
  // with its exchange on a foreign-currency broker one — so there is nothing
  // to check the ticker against until an account is chosen.
  const ticker = (values.ticker ?? '').trim()
  const formatError =
    source === undefined ? null : tickerRule(source.type, source.currency)?.validate(ticker)
  if (ticker === '') {
    ctx.addIssue({ code: 'custom', path: ['ticker'], message: tradeMessages.tickerRequired })
  } else if (formatError != null) {
    ctx.addIssue({ code: 'custom', path: ['ticker'], message: formatError })
  }

  const quantityError = tradeNumberError(values.quantity ?? '', tradeMessages.quantityInvalid)
  if (quantityError !== null) {
    ctx.addIssue({ code: 'custom', path: ['quantity'], message: quantityError })
  }

  const priceError = tradeNumberError(values.unitPrice ?? '', tradeMessages.priceInvalid)
  if (priceError !== null) {
    ctx.addIssue({ code: 'custom', path: ['unitPrice'], message: priceError })
  }
}

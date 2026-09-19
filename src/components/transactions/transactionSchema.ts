import { z } from 'zod'
import type { Account } from '@/api/types'
import { parseMoney, todayInAlmaty } from '@/lib/format'
import { strings } from '@/strings'

const messages = strings.transactions.errors

/** Money arrives from the input as text — «45 000,50», "45000.50" — not a number. */
const money = z.string().transform((value, ctx) => {
  const parsed = parseMoney(value)
  if (Number.isNaN(parsed)) {
    ctx.addIssue({ code: 'custom', message: messages.amountInvalid })
    return z.NEVER
  }
  return parsed
})

export const transactionFormSchema = z.object({
  type: z.enum(['INCOME', 'EXPENSE', 'TRANSFER']),
  amount: money,
  accountId: z.string().min(1, { message: messages.accountRequired }),
  toAccountId: z.string().optional(),
  toAmount: z.string().optional(),
  exchangeRate: z.string().optional(),
  categoryId: z.string().optional(),
  topicId: z.string().optional(),
  occurredOn: z.string(),
  note: z.string().max(1000, { message: messages.noteTooLong }),
})

export type TransactionFormValues = z.input<typeof transactionFormSchema>
export type TransactionFormOutput = z.output<typeof transactionFormSchema>

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

    if (values.amount <= 0) {
      ctx.addIssue({ code: 'custom', path: ['amount'], message: messages.amountPositive })
    }

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

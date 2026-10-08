import type { Transaction } from '@/api/types'
import { formatMoneyWithCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * The amount in the transaction's own currency, with the KZT figure beneath it
 * when they differ — every backend total is built from `amountKzt`, so showing
 * it makes the summary reconcilable by eye.
 *
 * Sign is presentational: the API stores a positive magnitude and the type
 * says which way the money went. ADJUSTMENT is the one type whose amount may
 * genuinely be negative, so it is left to speak for itself.
 *
 * A trade is signed by what it did to the account's cash — a purchase took it,
 * a sale returned it — but not coloured: it is neither spending nor income,
 * and the monthly summary ignores it. An OPENING moved no cash at all, so its
 * amount is the recorded cost and is muted rather than signed.
 */
export function TransactionAmount({ transaction }: { transaction: Transaction }) {
  const { type, amount, currency, amountKzt, tradeSide } = transaction
  const prefix =
    type === 'INCOME' || tradeSide === 'SELL'
      ? '+'
      : type === 'EXPENSE' || tradeSide === 'BUY'
        ? '−'
        : ''

  return (
    <div className="text-right">
      <span
        className={cn(
          'tabular-nums',
          type === 'INCOME' && 'text-emerald-600 dark:text-emerald-400',
          type === 'EXPENSE' && 'text-destructive',
          tradeSide === 'OPENING' && 'text-muted-foreground',
        )}
      >
        {prefix}
        {formatMoneyWithCurrency(amount, currency)}
      </span>
      {currency !== 'KZT' && (
        <p className="text-xs text-muted-foreground tabular-nums">
          {formatMoneyWithCurrency(amountKzt, 'KZT')}
        </p>
      )}
    </div>
  )
}

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
 */
export function TransactionAmount({ transaction }: { transaction: Transaction }) {
  const { type, amount, currency, amountKzt } = transaction
  const prefix = type === 'INCOME' ? '+' : type === 'EXPENSE' ? '−' : ''

  return (
    <div className="text-right">
      <span
        className={cn(
          'tabular-nums',
          type === 'INCOME' && 'text-emerald-600 dark:text-emerald-400',
          type === 'EXPENSE' && 'text-destructive',
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

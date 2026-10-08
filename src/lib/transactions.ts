import type { Transaction } from '@/api/types'
import { currencySymbol, formatQuantity, formatUnitPrice } from '@/lib/format'
import { strings } from '@/strings'

/**
 * What a ledger row is called. A trade has no category and its type alone —
 * «Сделка» — says nothing, so it is named by its side and ticker instead:
 * «Покупка VOO».
 */
export function transactionTitle(transaction: Transaction): string {
  if (transaction.type === 'TRADE' && transaction.tradeSide !== null) {
    return `${strings.investments.sides[transaction.tradeSide]} ${transaction.ticker ?? ''}`.trim()
  }
  // The category is embedded and keeps its name after deletion, so it is
  // never resolved by id.
  return transaction.category?.name ?? strings.transactions.types[transaction.type]
}

/**
 * «2 × 100,00 $» for a trade, null for everything else. The row's amount is
 * the product of the two, so showing them makes it checkable by eye.
 */
export function tradeDetails(transaction: Transaction): string | null {
  if (transaction.quantity === null || transaction.unitPrice === null) return null
  return `${formatQuantity(transaction.quantity)} × ${formatUnitPrice(transaction.unitPrice)} ${currencySymbol(transaction.currency)}`
}

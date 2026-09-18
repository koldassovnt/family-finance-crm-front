/**
 * Response shapes, transcribed from the backend DTOs at
 * `src/main/kotlin/com/familyfinance/crm/dto/` in the backend repo. That source
 * is the contract — when something here disagrees with it, the source wins.
 *
 * Money arrives as JSON numbers whose scale is not stable across responses:
 * a write echoes what you sent (`45000`), a read returns full database scale
 * (`45000.0000`). Both parse to the same `number`, so never string-compare.
 */

export type UserRole = 'OWNER' | 'MEMBER'
export type AccountType = 'CASH' | 'BANK' | 'DEPOSIT' | 'BROKER'
export type CategoryKind = 'EXPENSE' | 'INCOME'
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ADJUSTMENT'
export type GoalType = 'SAVINGS' | 'EMERGENCY_FUND'
export type GoalStatus = 'ACTIVE' | 'ABANDONED' | 'ARCHIVED'
export type BudgetPeriod = 'MONTHLY'

export interface User {
  id: string
  email: string
  displayName: string
  role: UserRole
}

export interface LoginResponse {
  token: string
  /** ISO-8601 instant. Stored so the UI can warn before a 30-day token lapses. */
  expiresAt: string
  user: User
}

export interface Bank {
  id: string
  name: string
}

export interface Account {
  id: string
  name: string
  type: AccountType
  balance: number
  currency: string
  bank: Bank | null
}

export interface Category {
  id: string
  name: string
  kind: CategoryKind
  parentId: string | null
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  currency: string
  /** Cross-currency transfers only. */
  toAmount: number | null
  /** Scale 6, KZT per 1 unit. Not money — never format it as money. */
  exchangeRate: number
  /** What every backend total is computed from. */
  amountKzt: number
  occurredOn: string
  /** Ids only — join against the accounts list, and expect misses. */
  accountId: string
  toAccountId: string | null
  /** Embedded in full, and keeps its name after the category is deleted. */
  category: Category | null
  note: string | null
}

export interface CategorySummary {
  categoryId: string | null
  categoryName: string | null
  total: number
}

export interface MonthlySummary {
  month: string
  /** Always KZT. */
  currency: string
  from: string
  to: string
  totalIncome: number
  totalExpense: number
  net: number
  expenseByCategory: CategorySummary[]
  incomeByCategory: CategorySummary[]
}

export interface Budget {
  id: string
  category: Category
  limitAmount: number
  period: BudgetPeriod
  /** Display cue only — nothing alerts. */
  alertThresholdPercent: number | null
  /** `yyyy-MM` strings, not dates. */
  month: string
  effectiveFrom: string
  /** Null while the limit is still in force. */
  effectiveTo: string | null
  spent: number
  /** Negative once the limit is exceeded. */
  remaining: number
  /** Not capped at 100. Scale 2 by design. */
  percentUsed: number
}

export interface Goal {
  id: string
  name: string
  type: GoalType
  targetAmount: number
  targetDate: string | null
  /** Embedded in full, unlike a transaction's account — no join needed. */
  linkedAccount: Account
  status: GoalStatus
  /** Clamped 0–100, unlike a budget's percentUsed. */
  progressPercent: number
  achieved: boolean
}

export interface Bill {
  id: string
  name: string
  amount: number
  currency: string
  dueDate: string
  isPaid: boolean
  /** Server-computed in Almaty time. Never recompute this client-side. */
  overdue: boolean
  batchId: string | null
}

/** The one error shape every failure returns. Branch on `code`, never `message`. */
export type ApiErrorCode =
  | 'VALIDATION_FAILED'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'CURRENCY_MISMATCH'
  | 'DUPLICATE_BUDGET'
  | 'INTERNAL_ERROR'

export interface ApiErrorBody {
  code: ApiErrorCode
  message: string
  /** Omitted entirely when empty — the DTO is @JsonInclude(NON_EMPTY). */
  fieldErrors?: Record<string, string>
}

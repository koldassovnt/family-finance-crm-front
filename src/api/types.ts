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
/** `BROKER` and `CRYPTO` behave alike: both hold positions and accept trades. */
export type AccountType = 'CASH' | 'BANK' | 'DEPOSIT' | 'BROKER' | 'CRYPTO'
export type CategoryKind = 'EXPENSE' | 'INCOME'
export type TransactionType = 'INCOME' | 'EXPENSE' | 'TRANSFER' | 'ADJUSTMENT' | 'TRADE'
/**
 * `OPENING` records a position that was already held: it counts toward the
 * holding at the price entered and moves no cash.
 */
export type TradeSide = 'BUY' | 'SELL' | 'OPENING'
export type GoalType = 'SAVINGS' | 'EMERGENCY_FUND'
export type GoalStatus = 'ACTIVE' | 'ABANDONED' | 'ARCHIVED'
export type BudgetPeriod = 'MONTHLY'

export interface User {
  id: string
  email: string
  displayName: string
  role: UserRole
}

export type ShareResourceType = 'ACCOUNT' | 'GOAL' | 'BUDGET' | 'BILL' | 'TOPIC'

/**
 * What a grant confers. One value today, and the backend models it as its own
 * enum rather than reusing {@link AccessLevel} — see the note there.
 */
export type ShareAccess = 'VIEWER'

/**
 * How the caller reached a resource: as its owner, or through a share.
 *
 * Deliberately a separate type from {@link ShareAccess}, mirroring the backend,
 * where an exhaustive `asAccessLevel()` maps one to the other. Merging them into
 * one union would compile today and quietly become wrong the day `EDITOR` is
 * granted by a share — `OWNER` is not something a share can confer, and
 * `EDITOR` would not be a way to own something.
 */
export type AccessLevel = 'OWNER' | 'VIEWER'

/** Which resources a list returns. Absent means `OWN`, and this app relies on that. */
export type ShareScope = 'OWN' | 'SHARED' | 'ALL'

/** Just enough of a person to render and sort a row. */
export interface UserRef {
  id: string
  displayName: string
}

/**
 * Fields every shareable resource carries, so a screen can tell whose it is
 * without a second request.
 */
export interface Shareable {
  access: AccessLevel
  /** Null when `access` is `OWNER` — you are the owner, so there is no one to name. */
  owner: UserRef | null
}

export interface Share {
  id: string
  resourceType: ShareResourceType
  resourceId: string
  /**
   * Null only on `GET /shares?resourceType=&resourceId=`, where the caller is
   * looking at the thing already. Populated on incoming and outgoing. A
   * budget's is its category's name.
   */
  resourceName: string | null
  owner: UserRef
  grantee: UserRef
  access: ShareAccess
  /** `BaseEntity.createdAt`, set on persist — nullable in the DTO, so guard it. */
  sharedAt: string | null
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

/**
 * An account as it appears *inside* another response — a goal's linked account.
 *
 * Deliberately without {@link Shareable}, and the backend now agrees: since
 * `29e9ece` a goal's linked account is its own response type that omits both
 * fields, so this shape matches the JSON rather than ignoring what it carries.
 *
 * It was written this way before that fix, when a nested account was built by
 * the plain mapper and carried the DTO's defaults — a viewer reading a shared
 * goal got `access: "OWNER"` for an account that 404s for them. Keep the types
 * apart even though the field is gone: a nested account is adjacent data, not
 * the thing the caller asked for, so it has no access of its own to report.
 */
export interface AccountSummary {
  id: string
  name: string
  type: AccountType
  balance: number
  currency: string
  bank: Bank | null
}

/** A top-level account, where `access` and `owner` describe the caller's reach. */
export interface Account extends AccountSummary, Shareable {}

export interface Category {
  id: string
  name: string
  kind: CategoryKind
  parentId: string | null
}

/**
 * A topic groups the transactions of one undertaking — a trip, a renovation —
 * so it can be totalled on its own. It is a lens over the ledger, not a money
 * concept, and it cuts across categories: a category says what the money was
 * for, a topic says which occasion it belonged to.
 *
 * Embedded in a transaction like `category`, and like `category` it keeps
 * resolving after the topic is soft-deleted.
 */
export interface TransactionTopic {
  id: string
  name: string
  status: 'ACTIVE' | 'CLOSED'
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
  /**
   * Null for every TRANSFER and ADJUSTMENT — those cannot belong to a topic,
   * since attaching a transfer would count both the withdrawal and the thing
   * it paid for.
   */
  topic: TransactionTopic | null
  note: string | null
  /**
   * The four trade fields are null unless `type` is `TRADE`. On a trade,
   * `amount` is derived server-side as `quantity × unitPrice`.
   */
  tradeSide: TradeSide | null
  ticker: string | null
  /** Up to 10 decimals on reads (`1.0000000000`) — never money, format it. */
  quantity: number | null
  /** Per unit, in the account's currency. There is no instrument currency. */
  unitPrice: number | null
}

/**
 * What a priced holding or total adds to its cost figures. **All nullable**:
 * a holding without a market price has none of them, and that is a normal
 * state rather than an error — the price provider does not cover KASE, so
 * everything in a KZT broker account stays cost-only. Render "no price",
 * never 0.
 */
export interface MarketFigures {
  /** quantity × price, in the holding's currency. */
  value: number | null
  /** At the latest KZT rate; null on its own when only that rate is missing. */
  valueKzt: number | null
  /** value − cost; negative is a loss. */
  gain: number | null
  /** Reflects the exchange rate moving as well as the price. */
  gainKzt: number | null
}

/**
 * One ticker in one account — the same ticker in two accounts is two rows.
 *
 * The cost fields say what the units still held were bought for and are
 * always present; the {@link MarketFigures} say what they are worth now and
 * may all be null.
 */
export interface Holding extends MarketFigures {
  ticker: string
  accountId: string
  accountName: string
  accountType: AccountType
  currency: string
  quantity: number
  /**
   * Weighted average paid per unit. Derived, so with a tiny quantity it can
   * differ from the typed price in the last decimals — round for display.
   */
  averagePrice: number
  /** Uses each purchase's own rate, so it is not `averagePrice × one rate`. */
  averagePriceKzt: number
  /** What the units still held cost. */
  cost: number
  costKzt: number
  /** Latest market price of one unit, in the holding's currency. */
  price: number | null
  /**
   * ISO instant the price was fetched. It is a daily closing price, so it can
   * be a day or more old — show it.
   */
  priceAsOf: string | null
  /** Where the stock trades, as the price API names it. Null for coins. */
  exchange: string | null
}

/**
 * A group's totals, which cover **two different sets of holdings**: `cost`
 * and `costKzt` every holding in the group, the {@link MarketFigures} only
 * the priced ones. So a total's gain is never `value − cost` — use `gain` —
 * and when `unpriced` is above zero the value is partial and must say so.
 * A market figure is null only when nothing in the group is priced.
 */
export interface HoldingCurrencyTotal extends MarketFigures {
  currency: string
  cost: number
  costKzt: number
  /** How many holdings the market figures leave out. */
  unpriced: number
}

/**
 * `GET /investments`, `GET /accounts/{id}/holdings` and the rename endpoint
 * share this shape.
 */
export interface Holdings {
  /** Sorted by ticker, then account name. Positions sold to zero are absent. */
  holdings: Holding[]
  /** Sorted by currency. */
  totalsByCurrency: HoldingCurrencyTotal[]
  totalCostKzt: number
  /** Priced holdings only, like a group's — see {@link HoldingCurrencyTotal}. */
  totalValueKzt: number | null
  totalGainKzt: number | null
  unpriced: number
}

/** KZT per one unit of `currency`, fetched daily. */
export interface MarketRate {
  currency: string
  /** Scale 10 on reads. Not money — it goes through the rate formatter. */
  rateKzt: number
  fetchedAt: string
}

/** What a price refresh did, counted in symbols. */
export interface MarketRefreshResult {
  /** False when the server has no price API key, and nothing was asked. */
  configured: boolean
  updated: number
  /** Already fetched today, so not asked again. */
  upToDate: number
  /** The API had no answer; the old price is kept. */
  failed: number
  /** Skipped because the daily call cap is reached. */
  overBudget: number
}

export type TopicStatus = 'ACTIVE' | 'CLOSED'

/**
 * A topic with its derived totals. Every figure is computed on read and
 * reported in **KZT** via `amountKzt`, so a trip paid partly in another
 * currency is never a sum of mixed currencies.
 */
export interface Topic extends Shareable {
  id: string
  name: string
  description: string | null
  /**
   * Metadata, not a constraint: a deposit paid months earlier or a refund
   * arriving later may still be attached, so `firstTransactionOn` can fall
   * outside this window. Don't render it as if it bounded the spending.
   */
  startDate: string | null
  endDate: string | null
  /** What you expected to spend, in KZT. Display only — nothing alerts. */
  plannedAmount: number | null
  status: TopicStatus
  spent: number
  /** Refunds and money repaid — income attached to the topic. */
  received: number
  /** spent - received: the honest cost. */
  net: number
  /** null when plannedAmount is unset; negative on overspend. */
  remaining: number | null
  transactionCount: number
  /** The real span, often more informative than the declared dates. */
  firstTransactionOn: string | null
  lastTransactionOn: string | null
}

/** `GET /topics/{id}` — the breakdowns reuse the monthly summary's shape. */
export interface TopicDetail {
  topic: Topic
  expenseByCategory: CategorySummary[]
  incomeByCategory: CategorySummary[]
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

export interface Budget extends Shareable {
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

export interface Goal extends Shareable {
  id: string
  name: string
  type: GoalType
  targetAmount: number
  targetDate: string | null
  /** Embedded in full, unlike a transaction's account — no join needed. */
  linkedAccount: AccountSummary
  status: GoalStatus
  /** Clamped 0–100, unlike a budget's percentUsed. */
  progressPercent: number
  achieved: boolean
}

export interface Bill extends Shareable {
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

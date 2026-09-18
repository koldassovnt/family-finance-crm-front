import { request } from './client'
import type {
  Account,
  Bank,
  Bill,
  Budget,
  BudgetPeriod,
  Category,
  Goal,
  LoginResponse,
  MonthlySummary,
  Transaction,
  User,
} from './types'

const V1 = '/api/v1'

export const authApi = {
  /** Exempt from the global 401 redirect — a wrong password renders inline. */
  login: (email: string, password: string) =>
    request<LoginResponse>(`${V1}/auth/login`, {
      method: 'POST',
      body: { email, password },
    }),
}

export const usersApi = {
  /** Re-establishes identity after a reload from a stored token. */
  me: () => request<User>(`${V1}/users/me`),
  create: (body: { email: string; displayName: string; password: string }) =>
    request<User>(`${V1}/users`, { method: 'POST', body }),
  /** 204, and invalidates the token making the call. */
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    request<void>(`${V1}/users/me/password`, { method: 'POST', body }),
}

export const accountsApi = {
  list: () => request<Account[]>(`${V1}/accounts`),
  get: (id: string) => request<Account>(`${V1}/accounts/${id}`),
  create: (body: {
    name: string
    type: Account['type']
    currency: string
    balance: number
    bankId?: string | null
  }) => request<Account>(`${V1}/accounts`, { method: 'POST', body }),
  /** Name and bank only — type, currency and balance are fixed at creation. */
  update: (id: string, body: { name?: string; bankId?: string | null }) =>
    request<Account>(`${V1}/accounts/${id}`, { method: 'PATCH', body }),
  /** 409 while an ACTIVE goal points at it. */
  remove: (id: string) => request<void>(`${V1}/accounts/${id}`, { method: 'DELETE' }),
  /** Writes an ADJUSTMENT for the difference; 400 when nothing drifted. */
  reconcile: (
    id: string,
    body: {
      actualBalance: number
      exchangeRate?: number
      note?: string
      /** Defaults to today in Almaty. */
      occurredOn?: string
    },
  ) => request<Transaction>(`${V1}/accounts/${id}/reconcile`, { method: 'POST', body }),
  /** `from`/`to` required, one year max. A transfer appears for both sides. */
  transactions: (id: string, from: string, to: string) =>
    request<Transaction[]>(`${V1}/accounts/${id}/transactions`, { query: { from, to } }),
}

export const banksApi = {
  list: () => request<Bank[]>(`${V1}/banks`),
  /** Find-or-create by name — safe to call with a name that already exists. */
  findOrCreate: (name: string) => request<Bank>(`${V1}/banks`, { method: 'POST', body: { name } }),
}

export const categoriesApi = {
  /** Flat, with `parentId` — build the tree client-side. */
  list: () => request<Category[]>(`${V1}/categories`),
  create: (body: { name: string; kind: Category['kind']; parentId?: string | null }) =>
    request<Category>(`${V1}/categories`, { method: 'POST', body }),
  update: (id: string, body: { name?: string; parentId?: string | null }) =>
    request<Category>(`${V1}/categories/${id}`, { method: 'PATCH', body }),
  /** 409 with live sub-categories, or while a budget's version is open. */
  remove: (id: string) => request<void>(`${V1}/categories/${id}`, { method: 'DELETE' }),
}

export interface CreateTransactionBody {
  type: Exclude<Transaction['type'], 'ADJUSTMENT'>
  amount: number
  accountId: string
  /** TRANSFER only. */
  toAccountId?: string
  /** Required when the currencies differ, rejected when they match. */
  toAmount?: number
  /** Required when the account isn't KZT; absent or 1 when it is. */
  exchangeRate?: number
  /** Rejected for TRANSFER; must match the type's kind otherwise. */
  categoryId?: string
  occurredOn?: string
  note?: string
}

export const transactionsApi = {
  /** Cross-account list. `from`/`to` required, one year max, newest first. */
  list: (params: { from: string; to: string; accountId?: string; categoryId?: string }) =>
    request<Transaction[]>(`${V1}/transactions`, { query: params }),
  create: (body: CreateTransactionBody) =>
    request<Transaction>(`${V1}/transactions`, { method: 'POST', body }),
  /** Amount, rate, date, category and note only. */
  update: (
    id: string,
    body: {
      amount?: number
      exchangeRate?: number
      occurredOn?: string
      categoryId?: string | null
      note?: string | null
    },
  ) => request<Transaction>(`${V1}/transactions/${id}`, { method: 'PATCH', body }),
  /** Soft delete, but it reverses the balance effect — confirm first. */
  remove: (id: string) => request<void>(`${V1}/transactions/${id}`, { method: 'DELETE' }),
  /** Always KZT; TRANSFER and ADJUSTMENT excluded. */
  summary: (month: string) =>
    request<MonthlySummary>(`${V1}/transactions/summary`, { query: { month } }),
}

export const budgetsApi = {
  /** Defaults to the current month; a future month is rejected. */
  list: (month?: string) => request<Budget[]>(`${V1}/budgets`, { query: { month } }),
  /** `period` is required by the API even though MONTHLY is the only value. */
  create: (body: {
    categoryId: string
    limitAmount: number
    period: BudgetPeriod
    alertThresholdPercent?: number
  }) => request<Budget>(`${V1}/budgets`, { method: 'POST', body }),
  /** Takes effect from this month onward; past months keep their limit. */
  update: (id: string, body: { limitAmount?: number; alertThresholdPercent?: number | null }) =>
    request<Budget>(`${V1}/budgets/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => request<void>(`${V1}/budgets/${id}`, { method: 'DELETE' }),
}

export const goalsApi = {
  /** Returns every status — filter client-side. */
  list: () => request<Goal[]>(`${V1}/goals`),
  create: (body: {
    name: string
    type: Goal['type']
    targetAmount: number
    linkedAccountId: string
    targetDate?: string | null
  }) => request<Goal>(`${V1}/goals`, { method: 'POST', body }),
  /** The linked account is fixed once set. */
  update: (
    id: string,
    body: {
      name?: string
      targetAmount?: number
      targetDate?: string | null
      status?: Goal['status']
    },
  ) => request<Goal>(`${V1}/goals/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => request<void>(`${V1}/goals/${id}`, { method: 'DELETE' }),
}

export const billsApi = {
  /** The filters are independent and AND together; omit both for everything. */
  list: (params: { month?: string; unpaid?: boolean } = {}) =>
    request<Bill[]>(`${V1}/bills`, { query: params }),
  create: (body: { name: string; amount: number; currency: string; dueDate: string }) =>
    request<Bill>(`${V1}/bills`, { method: 'POST', body }),
  /** Day-of-month overflow clamps to the month's last day. Capped at 120 rows. */
  createBatch: (body: {
    name: string
    amount: number
    currency: string
    dayOfMonth: number
    startMonth: string
    endMonth: string
  }) => request<Bill[]>(`${V1}/bills/batch`, { method: 'POST', body }),
  update: (
    id: string,
    body: {
      name?: string
      amount?: number
      currency?: string
      dueDate?: string
      isPaid?: boolean
    },
  ) => request<Bill>(`${V1}/bills/${id}`, { method: 'PATCH', body }),
  remove: (id: string) => request<void>(`${V1}/bills/${id}`, { method: 'DELETE' }),
  removeBatch: (batchId: string) =>
    request<void>(`${V1}/bills/batch/${batchId}`, { method: 'DELETE' }),
}

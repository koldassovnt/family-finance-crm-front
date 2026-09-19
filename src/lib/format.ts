/**
 * Display and parse helpers. Every rule here comes from
 * `.claude/requirements/00-architecture-and-foundations.md` — change it there
 * first.
 */

export const APP_TIME_ZONE = 'Asia/Almaty'

const moneyFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

/**
 * Money always displays with exactly two decimals: 45000.0000 -> «45 000,00».
 * Never used for `exchangeRate` (scale 6) or percentages.
 */
export function formatMoney(value: number): string {
  return moneyFormatter.format(value)
}

/** Money plus its currency symbol, e.g. «45 000,00 ₸». */
export function formatMoneyWithCurrency(value: number, currency: string): string {
  return `${formatMoney(value)} ${currencySymbol(currency)}`
}

export function currencySymbol(currency: string): string {
  switch (currency) {
    case 'KZT':
      return '₸'
    case 'USD':
      return '$'
    case 'EUR':
      return '€'
    case 'RUB':
      return '₽'
    default:
      return currency
  }
}

/**
 * An exchange rate keeps its own precision — at two decimals a rate like
 * 0.004821 would render as «0,00», which is wrong rather than rounded.
 */
export function formatExchangeRate(value: number): string {
  return new Intl.NumberFormat('ru-RU', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  }).format(value)
}

/**
 * Percentages are not money and never go through the money formatter.
 *
 * One decimal, trailing zero trimmed: «125 %», «85,5 %». Rounding to whole
 * numbers would print «100 %» for a budget at 99.6% — the exact figure that
 * turns the bar red — so a budget would look overspent while it isn't.
 */
export function formatPercent(value: number): string {
  return `${new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value)} %`
}

/**
 * Accepts what a Russian-speaking user actually types or pastes back:
 * «45 000,50», "45000.50", "45 000,50" with U+00A0 from our own formatter.
 * Returns NaN for anything that isn't a number — callers validate.
 *
 * `parseFloat('45 000,50')` returns 45 silently, which is why this exists.
 */
export function parseMoney(input: string): number {
  const normalized = input
    .replace(/[\s  ]/g, '')
    .replace(',', '.')
    .trim()
  if (normalized === '' || !/^-?\d*\.?\d*$/.test(normalized)) return Number.NaN
  return Number(normalized)
}

const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: APP_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Today in Almaty as `yyyy-MM-dd`, which is also the wire format.
 * The browser clock is off by a day for part of every day elsewhere, and the
 * backend rejects the resulting future date.
 */
export function todayInAlmaty(): string {
  return isoDateFormatter.format(new Date())
}

/** The current `yyyy-MM` in Almaty — the default month for dashboard/budgets. */
export function currentMonthInAlmaty(): string {
  return todayInAlmaty().slice(0, 7)
}

/** ISO `yyyy-MM-dd` -> display `dd.MM.yyyy`. Wire format stays ISO. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}.${month}.${year}`
}

/** `yyyy-MM` -> «сентябрь 2026», for month selectors and headings. */
export function formatMonth(month: string): string {
  const [year, monthNumber] = month.split('-')
  const date = new Date(Date.UTC(Number(year), Number(monthNumber) - 1, 1))
  return new Intl.DateTimeFormat('ru-RU', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

/** Shifts a `yyyy-MM` by whole months. Negative goes back. */
export function addMonths(month: string, delta: number): string {
  const [year, monthNumber] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

/** True when `month` is after the current Almaty month — the API rejects those. */
export function isFutureMonth(month: string): boolean {
  return month > currentMonthInAlmaty()
}

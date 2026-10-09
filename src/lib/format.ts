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

/**
 * Money that is a change rather than an amount — a gain or a loss — so a
 * positive figure carries its «+». A loss already has its minus from the
 * formatter; zero is left bare, being neither.
 */
export function formatSignedMoneyWithCurrency(value: number, currency: string): string {
  return `${value > 0 ? '+' : ''}${formatMoneyWithCurrency(value, currency)}`
}

/** The backend stores money as NUMERIC(19,4). */
const MONEY_SCALE = 10_000

/**
 * Sums amounts in one currency exactly. Float addition drifts
 * (0.1 + 0.2 = 0.30000000000000004), and a drift that lands on a half-kopeck
 * boundary flips the last displayed digit. Summing in whole ten-thousandths
 * keeps the result what the database would add up to.
 */
export function sumMoney(values: number[]): number {
  return values.reduce((sum, value) => sum + Math.round(value * MONEY_SCALE), 0) / MONEY_SCALE
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

const quantityFormatter = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 10 })

/**
 * How many units of an instrument — shares or coins. Not money: a crypto
 * position is routinely 0.00041 of a coin, which the money formatter would
 * print as «0,00». Up to the 10 decimals the backend stores, with trailing
 * zeros dropped, so a read's `2.0000000000` is «2».
 */
export function formatQuantity(value: number): string {
  return quantityFormatter.format(value)
}

const unitPriceFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 10,
})

/**
 * A price per unit exactly as it was entered on a trade. Two decimals at
 * least, so it reads as a price, but never rounded: a coin bought at 0.000012
 * is not «0,00», and showing a typed 100.125 as «100,13» would misquote the
 * trade.
 */
export function formatUnitPrice(value: number): string {
  return unitPriceFormatter.format(value)
}

/**
 * A quantity or unit price as text for an input, to its full 10 decimals with
 * the trailing zeros dropped. `String(0.00000041)` is "4.1e-7", which
 * {@link parseMoney} rightly refuses — so an edit form seeded that way would
 * hold a value it cannot read back.
 */
export function toPlainDecimal(value: number): string {
  return value.toFixed(10).replace(/\.?0+$/, '')
}

const smallAveragePriceFormatter = new Intl.NumberFormat('ru-RU', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 8,
})

/**
 * An average price paid, which the server derives rather than echoes — so,
 * unlike {@link formatUnitPrice}, it is rounded. Dividing a cost held at four
 * decimals by a tiny quantity gives 61000.4965 for a single purchase typed at
 * 61000.5; at two decimals that reads «61 000,50» again. Below 1 the extra
 * decimals are the price itself, so they stay.
 */
export function formatAveragePrice(value: number): string {
  return Math.abs(value) >= 1 ? formatMoney(value) : smallAveragePriceFormatter.format(value)
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

/**
 * An ISO-8601 *instant* -> the Almaty calendar date it fell on, `dd.MM.yyyy`.
 *
 * Separate from {@link formatDate}, which takes a `yyyy-MM-dd` and splits on
 * the dashes — handing it an instant yields «19T20:12:20.123Z.09.2026». Most
 * dates in this app are already plain dates; `sharedAt` is a timestamp.
 */
export function formatInstantDate(instant: string): string {
  return formatDate(isoDateFormatter.format(new Date(instant)))
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

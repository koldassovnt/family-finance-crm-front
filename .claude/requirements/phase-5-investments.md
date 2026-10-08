# Phase 5 — Investments

Status: **built**. See `00-architecture-and-foundations.md` for the stack,
formatting rules, auth and error contract this builds on. The backend spec is
`.claude/requirements/phase-5-investments.md` in its repo (main `3d4da41`).

Broker and crypto accounts hold positions. A position is not stored: it is
derived from **trades**, which are ordinary ledger rows of a new type. This
phase adds the trade to the operation form, and a page that lists what is held.

## Everything is cost, not value

**No figure in this phase is a valuation.** There is no price feed, so the
backend reports what was *paid* for the units still held. Never label anything
«стоимость» in the sense of worth, «оценка» or «прибыль»: the wording is
«Вложено» and «Средняя цена покупки», and the page states in a line that these
are purchase prices. Current prices from external APIs are a later phase; when
they arrive they are new columns, not a relabelling of these.

## Accounts

- `CRYPTO` joins `CASH`, `BANK`, `DEPOSIT`, `BROKER`. It behaves like `BROKER`;
  the bank is optional. `isInvestmentAccount()` in `lib/accounts.ts` is the one
  place that says which types hold positions.
- **Currencies are still exactly three letters**, so a stablecoin account is
  `USD`. There is no instrument currency either: a EUR stock is bought from a
  EUR broker account, and a trade's price is in the account's currency.

## Trades in the operation form

- **On a broker or crypto account the form offers two types only: «Сделка» and
  «Перевод».** This is a frontend rule — the backend still accepts
  `INCOME`/`EXPENSE` there — so nothing server-side enforces it.
- The account field sits **above** the type, because it decides which types
  exist. Choosing an account corrects a stranded type: income/expense becomes a
  trade on an investment account, a trade becomes an expense anywhere else.
- A transfer works exactly as before, including into and out of these accounts.
- A trade's fields: side (Buy / Sell), ticker, quantity, price per unit, the KZT
  rate, date, note. **The kind of asset — stock, ETF, bond, coin — goes in the
  note**; there is no asset-class field, and the note's hint says so.
- **No amount input.** `amount` is derived server-side as
  `quantity × unitPrice` (rounded to 4 decimals) and *sending it is a 400*. The
  form shows the product as a hint, formatted as money, and sends the factors.
- `toAccountId`, `toAmount`, `categoryId`, `topicId` are rejected on a trade,
  and the four trade fields are rejected on anything else — hence
  `CreateTradeBody` is its own type rather than optional fields on the other.
- `exchangeRate` follows the existing rule unchanged: required for a non-KZT
  account, absent or 1 for KZT. It applies to an `OPENING` too.
- Ticker: trimmed and uppercased by the server, 32 characters at most. Quantity
  and price: above zero, **at most 10 decimal places** — counted on the typed
  text, since a float cannot say how many digits were entered.
- **Quantities are fractional.** Parse them with `parseMoney` (it is a decimal
  parser, not a rounding one) and display them with `formatQuantity`, never the
  money formatter: at two decimals 0.00041 BTC is «0,00».
- A `SELL` of more than the account holds is a 400 on `quantity`. The form does
  not pre-check it — that would need the holdings as of the trade's date and
  would still race the ledger.

## «Добавить имеющийся актив» — the `OPENING` side

`OPENING` means "I already own this": it counts toward the holding at the price
entered and **moves no cash**. One per ticker per account, with the quantity
held and the average price paid; the date may be any past date.

**It has its own button and is never a third option beside Buy and Sell.** It is
how a portfolio that predates the app gets in at all, and next to Buy it would
read as one more kind of deal. It reuses the operation form with the type and
side pickers removed and the labels changed to «Количество в наличии» and
«Средняя цена покупки».

## Trades in the ledger

- `TRADE` rows appear in `GET /transactions` and
  `GET /accounts/{id}/transactions`, so anything indexed by transaction type
  needs a `TRADE` entry.
- A row is titled by side and ticker — «Покупка VOO» — with
  «2 × 100,00 $» beneath. «Сделка» alone says nothing.
- Sign follows the account's cash: `BUY` is «−», `SELL` is «+». **Not coloured**
  like income and expense — a trade is neither, and the monthly summary, budgets
  and topics ignore it entirely. An `OPENING` is muted and unsigned.
- `quantity` and `unitPrice` come back with up to 10 decimals
  (`1.0000000000`). `formatUnitPrice` shows a typed price unrounded;
  `formatAveragePrice` rounds the derived average (see below).

## Editing and deleting a trade

- `PATCH` accepts `ticker`, `quantity`, `unitPrice`, `exchangeRate`,
  `occurredOn`, `note`. **`amount` is a 400.** Side, type and account are
  immutable — delete and recreate.
- Seed the inputs with `toPlainDecimal`, not `String()`: a small quantity
  stringifies as `4.1e-7`, which `parseMoney` refuses.
- `DELETE` reverses the cash and the holdings recompute. Confirm first, as for
  every transaction, and say that the position changes too.
- **New failure: 409 `CONFLICT`** when an edit or delete would leave more of a
  ticker sold than bought. No `fieldErrors`. Branch on the code and show
  «…Сначала исправьте или удалите продажу» — the server's message is English.

## `/investments`

- `GET /api/v1/investments` — everything held across the caller's **own**
  accounts. No parameters. **Never includes accounts shared with them**, which
  is the sharing rule that nothing shared enters your own figures.
- One row per ticker **per account** — the same ticker in two accounts is two
  rows, so the React key is ticker plus account id. Sorted by ticker, then
  account name; keep the server's order.
- Columns: ticker (account beneath, linking to it), quantity, average price
  paid, cost. The last two show the KZT figure beneath when the account isn't
  KZT.
- **Grouped by currency under that currency's total**, KZT first — the same
  arrangement as `/accounts`, and for the same reason.
- **Totals come from `totalsByCurrency` and `totalCostKzt`; never re-add them.**
  The KZT ones cannot be re-derived anyway: `costKzt` and `averagePriceKzt` use
  each purchase's own rate, so they are sums of conversions, not a product of
  anything on screen.
- Positions sold down to zero are not listed.
- `averagePrice` is derived, so with a tiny quantity it can differ from the
  typed price in the last decimals — 61000.4965 for a typed 61000.5. Round it:
  two decimals from 1 upward, up to eight below 1 where the decimals are the
  price.
- With no broker or crypto account, both buttons are disabled and the page says
  to create one first.

## Holdings on an account page

`GET /api/v1/accounts/{id}/holdings` has the same response shape and is shown on
`/accounts/:id` for a `BROKER` or `CRYPTO` account. **It is readable by a viewer
of a shared account** (404 otherwise, like the account itself), so a shared
broker account shows its assets there while staying out of the viewer's own
`/investments`. Empty lists for an account with no trades.

## Not in this phase

- Current prices, valuation, unrealized gain or loss, allocation charts — all
  wait for a price source.
- Net worth (phase 6) stays parked.

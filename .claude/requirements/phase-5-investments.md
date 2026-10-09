# Phase 5 — Investments

Status: **built**. See `00-architecture-and-foundations.md` for the stack,
formatting rules, auth and error contract this builds on. The backend spec is
`.claude/requirements/phase-5-investments.md` in its repo (main `3d4da41`).

Broker and crypto accounts hold positions. A position is not stored: it is
derived from **trades**, which are ordinary ledger rows of a new type. This
phase adds the trade to the operation form, and a page that lists what is held.

## Cost and market figures are two things

**Cost** — «Средняя цена покупки», «Вложено» — is what was paid for the units
still held. It is always present.

**Market** — «Текущая цена», «Стоимость», «Прибыль» — arrived with the backend
follow-up (main `559312f`) and comes from a daily closing price. **Every market
field is nullable**, and an unpriced holding is the normal state, not an error:
the provider does not cover KASE, so everything in a KZT broker account stays
cost-only by the owner's decision. Render «нет цены» and dashes, **never 0** —
an unpriced holding is not a worthless one.

They are separate columns and neither is relabelled as the other. An earlier
version of this doc forbade the word «стоимость» entirely, because there was no
price feed then; that rule is gone, the distinction is not.

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
- Ticker: trimmed and uppercased by the server, and held to a format that
  depends on the account — see "Ticker format" below.
- Quantity and price: above zero, **at most 10 decimal places** — counted on
  the typed text, since a float cannot say how many digits were entered.
- **The rate field is pre-filled** from `GET /market-data/rates` when an account
  is picked, as a suggestion only: it is the latest daily rate, not the bank's
  and not a back-dated entry's. It fills an empty field, or replaces the
  previous account's suggestion, and never overwrites a typed rate. The list is
  empty until the server's first refresh, and the form works without it.
- **Quantities are fractional.** Parse them with `parseMoney` (it is a decimal
  parser, not a rounding one) and display them with `formatQuantity`, never the
  money formatter: at two decimals 0.00041 BTC is «0,00».
- A `SELL` of more than the account holds is a 400 on `quantity`. The form does
  not pre-check it — that would need the holdings as of the trade's date and
  would still race the ledger.

## Ticker format

The owner asked for this on both sides; the backend answers 400 on `ticker`
otherwise. The format is what lets the server find a price, so it follows where
the asset is quoted. `lib/tickers.ts` is the one place it lives. Validate after
trimming and uppercasing, as the server does.

| Account | Format | Example | Regex |
|---|---|---|---|
| `CRYPTO` | pair quoted in the **account's** currency | `TON/USD` | `^[A-Z0-9]{1,20}/[A-Z]{3}$` |
| `BROKER`, not KZT | symbol with its exchange | `VEA.US` | `^[A-Z0-9^-]{1,20}\.[A-Z]{1,6}$` |
| `BROKER`, KZT | the plain ticker | `HSBK` | `^[A-Z0-9]{1,20}$` |

- A crypto pair quoted in another currency is its own error, worded apart from
  a malformed one.
- The input's placeholder is the example for the selected account.
- It applies to a new trade, to a `PATCH` of a trade's ticker, and to a rename.
- **On edit, judge the ticker only when it changed.** A trade recorded before
  the format existed keeps a ticker that would now fail, and the server checks
  the field only when it is sent — fixing such a trade's date must not be
  blocked by a ticker nobody touched.

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
- Columns: ticker (account and exchange beneath), quantity, average price paid,
  cost, current price (with the date it was fetched — a daily close can be a
  day or more old), value, gain. Money columns show the KZT figure beneath when
  the account isn't KZT. `exchange` is display only, and null for coins.
- Gain is signed and coloured; `gainKzt` reflects the exchange rate moving as
  well as the price, so it can disagree in sign with `gain`.
- `valueKzt` can be null on its own, when only the latest KZT rate is missing.
- **Grouped by currency under that currency's total**, KZT first — the same
  arrangement as `/accounts`, and for the same reason.
- **Totals come from the response; never re-derive them.** The KZT cost ones
  cannot be anyway: `costKzt` and `averagePriceKzt` use each purchase's own
  rate, so they are sums of conversions, not a product of anything on screen.
- **A total covers two different sets of holdings.** `cost`/`costKzt` cover
  every holding in the group; `value`/`valueKzt`/`gain`/`gainKzt` only the
  priced ones, and `unpriced` counts what they leave out. So **never compute a
  total's gain as value − cost** — use `gain`. When `unpriced > 0` the value is
  partial and says so beside itself. A market total is null only when nothing
  in the group is priced. The same holds for `totalValueKzt`, `totalGainKzt`
  and the top-level `unpriced`.
- **«Обновить цены»** — `POST /market-data/refresh`, no body. Safe to repeat:
  what was fetched today is not asked again, and the server refreshes by itself
  daily at 08:00 Almaty. The toast reports the four counts (updated, already
  current, no answer, skipped over the daily cap). `configured: false` means
  the server has no API key — say that instead of showing four zeros.
- **Attribution is required**: a «Цены предоставлены API Ninjas» link to
  api-ninjas.com stays on the page. It is a condition of the free plan.
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

## Renaming a ticker

`POST /api/v1/accounts/{id}/holdings/rename` with `{from, to}`, for an asset
that changed its name — the owner's case was TON becoming GRAM. It rewrites the
ticker on every trade of it in that account in one step and returns the
account's holdings.

- An action on a holding row, on both `/investments` and the account page.
  **Owner only** — a viewer gets 404 — so the action is absent for a viewer.
- `to` must satisfy the account's ticker format. `from` is the row clicked,
  never an input.
- 400 on `from` when it is not traded in the account; **409 when `to` already
  is** — a rename cannot merge two tickers. No `fieldErrors` on the 409.
- The renamed holding has no price until the next refresh; the dialog says so.
- It changes ledger rows, so the transaction queries are invalidated too.

## Not in this phase

- Allocation charts — there is still no asset-class field.
- Net worth (phase 6) stays parked.

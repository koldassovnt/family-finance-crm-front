# Phase 0 + 1 — Foundation & Ledger

Accounts, transactions, reconcile and the monthly summary.

## Built

- **Accounts list** (`/accounts`) — balances in each account's own currency,
  no combined total, negatives in red. (`45ee260`)
- **Monthly summary**, on the dashboard rather than its own route: income,
  expense, net, and spending by category. (`ba410e4`)

## Decisions worth remembering

- **The summary lives on the dashboard.** It is one call and it is exactly the
  "this month at a glance" the dashboard is specified as. A separate reports
  page only earns its place with Phase 6's export, which is out of scope.
- **Balances are never summed across currencies.** Converting one would need a
  current rate, which the backend deliberately doesn't store.
- **Spending by category is a sorted horizontal bar, not a donut** — the job is
  ranking magnitudes, and Russian category names are long. One series, one hue,
  no legend; the hue is validated against both light and dark surfaces.

## Open

- Account detail (`/accounts/:id`) — history with a required date range, and
  the reconcile action.
- Add/edit account form, including the pick-or-create bank combobox.
- **Transaction entry form** — the most involved screen in this phase:
  fields change by type, `toAmount` appears only on a cross-currency transfer
  and is rejected when currencies match, `exchangeRate` is mandatory for a
  non-KZT account, the category picker filters by the type's kind, and
  transfers carry no category at all.
- Transactions list (`/transactions`) — needs the account join and the
  «Удалённый счёт» fallback for soft-deleted accounts.
- Editing is restricted to amount, rate, date, category and note; deleting
  reverses the balance and needs a confirm dialog.

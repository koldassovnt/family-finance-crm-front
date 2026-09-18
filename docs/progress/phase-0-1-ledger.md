# Phase 0 + 1 — Foundation & Ledger

Accounts, transactions, reconcile and the monthly summary.

## Built

- **Accounts list** (`/accounts`) — balances in each account's own currency,
  no combined total, negatives in red. (`45ee260`)
- **Monthly summary**, on the dashboard rather than its own route: income,
  expense, net, and spending by category. (`ba410e4`)
- **Transactions list** (`/transactions`) — a mandatory date range, filters by
  account and category, the account join with its «Удалённый счёт» fallback,
  and amounts shown in their own currency with the KZT figure beneath when
  they differ.
- **Transaction entry form** — type-dependent fields, with `toAmount` and
  `exchangeRate` appearing only when the backend actually requires them.
- **Account detail** (`/accounts/:id`) — the account, its history over a
  required date range, and the reconcile action.

## Decisions worth remembering

- **The summary lives on the dashboard.** It is one call and it is exactly the
  "this month at a glance" the dashboard is specified as. A separate reports
  page only earns its place with Phase 6's export, which is out of scope.
- **Balances are never summed across currencies.** Converting one would need a
  current rate, which the backend deliberately doesn't store.
- **Spending by category is a sorted horizontal bar, not a donut** — the job is
  ranking magnitudes, and Russian category names are long. One series, one hue,
  no legend; the hue is validated against both light and dark surfaces.

## Verified against the running backend

- The deleted-account fallback, against a soft-deleted account seeded with
  history: both referencing rows render, including the harder transfer case
  where one side falls back and the other resolves («Удалённый счёт → Каспи
  Голд»). The expense on the deleted account still shows its category, so the
  embedded-category vs ids-only-account asymmetry is visible in one screen.
- The range guard: an over-long window is caught before the request rather
  than after a 400.
- Account history returns transfers on **both** sides: «Каспи Голд» shows the
  incoming transfer from the soft-deleted account, so the page names both ends
  rather than assuming the viewed account is the source.

## Open

- Add/edit account form, including the pick-or-create bank combobox.
- Editing an existing transaction: amount, rate, date, category and note only.
  `amountKzt` re-derives from the post-update state, so amount and rate can be
  corrected together. ⚠ **`toAmount` is not patchable**, so editing the amount
  of a cross-currency transfer would move the source side only and leave the
  two sides implying a rate that no longer holds — decided: hide the amount
  field there and direct to delete-and-recreate.
- Deleting a transaction reverses the balance and needs a confirm dialog.

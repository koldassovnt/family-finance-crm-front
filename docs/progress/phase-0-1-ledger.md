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
- **Transaction edit and delete**, including the cross-currency transfer case
  where both amounts travel together.

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
- `PATCH /transactions` enforces the cross-currency rule: changing `amount`
  alone on a cross-currency transfer is a 400 demanding `toAmount`, and
  `toAmount` on a non-cross-currency row is a 400. Both key their
  `fieldErrors` to `toAmount`, so they land on the right input. Confirmed
  against the running API with requests that mutate nothing.
- Account history returns transfers on **both** sides: «Каспи Голд» shows the
  incoming transfer from the soft-deleted account, so the page names both ends
  rather than assuming the viewed account is the source.

## Open

- The add/edit **account** form, including the pick-or-create bank combobox.
  This is the last piece of the phase.

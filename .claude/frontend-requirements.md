# Frontend Requirements — Family Finance CRM (React)

**Everything about the backend — the requirements docs and the source — lives
in a different repo, with no link from this one:**
`/Users/rockettech/IdeaProjects/personal/family-finance-crm`
(`git@github.com:koldassovnt/family-finance-crm.git`).

- Companion requirements: its `.claude/requirements/` (start with
  `00-architecture-and-foundations.md`). The phases below map directly onto
  that folder's phase docs. *These briefly lived in this repo and were moved
  back — this doc is the only requirements file the frontend repo owns.*
- **The source is the authoritative contract.** When a response shape is in
  question, read the DTOs at `src/main/kotlin/com/familyfinance/crm/dto/` —
  they carry KDoc explaining intent and outrank both this doc and the
  requirements folder. `service/*Impl.kt` answers "what blocks this action"
  questions. Every API fact below was verified against that source, not
  inferred.

**Backend status: Phases 0/1, 2 and 4 are built and running.** The API below
is what the code actually exposes, not a plan. Verify against
`/swagger-ui.html` (the running app documents every endpoint) before assuming
a shape. The backend runs in Docker on port 8080 by default, CORS allows all
origins, and auth is a bearer token, so a Vite dev server on another port
works with no proxy.

## Tech Stack

- **React + TypeScript** (confirmed — type safety matching the Kotlin backend)
- Vite as the build tool
- React Router for navigation
- TanStack Query (React Query) for server state / API data fetching, rather
  than hand-rolled `useEffect` fetch logic
- **Recharts** for spending-by-category and budget-usage charts
- **Tailwind CSS + shadcn/ui** — form-and-table-heavy app; shadcn provides
  accessible date pickers, dialogs, tables, and form controls, copied into
  the repo rather than imported so they stay restylable
- **react-hook-form + zod** for form state and validation — zod schemas can
  mirror the backend's validation rules (amount > 0, no future dates) so
  errors surface before a request is sent

All confirmed, not placeholders.

## Language & Formatting

- **UI is Russian only.** No i18n library — but keep every user-facing string
  in a single module (e.g. `src/strings.ts`) rather than inline in JSX, so
  adding a second language later is a swap, not a rewrite.
- **Dates: `dd.MM.yyyy`** for display; ISO (`yyyy-MM-dd`) on the wire.
- **Numbers:** space as the thousands separator, comma as the decimal
  separator (`45 000,50`), matching Russian convention.
- **Money always displays with exactly two decimals — always two, never "up to
  two".** `45000.0000` → «45 000,00», `9900.0000` → «9 900,00», and a bare
  `45000` echoed by a write response → «45 000,00». No trimmed trailing zeros,
  no bare integers, so columns of amounts align on the decimal separator. This
  also makes the read-vs-write scale inconsistency (see API Integration
  Conventions) invisible to the user, which is the cheapest way to handle it.
    - **Display only.** Send the API whatever the user typed — it stores
      `numeric(19,4)` and accepts a number or a numeric string. Never round
      before a request; two decimals is what a person reads, not what the client
      transmits.
    - Applies to every money field on every screen: account balances (negative
      ones in red), transaction `amount`/`toAmount`/`amountKzt`, budget
      `limitAmount`/`spent`/`remaining`, goal `targetAmount`, bill `amount`, and
      the monthly-summary totals and per-category rows.
    - **Two exclusions. The first is settled, don't revisit it.**
      `exchangeRate` is scale 6 and is not money:
      a rate of `0.004821` would render as «0,00», which is wrong rather than
      merely rounded — show it at its own precision. `percentUsed` and
      `progressPercent` are percentages, not money, and must not go through the
      money formatter; render them at **one decimal with the trailing zero
      trimmed** («125 %», «85,5 %»). Not whole numbers: 99.6 would round to
      «100 %», the exact figure that turns a budget bar red, so a budget would
      read as overspent while it isn't.
    - **One shared formatter, used by every screen** — this rule lives in one
      module, not reimplemented per component. `Intl.NumberFormat('ru-RU', {
      minimumFractionDigits: 2, maximumFractionDigits: 2 })` gives the right
      output; note its group separator is U+00A0, not an ASCII space, so any
      test asserting on formatted text must use the same character.
    - **Money *inputs* need the matching parser, and it is not symmetric with
      the formatter.** A person typing Russian-style will enter `45 000,50`, and
      a user who has just read «45 000,00» on screen may paste it straight back
      in. Normalize before zod sees the value: strip spaces including U+00A0,
      convert the decimal comma to a dot. Accept a dot too — nobody should be
      corrected for typing `45000.50`. This is a parse step, not a validation
      rule; `parseFloat("45 000,50")` returns `45`, silently, which is the worst
      possible failure for a money field.
- **Currency:** render each account's own currency; `₸` for KZT. The client
  never converts — the one place a figure changes currency is the backend's own
  KZT aggregates (`amountKzt`, summary and budget totals), which are labelled
  KZT. See API Integration Conventions.
- **Timezone is `Asia/Almaty`,** fixed. "Today" in a date picker should mean
  today in Almaty even if the browser is set elsewhere.
    - Compute it explicitly rather than from the browser clock:
      `new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(new Date())`
      yields `yyyy-MM-dd` directly, which is also the wire format. Use that one
      helper for the default `occurredOn`, the future-date cap, the current
      month for the dashboard and `/budgets` selectors, and anywhere else
      "today" is needed. A `new Date()` in another timezone is off by a day for
      part of every day, and the backend will reject the resulting future date
      while the UI insists it is today.

## Architecture

- A single-page app talking to the backend REST API at a configurable base
  URL (e.g. `VITE_API_BASE_URL` env var).
- One central API client wrapping requests: attaches the auth header,
  handles errors consistently, and is the only place that knows the base URL
  and auth scheme.
- **Auth: JWT**, a single 30-day token with no refresh flow (see
  `00-architecture-and-foundations.md`). Attach it as a bearer token in the
  central API client.
    - **Store it in `localStorage`, not memory** — with a 30-day token the
      whole point is not logging in on every page refresh, and in-memory
      storage throws that away. (The usual XSS objection applies, but this is a
      self-hosted home app, not a public target.)
    - **On any 401: clear the token and redirect straight to login.** No
      re-auth modal, no preserving in-progress page state.
    - **Exempt `POST /api/v1/auth/login` from that rule.** A wrong password is a
      401, so the blanket handler would "redirect to login" the login page
      itself — the form appears to reset with no error shown, and the user
      cannot tell a typo from an outage. The login call handles its own 401 and
      renders an inline message instead. This is the one endpoint that opts out.
    - Logout is purely client-side (drop the token); there's no server-side
      revocation — **except** a password change, which invalidates every token
      issued before it, including the one making the call. After
      `POST /api/v1/users/me/password` succeeds (204), drop the token and send
      the user back to login; don't try to keep the session alive.
    - `POST /api/v1/auth/login` returns `{token, expiresAt, user}` — store
      `expiresAt` too, so the UI can warn before a 30-day token lapses instead
      of discovering it through a 401 mid-action.
    - **Role comes from the API, never from decoding the JWT.** `user` is
      `{id, email, displayName, role}` with role `OWNER` or `MEMBER`, and
      `GET /api/v1/users/me` returns the same shape for a client that has a
      stored token but no user in memory after a reload — so identity is
      re-fetchable and doesn't have to be persisted alongside the token. The
      token does carry `sub`, `email`, `role`, `iat` and `exp`, but a
      client-side decode is unverified and carries no display name: fine for
      hiding a nav item, never a security boundary. The server enforces
      `OWNER` on user creation regardless.
- **All endpoints are under `/api/v1/`.**
- **Error handling contract:** every failure returns
  `{code, message, fieldErrors}`. Map `fieldErrors` onto the matching form
  inputs via react-hook-form's `setError`; fall back to a toast showing
  `message` when there are none. Branch on `code`, never on `message` text.
  The full set as built: `VALIDATION_FAILED`, `UNAUTHENTICATED`, `FORBIDDEN`,
  `NOT_FOUND`, `CONFLICT`, `CURRENCY_MISMATCH`, `DUPLICATE_BUDGET`,
  `INTERNAL_ERROR`.
- **PATCH bodies distinguish absent from `null`.** Every update endpoint
  treats a missing key as "leave unchanged" and an explicit `null` as "clear
  this". So the API client must **omit** untouched fields rather than send
  `null` for them — a `JSON.stringify` of a full form object will wipe the
  category off a transaction, the bank off an account, the target date off a
  goal, or a budget's alert threshold. Nullable-clearable fields today:
  `categoryId` and `note` (transaction), `bankId` (account), `parentId`
  (category), `targetDate` (goal), `alertThresholdPercent` (budget).

## Navigation & Routes

Dashboard home, then a page per entity. The dashboard is the daily-use
screen; everything else is drill-down.

| Route              | Purpose                                                          |
|--------------------|------------------------------------------------------------------|
| `/login`           | email + password                                                 |
| `/`                | **Dashboard** — this month at a glance: account balances, spend vs. income, budget progress bars, bills due or overdue soon |
| `/accounts`        | account list with balances                                       |
| `/accounts/:id`    | account detail + its transaction history + reconcile action      |
| `/transactions`    | all transactions, filterable by date range, account, category — backed by `GET /api/v1/transactions`; see the section below |
| `/budgets`         | budgets with usage bars                                          |
| `/goals`           | goal cards with progress                                         |
| `/bills`           | month calendar + batch-create                                    |
| `/settings/categories` | category management (tree)                                   |
| `/settings/password` | change your own password — `POST /api/v1/users/me/password`, any role |
| `/settings/users`  | `OWNER` only — create additional users (unused while single-user). Create-only: `GET /api/v1/users/me` returns just the caller and there is no list-users endpoint, so don't design a user table |

Charts (Recharts) appear on the dashboard and `/budgets`: spending by
category for the month, and budget usage vs. limit. Deliberately few —
the parked net-worth trend was the chart-heavy part.

### The cross-account transaction list

**Decided and built:** `GET /api/v1/transactions?from=&to=` returns every
account's transactions in one call, newest first, with optional `accountId`
and `categoryId` filters. `from` and `to` are **required** and the range is
**capped at one year** — nothing is paginated, so the date range is what
bounds the page. An `accountId` matches **either side** of a transfer, the
same as the per-account endpoint, and an id that isn't yours is a 404 rather
than an empty list, so a bad filter is visible instead of looking like "no
results".

Build the page against this endpoint — don't fan out over accounts
client-side, which would double-count transfers. `GET /api/v1/accounts/{id}/transactions`
still exists with the same window and stays the right call for the account
detail page.

The date-range pickers are mandatory: an unbounded "all transactions" view is
not something the API can serve.

## Pages / Views, by Phase

### Phase 0 + 1 — Foundation & Ledger
- Login screen
- Accounts list + account detail
- Add/edit account form. Account types as built: `CASH`, `BANK`, `DEPOSIT`,
  `BROKER` (no card/loan/mortgage types). `CASH` has no bank; every other type
  takes an optional bank picked from `GET /api/v1/banks`, which is a global
  list — `POST /api/v1/banks` is find-or-create by name, so a combobox that
  creates on the fly is the right control. Only `name` and `bankId` are
  editable afterwards: type, currency and balance are fixed at creation, and
  the balance moves only through transactions.
- Transaction entry form (income / expense / transfer — form fields change
  based on type; a transfer between differently-currencied accounts must show
  a second `toAmount` input)
    - **`exchangeRate` (KZT per 1 unit) is required whenever the account isn't
      in KZT,** and must be absent or `1` when it is. Every total the backend
      reports is KZT, derived from that rate, so this input is not optional
      polish — a foreign-currency transaction cannot be saved without it.
    - Editing is restricted to amount, exchange rate, date, category and note.
      Changing the type or either account means delete and recreate, so the
      edit form must not offer those fields.
    - **`amountKzt` is re-derived from the post-update state**, so amount and
      rate can be corrected together or separately and the KZT figure follows.
      Editing `amount` also reverses and re-applies the balance effect, and
      only ever touches the accounts the transaction already has. A PATCH that
      touches neither money field recomputes nothing.
    - **`exchangeRate` is validated against the transaction's own currency**,
      not the request's: a KZT transaction rejects any rate but 1. Show the
      field on the same rule as the create form — only when the transaction's
      currency isn't KZT.
    - ⚠ **`toAmount` is not patchable**, and this bites exactly one case.
      `UpdateTransactionRequest` has no such field, while a cross-currency
      transfer credits its destination `toAmount ?: amount`. So editing
      `amount` on a cross-currency transfer moves the **source side only** —
      the destination keeps its old `toAmount`, and the two sides end up
      implying a rate that no longer holds. Nothing errors; it goes quietly
      inconsistent. **Decided: hide the amount field on a cross-currency
      transfer and direct the user to delete and recreate.** A warning would
      leave a silent corruption one click away, and this is a ledger. A
      same-currency transfer edits safely, since the destination is credited
      the same amount that was reversed and re-applied.
    - Future dates are rejected (today in `Asia/Almaty`); cap the date picker.
    - **`toAmount` is required when the two accounts' currencies differ and
      rejected when they match** — not "optional when they match". Show the
      input only on a cross-currency transfer and omit the key entirely
      otherwise; sending a redundant value is a 400, not a no-op.
    - **The category must match the type's kind**: an `EXPENSE` transaction
      needs an `EXPENSE` category, `INCOME` needs `INCOME`. Filter the picker by
      kind rather than letting the backend reject the mismatch — the list comes
      back flat with a `kind` field on every row, so this is a client-side
      filter, not another call.
    - **`TRANSFER` and `ADJUSTMENT` carry no category at all** and one is
      rejected if supplied. Hide the field for those types; don't send `null`
      into a create body either (see the PATCH note — absent, not null).
    - **Deleting a transaction reverses its balance effect** on both accounts
      for a transfer. It is a soft delete, but the balance moves, so it needs a
      confirm dialog rather than a one-click row action — this is the only
      destructive action in the ledger that silently changes a number elsewhere
      on screen.
- Balance-correction ("reconcile") action on an account: enter the balance
  your bank actually shows via `POST /api/v1/accounts/{id}/reconcile`, and the
  backend writes the `ADJUSTMENT` for the difference. `ADJUSTMENT` is rejected
  on the ordinary transaction endpoint, so this is the only route to one. It
  400s when the balance already matches — show that as an ordinary message,
  not an error state. A non-KZT account needs `exchangeRate` here too.
- Negative balances are legal — show them in red rather than blocking entry
- Transaction history per account (remember: a transfer shows up for both accounts involved, per the backend doc)
- Monthly summary: income vs. expense, broken down by category —
  `GET /api/v1/transactions/summary?month=2026-09`, defaulting to the current
  Almaty month. Totals are **always KZT** regardless of account currency, and
  `TRANSFER`/`ADJUSTMENT` are excluded. Uncategorised spending comes back with
  a null `categoryId`/`categoryName`, so the chart needs a label for it.
    - **Decided: this lives on the dashboard, not its own route.** It is a
      single call and it is exactly the "this month at a glance" the dashboard
      is specified as. Give the dashboard a month selector so past months are
      reachable — the same control `/budgets` needs, which makes the two read
      as one system. A separate reports page only earns its place with Phase
      6's XLSX export, which is out of scope; if a drill-down is wanted before
      then, mount the same component at a route rather than building a second
      view.
- Categories arrive as a **flat list with `parentId`** (`GET /api/v1/categories`,
  `kind` is `EXPENSE` or `INCOME`) — build the tree client-side; there is no
  nested endpoint.
    - **Two things block a delete, both 409, and the UI should say which.** A
      category with live sub-categories cannot be deleted (re-parent or delete
      the children first), and neither can one whose budget still has an open
      version (delete the budget first). Historical transactions **never** block
      it — they keep the category and keep rendering its name.
    - A `parent` must belong to the same owner, and kind is fixed by what the
      category is for — the tree editor only needs to offer name and parent.

### Phase 2 — Budgets & Goals
- Budget list with progress bars per category — amber past `alertThresholdPercent`, red past 100% (styling only; no alerts exist)
    - **Budgets are versioned by month, so `/budgets` needs a month selector.**
      `GET /api/v1/budgets?month=2026-09` reports, per budget, the limit that
      actually applied that month plus that month's usage. Past months are
      readable; a **future month is rejected**, so don't let the picker offer
      one. A budget that didn't exist yet is simply absent from that month.
    - Editing a limit takes effect from the current month onward and leaves
      history intact — worth a line of UI copy, since "change the limit" looks
      destructive otherwise. Deleting stops it from this month on, and past
      months still report it.
    - `percentUsed` is **not capped at 100** and `remaining` goes **negative**
      on overspend — clamp the bar width for display, but show the real
      numbers. Usage rolls sub-category spending up into the parent.
    - Response shape, verified against a live instance: `{id, category,
      limitAmount, period, alertThresholdPercent, month, effectiveFrom,
      effectiveTo, spent, remaining, percentUsed}`. `category` is the embedded
      object, not an id. `month`/`effectiveFrom`/`effectiveTo` are **`yyyy-MM`
      strings**, not dates, and `effectiveTo` is `null` while the limit is still
      in force. A real overspend reads `spent: 62500.5000, remaining:
      -12500.5000, percentUsed: 125.00` — note `percentUsed` comes back at
      **scale 2** while money fields are scale 4. That is deliberate, not an
      oversight: it's computed with an explicit `PERCENT_SCALE` and `HALF_UP`
      rounding as a display percentage, whereas the money fields take scale 4
      from their `numeric(19,4)` columns. Don't "fix" it.
    - **An empty list is normal, not an error state.** Asking for a month before
      a budget existed returns `[]` rather than a zero-usage row. The empty state
      must read as "no budget that month", not "no budgets configured" — the
      month selector makes this reachable in one click.
    - One active budget per category: a duplicate returns 409 with code
      `DUPLICATE_BUDGET`, which the create form should map onto the category
      field rather than a generic toast.
- Goal tracker cards: target amount, target date, progress %, linked account
    - **There is no contribute action and no contribute endpoint.** Progress is
      derived on read from the linked account's balance against the target, so
      "contributing" means recording an ordinary transaction into that account.
    - **Decided:** the card's contribute button opens the normal transaction
      form pre-filled as a **`TRANSFER`** with `toAccountId` set to the linked
      account, leaving the source account for the user to pick. Not an
      `INCOME`: moving money from checking into savings is a transfer between
      the family's own accounts, and filing it as income would double-count it
      in the monthly summary, which sums income by category — the money was
      already counted when it was earned. Leave the type switchable, since
      money arriving from outside (a salary paid straight into the savings
      account) genuinely is `INCOME`.
    - Two wrinkles on that pre-filled transfer: differing currencies between
      the source and linked accounts require `toAmount`, and a non-KZT source
      account requires `exchangeRate`.
    - `type` is `SAVINGS` or `EMERGENCY_FUND`; the linked account is **fixed
      once set** (only name, target amount, target date and status are
      editable). Several goals may share one account.
    - `status` is user-set: `ACTIVE`, `ABANDONED`, `ARCHIVED`. There is no
      `ACHIEVED` status — `achieved` is a derived boolean, so an achieved goal
      still sits in whatever status the user left it in. `GET /api/v1/goals`
      returns **every** status, so the page filters client-side; default to
      active and tuck the rest behind a toggle.
    - `progressPercent` is clamped to 0–100 (unlike budgets).

### Phase 4 — Bills & Due-Date Calendar
*(Phase 3 was dropped — loans/mortgages are just expense categories now.)*
- Calendar view (month) of bills — `GET /api/v1/bills?month=2026-09`. A row is
  `{id, name, amount, currency, dueDate, isPaid, overdue, batchId}`.
- **`overdue` is a server-computed boolean on every row — never derive it
  client-side.** It's `!isPaid && dueDate < today` evaluated in `Asia/Almaty`,
  so recomputing it from the browser's clock would disagree with the server for
  anyone in another timezone, and near midnight even in Almaty. Read the field.
- **An unpaid list alongside the calendar, not just the calendar.**
  `?unpaid=true` returns everything still owed *including bills that fell due
  in earlier months*, which a month grid structurally cannot show. Without it,
  an overdue bill disappears the moment the user pages to the next month. The
  two filters combine, and omitting both returns every bill.
    - **`unpaid=true` is "still owed", not "late".** It includes future due
      dates, so a dashboard attention panel must filter on `overdue` itself
      rather than treating the unpaid list as an arrears list.
- "Mark as paid" toggle (`PATCH` with `isPaid`) — sets a flag only, does not
  create a transaction. Say so in the UI, or the ledger and the bills list
  quietly disagree.
- Add/edit bill form: name, amount, due date, currency (defaults to KZT)
- Batch-create form for recurring bills: name, amount, day of month, start
  and end month as `yyyy-MM` (e.g. "Loan payment, the 15th, Sep–Dec") —
  creates the rows in one call; they're independent bills afterward. A day of
  month too long for a short month is **clamped to that month's last day**, so
  the preview should show the real dates. Rows share a `batchId`, and
  `DELETE /api/v1/bills/batch/{batchId}` removes the whole series at once —
  worth a "delete all in this series" action next to the single-bill delete.

*Phases 5–6 (investments, net worth) are **out of current scope** — see
`phase-5-investments.md` and `phase-6-net-worth.md` in the backend repo's
requirements folder. The
screens sketched for them previously are parked below the API conventions,
unchanged.*

## API Integration Conventions

- Loading, error, and empty states as a consistent pattern across every page
  — don't reinvent this per-page.
- Currency formatting respects each account's `currency` field — display the
  stored currency and never convert client-side. The one exception is
  aggregates: a
  transaction carries both `amount` (its own currency) and `amountKzt`, and
  every backend total — monthly summary, budget usage — is KZT only. Label
  those as KZT rather than implying they're multi-currency.
- **Money is JSON numbers, and the scale is not stable across responses.**
  Amounts arrive with trailing scale digits (`45000.0000`, `exchangeRate`
  `1.000000`), but a **write response echoes what you sent** while a later read
  comes back at full database scale — `POST /bills/batch` returns `45000` and
  `GET /bills` returns `45000.0000` for the same row. `JSON.parse` yields the
  same `number` either way, so type them `number`; but never string-compare
  amounts, never assert on raw response text, and don't expect a cached POST
  response to be byte-identical to a GET. Format for display rather than echoing
  the parsed value. (Confirmed on bills; assume it holds for every write
  response.)
- **Nothing is paginated anywhere.** The API bounds by date range instead, and
  both transaction endpoints enforce it (required `from`/`to`, one year max).
  Design list screens around a range picker, not infinite scroll. Accounts,
  categories, banks, budgets, goals and bills are small enough to return whole
  and take no range at all.
- Soft delete is universal: deleted rows vanish from lists but stay attached to
  historical transactions, so a transaction can legitimately reference a
  category or an account no longer offered in any picker. Render it, don't treat
  it as an error. **Categories and accounts handle this differently, and the
  asymmetry is the confusing part:**
    - **Category is embedded in full** — `TransactionResponse.category` is a
      `{id, name, kind, parentId}` object (or `null` for every `TRANSFER` and
      `ADJUSTMENT`, and for anything uncategorised). It keeps returning the name
      after the category is soft-deleted, while `GET /api/v1/categories` stops
      listing it. So never resolve a category name yourself — render what the
      transaction hands you, and expect names absent from the picker.
    - **Accounts are ids only** — `accountId` and `toAccountId`, no embedded
      name, so the list page must join against `GET /api/v1/accounts`. That
      lookup **will** miss: only an *active* goal blocks an account delete
      (abandoned and archived ones don't, and transactions are never checked),
      while `GET /api/v1/accounts` returns active accounts only. A transaction
      can therefore carry an `accountId` — or a transfer destination — absent
      from the map. Fall back to a label like «Удалённый счёт» rather than
      rendering `undefined` or throwing. It looks like a data bug the first time
      and isn't: the ledger deliberately keeps pointing at deleted accounts so
      history stays intact.
    - `GoalResponse.linkedAccount`, by contrast, embeds the whole account
      object — the goals page needs no join.
- **`fieldErrors` is omitted, not empty.** The error DTO carries a *class-level*
  `@JsonInclude(NON_EMPTY)`, so a non-validation failure has no `fieldErrors`
  key at all. Type it `fieldErrors?: Record<string, string>` and guard every
  read; don't assume `{}`. Because the annotation applies to every property,
  treat any empty-valued field as absent rather than assuming `fieldErrors` is
  the only one that behaves this way. A real validation failure looks like:
  `{"code":"VALIDATION_FAILED","message":"Date range must not exceed 1 year","fieldErrors":{"to":"must be at most 1 year after 'from'"}}`
  — note the field key (`to`) matches the form input name, which is what makes
  `setError` a direct mapping.
- Optimistic UI is a nice-to-have for the ledger (add transaction) but not a
  Phase 0/1 requirement — correctness first.

## Non-Functional Requirements

- Responsive enough to use comfortably from a phone browser — the native
  Android app is a separate, longer-term project, so the web frontend should
  hold up on mobile in the meantime.
- Basic accessibility: labeled form fields, keyboard-navigable forms, visible
  focus states.

---

## Parked — out of current scope (Phases 5–6)

### Phase 5 — Investment Portfolio
- Holdings list with current valuation, unrealized gain/loss
- Allocation breakdown chart (by asset class / instrument)
- Manual trade entry form (buy/sell)
- Manual price-update form per instrument (no automatic feed — see backend doc)

### Phase 6 — Net Worth Dashboard
- This becomes the home/landing screen once it exists
- Total-assets trend chart over time (cash + investments; label it "Total Assets", not "Net Worth" — debts aren't tracked, see the backend Phase 6 doc)
- Consolidated at-a-glance view pulling from every other page
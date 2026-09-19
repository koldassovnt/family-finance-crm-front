# 00 — Architecture & Foundations

Shared across every phase. Read this first; the phase docs reference it rather
than repeating it.

**Everything about the backend — the requirements docs and the source — lives
in a different repo, with no link from this one:**
`/Users/rockettech/IdeaProjects/personal/family-finance-crm`
(`git@github.com:koldassovnt/family-finance-crm.git`).

- Companion requirements: its own `.claude/requirements/` (start with its
  `00-architecture-and-foundations.md`). The phase docs beside this one map
  directly onto that folder's phase docs — same numbering, frontend view.
- **The source is the authoritative contract.** When a response shape is in
  question, read the DTOs at `src/main/kotlin/com/familyfinance/crm/dto/` —
  they carry KDoc explaining intent and outrank both this doc and the
  requirements folder. `service/*Impl.kt` answers "what blocks this action"
  questions. Every API fact below was verified against that source, not
  inferred.

**Backend status: phases 0/1, 2, 4 and 7 are built and running.** The API
described here is what the code actually exposes, not a plan. Verify against
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
| `/topics`          | «События» — undertakings with their totals                       |
| `/topics/:id`      | one event: figures, category breakdown, attached transactions    |

Charts (Recharts) appear on the dashboard, `/budgets` and `/topics/:id`:
spending by category, and budget usage vs. limit. Deliberately few — the
parked net-worth trend was the chart-heavy part.

**Selects: always use `FieldSelect`, never `ui/select` directly.** The vendored
components wrap Base UI, whose `Select.Value` renders the raw value and takes
its label from the root's `items` map — so the primitives used bare put a UUID
or an English enum member in the trigger. See `.claude/code-style.md`.

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

- **Light theme only — no dark mode.** Decided 2026-09-19. shadcn's `.dark`
  block stays vendored but inert: it needs a `.dark` class on `<html>`, and
  nothing sets one. Don't add a toggle, and don't wire `prefers-color-scheme`,
  without asking.
- Responsive enough to use comfortably from a phone browser — the native
  Android app is a separate, longer-term project, so the web frontend should
  hold up on mobile in the meantime.
- Basic accessibility: labeled form fields, keyboard-navigable forms, visible
  focus states.

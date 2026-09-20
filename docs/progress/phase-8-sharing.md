# Phase 8 — Sharing — done

Per-resource, read-only sharing between household members: an account, goal,
budget, bill or topic, opened to one person at a time.

## Built

- **API layer** — the Phase 8 DTOs transcribed, the five `/shares` paths, and
  `GET /users` now that it is open to every member. (`2572d3c`)
- **Household list** on the users screen, replacing the note that said no list
  endpoint existed. (`1dc9a94`)
- **`ShareButton`** — disclosure, picker and revoke list in one dialog — and
  **`ViewerNotice`**, the read-only marker. (`1645009`)
- **Viewer mode on the account and topic detail pages**, reusing the owned
  screens rather than read-only twins. (`fff776f`)
- **Share controls on goals, budgets and bills**, which have no detail view, so
  the control sits on the card or row. (`0d764c0`)
- **`/shared` — «Общий доступ»**, with «Доступно мне» grouped by type and
  «Чем я делюсь» beside it. (`4e7af2c`, renamed in `87bd8a4`)

## Decisions worth remembering

- **`ShareAccess` and `AccessLevel` are two types, not one union.** A grant
  confers `VIEWER` and nothing else; how you reached a resource is `OWNER` or
  `VIEWER`. The backend keeps them apart with an exhaustive `asAccessLevel()`,
  and merging them here would compile today and be wrong the day `EDITOR`
  exists — `OWNER` is not something a share can confer.
- **A goal's `linkedAccount` is typed `AccountSummary`, deliberately without
  `access`/`owner`.** The backend builds nested accounts with the plain mapper,
  so those fields carry the DTO's defaults rather than a fact about the caller.
  Verified live: a viewer reading the shared goal gets
  `linkedAccount.access === "OWNER"` for an account that 404s for them. The
  fields are omitted from the type so the misleading value cannot be read.
- **Shared-scope reads are separate functions, not a `scope` argument.** The
  owned lists are handed to TanStack Query as `queryFn`, which calls them with
  its own context object — a positional `scope` would have been filled with
  that and serialised into the query string. It also makes the never-mix rule
  structural rather than a discipline.
- **Write controls are absent for a viewer, never disabled.** A disabled button
  poses a question it cannot answer. `ViewerNotice` supplies the missing
  explanation, names the owner, and states that nothing here reaches the
  viewer's own totals.
- **«Другой счёт» is a separate fallback from «Удалённый счёт».** Same missing
  id, opposite meaning: the far side of a transfer out of a shared account
  exists and is healthy, it just was not shared. `accountNameLookup` takes the
  label as a parameter rather than growing a second function.
- **A viewer's account detail seeds its own lookup from the detail response.**
  `GET /accounts` is own-scoped, so for a viewer it does not contain the
  account being viewed — without seeding, the account would name *itself*
  «Другой счёт» on its own transfer rows.
- **A viewer's topic resolves names against shared accounts, not owned ones.**
  The rows belong to the owner's ledger, so the viewer's own accounts could
  never appear among them.
- **The «Доступно мне» tab is built from `/shares/incoming`**, one call for
  all five types. Goals, budgets and bills are then fetched with `scope=SHARED`
  because they have no detail page to link to — a shared budget whose usage you
  cannot see would be pointless. Those fetches are conditional on the type
  appearing in the incoming list.
- **The shared budgets section carries a month selector.** A budget is a
  per-month figure; leaving the month implicit would look like "always" while
  meaning "this month".

## Verified against the running backend

Checked on **2026-09-20** against `:8080` with the seeded shares, as both
`owner@example.com` and `member@example.com`. Figures are a snapshot.

- All seven incoming shares resolve, each with `resourceName`, `owner` and a
  non-null `sharedAt` — so the nullable-`sharedAt` guard is precaution, not
  something the seed data exercises.
- `GET /accounts/{shared}` returns `access: VIEWER` with `owner: Хозяин`, while
  the viewer's own `GET /accounts` returns only their three accounts, all
  `OWNER` with `owner: null`. The shared account is genuinely absent from the
  owned list, which is what the seeding above exists for.
- The shared account's only history row is a transfer whose counterparty is
  resolvable by neither the viewer's own accounts nor the shared one — the
  «Другой счёт» path, live.
- The shared goal carries `linkedAccount` «Каспи Голд» with its balance, while
  `GET /accounts/{that id}` is **404** for the same token in the same session.
  Its nested `access` reads `OWNER`, confirming the trap the type guards.
- `GET /topics/{shared}/candidates` is **404** for a viewer, and so is
  `GET /shares?resourceType=&resourceId=` — both are owner-only, which is why
  neither the attach control nor the share button renders in viewer mode.
- Shared budgets and bills come back with `access: VIEWER` and their owner
  named, two of each, so a group does not collapse to one row per type.
- `GET /users` answers for a plain `MEMBER`, which the share picker depends on.

## Watched rendering in a browser

**This phase is the exception to the caveat elsewhere in this log**: the
screens were driven in Chrome via Playwright on 2026-09-20, as both users, at
1280px and at 390px. No console errors, no page errors, no 4xx on any request
the screens made, and no horizontal overflow at phone width.

Seen, not merely inferred:

- The shared account in viewer mode, with no reconcile or share control, the
  read-only marker naming «Хозяин», and its transfer row reading
  «Другой счёт → Депозит». «Удалённый счёт» appears nowhere.
- The shared topic with all 12 rows resolving to «Другой счёт», and no attach
  or detach control anywhere on the page.
- The member's own accounts list still showing only their three accounts.
- The owner's «Чем я делюсь» listing all seven grants with their grantee.
- The share dialog on an account whose only other member already has access,
  correctly offering nobody and saying so.

Three defects surfaced this way and were fixed in `87bd8a4` — two run-together
sentences, a placeholder repeating its own label, and an h1 repeating the tab
beneath it. All three typechecked cleanly; only rendering showed them.

## Still open

- **No overdue *owned* bill in the data**, only a shared one, so the overdue
  badge on the owner's own screen is still unexercised by live data.
- **The member owns nothing but accounts**, so «Доступно мне» is the only
  populated screen for them; every other list is an empty state.
- **Nothing is shared in the member → owner direction**, so an owner viewing
  someone else's resource has not been seen. Sharing is one-directional per
  grant, so that path is the same code with the roles swapped.
- **Deleting a member** still has no endpoint, and the constraint on adding one
  is in the phase 8 spec: every shareable resource holds a non-nullable
  association to its owner.

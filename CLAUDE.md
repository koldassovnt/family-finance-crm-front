# Family Finance CRM — frontend

React SPA for a self-hosted family finance tracker. Russian-only UI, single
user in practice, talks to a Spring Boot/Kotlin backend.

## Where the truth lives

- **`.claude/frontend-requirements.md`** — the spec. Screens, rules, decisions
  and the traps worth knowing. Read it before building a screen; update it when
  a decision changes.
- **The backend repo** — `/Users/rockettech/IdeaProjects/personal/family-finance-crm`
  (`git@github.com:koldassovnt/family-finance-crm.git`). Not linked from here.
  Its DTOs at `src/main/kotlin/com/familyfinance/crm/dto/` are the authoritative
  API contract and outrank both docs. `service/*Impl.kt` answers "what blocks
  this action". Its `.claude/requirements/` holds the backend phase docs.
- Backend phases 0/1, 2 and 4 are built. Phases 5–6 are out of scope.

## Commands

```bash
npm run dev      # Vite dev server
npm run build    # tsc -b && vite build — run before calling anything done
npm run lint     # oxlint
```

`VITE_API_BASE_URL` points at the backend (see `.env.example`, default
`http://localhost:8080`). CORS allows all origins and auth is a bearer token,
so no dev proxy is needed.

## Layout

```
src/api/        client.ts (fetch wrapper, auth, errors), endpoints.ts, types.ts
src/auth/       AuthProvider + useAuth
src/app/        router, guards, AppLayout
src/pages/      one file per route; _Placeholder.tsx marks unbuilt screens
src/components/ QueryState.tsx (loading/error/empty), ui/ = shadcn, don't fight it
src/lib/        format.ts — money/date/parse helpers
src/strings.ts  every user-facing string
```

## Rules that bite

These are settled and verified against the backend source. Don't re-derive them.

- **Money displays with exactly two decimals**, always — «45 000,00». Use
  `formatMoney`. Never round before a request; send what the user typed.
- **`exchangeRate` is not money** (scale 6) and percentages are not money.
  Neither goes through the money formatter.
- **Parse money input with `parseMoney`.** `parseFloat('45 000,50')` returns
  `45`, silently.
- **"Today" means today in Almaty** — use `todayInAlmaty()`, never `new Date()`.
- **PATCH: absent means unchanged, `null` means clear.** Omit untouched fields;
  `omitUntouched()` in `api/client.ts` does this. A full form object will wipe
  a transaction's category or an account's bank.
- **`fieldErrors` is omitted when empty**, not `{}`. `ApiError.hasFieldErrors`
  guards it. Branch on `code`, never on `message` text.
- **Any 401 clears the token and redirects to login — except login itself**,
  which shows an inline error. That exemption lives in `request()`.
- **A transaction's `category` is embedded** and survives deletion; **accounts
  are ids only** and the join *will* miss a soft-deleted account. Fall back to
  `strings.common.deletedAccount`.
- **`overdue` on a bill comes from the server.** Never recompute it.
- **Nothing is paginated.** Transaction lists need `from`/`to`, one year max.
- **Deleting a transaction moves balances.** Always confirm first.

## Working here

- **Commit every logical change.** One commit per coherent piece, as it lands —
  not one large commit at the end. Group by what the change *is*, not by which
  files it touched, and put the reasoning in the body: why the 401 rule exempts
  login, why money formats at exactly two decimals. That is what a reader needs
  later; the diff already says what changed.
- Run `npm run build` before reporting work done — `tsc -b` catches what the
  dev server doesn't.
- Unbuilt screens use `<Placeholder>` and list the endpoints and rules their
  real implementation must honour. Replace one wholesale rather than growing it.
- See `.claude/code-style.md` for conventions.

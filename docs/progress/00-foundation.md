# Foundation — done

Tooling, the API layer, auth, formatting and the app shell. Everything later
phases sit on.

## Built

- **Vite 8 + React 19 + TypeScript 6**, Tailwind v4, shadcn/ui, React Router,
  TanStack Query, react-hook-form + zod, Recharts. `@/*` path alias.
  (`4aace02`, `2d218d5`)
- **`src/lib/format.ts`** — money at exactly two decimals, exchange rates and
  percentages excluded, a parser for Russian-style input, Almaty-anchored
  "today" and month helpers. (`8e153e6`)
- **`src/api/`** — types transcribed from the backend DTOs, a fetch wrapper
  owning auth, the error contract and the 401 rule, and typed endpoint
  functions for every path. (`66a84eb`)
- **`src/auth/`** — token in `localStorage`, identity re-fetched from
  `/users/me` after a reload. (`ac2a01e`)
- **`QueryState`** — the single loading / error / empty pattern. (`c61e2ea`)
- **Routing and shell**, with owner-only routes guarded client-side. (`6918a5b`)
- **Login screen**, functional end to end. (`e5e6a67`)
- **Project docs** — `CLAUDE.md`, `.claude/code-style.md`, settings. (`e08974b`)

## Decisions worth remembering

- **Login is exempt from the global 401 redirect.** A wrong password is a 401,
  and the blanket handler would redirect the login page to itself: the form
  appears to reset with no error and the user can't tell a typo from an outage.
- **Identity comes from `GET /users/me`, not from decoding the JWT.** A
  client-side decode is unverified and carries no display name.
- **Queries don't retry an `ApiError`.** A 401 has already cleared the token,
  and the other codes are deterministic — retrying only delays the message.
- **`percentUsed` renders to one decimal.** Whole-number rounding would print
  «100 %» for a budget at 99.6%, the exact figure that turns the bar red.
  (`a262d2b`)

## Verified against the running backend

Logged in, then checked every request schema at `/v3/api-docs` and every
response against the seeded data. All 22 paths and every response shape matched
the transcribed types. Two request bodies did not, and were fixed (`8c39577`):

- `POST /budgets` requires `period` — omitting it was a guaranteed 400.
- `POST /accounts/{id}/reconcile` also accepts `occurredOn`.

The formatters were run against real seeded figures: `341063.4665` renders
«341 063,47», the USD balance keeps dollars, a rate of `0.004821` survives
instead of collapsing to «0,00», and `parseMoney` round-trips our own output
including its U+00A0 separator.

## Open

- **Nothing has been seen in a browser by the agent** — `tsc` and the data
  layer are verified, rendering is not.
- **No dark-mode toggle.** shadcn's dark theme needs a `.dark` class on
  `<html>` and nothing sets it, so the dark surface is unreachable in the UI.
- No tests, and no test runner installed.

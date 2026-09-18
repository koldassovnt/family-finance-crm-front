# Code style

Conventions for this repo. They describe what the existing code already does —
match it rather than introducing a second dialect.

## TypeScript

- **No `any`.** If a shape is unknown, type it `unknown` and narrow. The API
  types in `src/api/types.ts` are transcribed from the backend DTOs; extend them
  there rather than inlining a shape at the call site.
- `import type { … }` for type-only imports — `verbatimModuleSyntax` is on and
  a value import of a type is a build error.
- Prefer `interface` for object shapes, `type` for unions and aliases.
- No default exports except where a tool demands one. Named exports keep
  renames honest.
- `noUnusedLocals`/`noUnusedParameters` are on. Prefix a deliberately unused
  parameter with `_`.

## React

- Function components, named, one screen per file in `src/pages/`.
- Server state belongs to TanStack Query, never `useEffect` + `fetch`. Query
  keys are arrays that start with the resource: `['accounts']`,
  `['transactions', { from, to }]`.
- Local UI state in `useState`; form state in react-hook-form. Don't mirror
  server data into component state.
- Keep components presentational where practical — data fetching at the page
  level, rendering below it.

## Forms

- react-hook-form + zod, with the schema mirroring the backend's validation so
  errors surface before a request is sent.
- Map `ApiError.fieldErrors` onto inputs with `setError`; the field keys match
  input names deliberately. Fall back to a toast with `message` only when there
  are no field errors.
- Every input has a `<Label htmlFor>`. Forms must be keyboard-navigable with
  visible focus — the app is used on a phone too.

## Styling

- Tailwind utility classes. Compose conditionals with `cn()` from
  `@/lib/utils`, never string concatenation.
- shadcn components in `src/components/ui/` are vendored. Edit them when a
  change is genuinely needed, but keep it minimal — `shadcn add` may
  regenerate them.
- Mobile first. Layouts must work at phone width without horizontal scroll.
- Negative money is `text-destructive`. Numeric columns get `tabular-nums` so
  amounts line up on the decimal separator.

## Strings and formatting

- **No user-facing string in JSX.** Everything goes through `src/strings.ts`.
- **No ad-hoc number or date formatting.** `src/lib/format.ts` owns it —
  `formatMoney`, `formatMoneyWithCurrency`, `formatExchangeRate`,
  `formatPercent`, `formatDate`, `formatMonth`, `parseMoney`, `todayInAlmaty`.
  If you need a variant, add it there so the rule stays in one place.
- Code, comments and commit messages are in English; only the UI is Russian.

## Comments

- Comment the *why*, not the *what* — especially where the backend's behaviour
  is surprising (embedded category vs ids-only account, absent-vs-null PATCH,
  server-computed `overdue`). Those comments are load-bearing; don't strip them.
- No commented-out code. Git remembers.

## Errors and loading

- Every page uses `<QueryState>` for loading, error and empty. Don't hand-roll
  a spinner per screen.
- An empty list is often a legitimate state with its own wording — a month with
  no budgets is not "nothing configured". Pass `empty`.

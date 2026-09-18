# Phase 2 — Budgets & Goals

## Built

- **Budgets panel on the dashboard** — per-category bars, amber past each
  budget's own `alertThresholdPercent`, red past 100%, with the real
  (uncapped) figures beside the clamped bar. (`983c3aa`)
- **Month selector**, shared with the dashboard summary. Future months are
  unreachable rather than rejected on arrival. (`1a145f0`)

## Decisions worth remembering

- **The bar clamps, the numbers don't.** `percentUsed` runs past 100 and
  `remaining` goes negative; overspend is information to show.
- **An empty month is a legitimate state**, worded "no budget that month"
  rather than "none configured" — budgets are versioned, so a month before one
  existed returns `[]`.
- Colour never carries meaning alone: the threshold states are accompanied by
  the figures themselves.

## Open

- `/budgets` page proper: create, edit and delete, plus the usage chart.
- Editing a limit takes effect from the current month onward and leaves history
  intact — this needs UI copy, since "change the limit" reads as destructive.
- A duplicate category returns 409 `DUPLICATE_BUDGET`, which the create form
  should map onto the category field rather than a toast.
- `/goals` entirely: cards with progress, status filtering (the API returns
  every status), and the contribute action — a pre-filled `TRANSFER` into the
  linked account, with the type left switchable.

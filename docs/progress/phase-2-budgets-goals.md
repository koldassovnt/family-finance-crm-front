# Phase 2 — Budgets & Goals

## Built

- **Budgets panel on the dashboard** — per-category bars, amber past each
  budget's own `alertThresholdPercent`, red past 100%, with the real
  (uncapped) figures beside the clamped bar. (`983c3aa`)
- **Month selector**, shared with the dashboard summary. Future months are
  unreachable rather than rejected on arrival. (`1a145f0`)

- **`/budgets` page** — create, edit and delete, the shared month selector,
  and a spent-vs-limit chart.

## Verified against the running backend

- `?month=2026-08` returns `[]` (the budgets start in September), so the
  "no budget that month" empty state is real and reachable in one click.
- `?month=2026-10` is a 400 with a `month` field error. The month selector
  disables stepping past the current month, so the request is never sent.
- All three bar states now have live data in September: «Транспорт» 34.67%
  under its 75% threshold (normal), «Коммуналка» 85.5% past its 80% threshold
  (amber), «Продукты» 112.35% over the limit with negative remaining and the
  «Кофе» child rolled up (red). The amber row was added by PATCHing the
  existing budget, which — being a version change from the current month —
  means August reports that budget's older configuration. A threshold that
  differs between the two months on the same row is the versioning working.

## Decisions worth remembering

- **The bar clamps, the numbers don't.** `percentUsed` runs past 100 and
  `remaining` goes negative; overspend is information to show.
- **An empty month is a legitimate state**, worded "no budget that month"
  rather than "none configured" — budgets are versioned, so a month before one
  existed returns `[]`.
- Colour never carries meaning alone: the threshold states are accompanied by
  the figures themselves.

## Open

- `/goals` entirely: cards with progress, status filtering (the API returns
  every status), and the contribute action — a pre-filled `TRANSFER` into the
  linked account, with the type left switchable.

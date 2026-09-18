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
- ⚠ **The amber state is not exercised by the current seed.** Amber needs
  `alertThresholdPercent <= percentUsed < 100`, and the seeded rows are
  «Продукты» 112.35% with threshold 80 (red), «Коммуналка» 85.5% with **no**
  threshold (plain), «Транспорт» 34.67% with threshold 75 (plain). Setting
  «Коммуналка» to a threshold of 80 would cover it.

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

# Phase 4 — Bills & Due-Date Calendar

## Built

- **Bills panel on the dashboard** — overdue and due-soon, with the overdue
  badge carrying a word rather than relying on colour. (`111758e`)

## Decisions worth remembering

- **The panel queries `?unpaid=true`, not the current month.** A month query
  returns only bills *due* that month, so an unpaid August bill vanishes the
  moment you look at September — and that is precisely the bill that needs
  attention.
- **"Unpaid" is not "late".** It includes bills due months from now, so the
  narrowing to overdue-or-due-within-14-days happens client-side.
- **`overdue` comes from the server**, computed in Almaty time. Recomputing it
  from the browser clock would disagree for most of the day elsewhere.

Verified against the seeded data: the panel surfaces the overdue August bill
and the two due this month, while the October–December rows of the same loan
batch stay out.

## Open

- `/bills` page: the month calendar grid, with the unpaid list beside it —
  two calls, deliberately orthogonal.
- Add/edit bill form, including the currency field.
- Batch create: day-of-month clamps to a short month's last day, so the form
  should preview the real dates; the API caps a batch at 120 rows.
- "Mark as paid" sets a flag and creates no transaction — the UI has to say so,
  or the ledger and the bills list quietly disagree.
- Delete a whole series via `DELETE /bills/batch/{batchId}`.

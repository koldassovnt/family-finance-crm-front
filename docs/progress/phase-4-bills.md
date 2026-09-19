# Phase 4 — Bills & Due-Date Calendar

## Built

- **`/bills` page** — a month calendar grid with the unpaid panel beside it,
  add/edit, mark-as-paid, batch create with a date preview, and delete for a
  single row or a whole series.
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

Also verified: the batch preview reproduces the backend's own expansion
exactly. Day 31 over Sep–Dec gives 09-30, 10-31, 11-30, 12-31 — matching the
seeded «Кредит на авто» rows — and Jan–Mar gives 02-28 for February.

## Decisions worth remembering (page)

- **The calendar is built from ISO strings, not Date objects.** `dueDate` is a
  plain `yyyy-MM-dd` with no time or zone; parsing it into a Date would
  reintroduce the browser's timezone into something the backend deliberately
  keeps zone-free. Weeks start Monday.
- The batch preview exists because the clamping rule is easy to state and hard
  to believe until the actual dates are on screen.

## Open

Nothing for this phase.

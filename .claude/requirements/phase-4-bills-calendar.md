# Phase 4 — Bills & Due-Date Calendar

Status: **built**. See `00-architecture-and-foundations.md` for the
stack, formatting rules, auth and error contract this builds on.

*Phase 3 was dropped — loans and mortgages are ordinary expense categories.*

*(Phase 3 was dropped — loans/mortgages are just expense categories now.)*
- Calendar view (month) of bills — `GET /api/v1/bills?month=2026-09`. A row is
  `{id, name, amount, currency, dueDate, isPaid, overdue, batchId}`.
- **`overdue` is a server-computed boolean on every row — never derive it
  client-side.** It's `!isPaid && dueDate < today` evaluated in `Asia/Almaty`,
  so recomputing it from the browser's clock would disagree with the server for
  anyone in another timezone, and near midnight even in Almaty. Read the field.
- **An unpaid list alongside the calendar, not just the calendar.**
  `?unpaid=true` returns everything still owed *including bills that fell due
  in earlier months*, which a month grid structurally cannot show. Without it,
  an overdue bill disappears the moment the user pages to the next month. The
  two filters combine, and omitting both returns every bill.
    - **`unpaid=true` is "still owed", not "late".** It includes future due
      dates, so a dashboard attention panel must filter on `overdue` itself
      rather than treating the unpaid list as an arrears list.
- "Mark as paid" toggle (`PATCH` with `isPaid`) — sets a flag only, does not
  create a transaction. Say so in the UI, or the ledger and the bills list
  quietly disagree.
- Add/edit bill form: name, amount, due date, currency (defaults to KZT)
- Batch-create form for recurring bills: name, amount, day of month, start
  and end month as `yyyy-MM` (e.g. "Loan payment, the 15th, Sep–Dec") —
  creates the rows in one call; they're independent bills afterward. A day of
  month too long for a short month is **clamped to that month's last day**, so
  the preview should show the real dates. Rows share a `batchId`, and
  `DELETE /api/v1/bills/batch/{batchId}` removes the whole series at once —
  worth a "delete all in this series" action next to the single-bill delete.

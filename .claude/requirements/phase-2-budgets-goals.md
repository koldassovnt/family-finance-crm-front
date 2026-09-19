# Phase 2 — Budgets & Goals

Status: **built**. See `00-architecture-and-foundations.md` for the
stack, formatting rules, auth and error contract this builds on.

- Budget list with progress bars per category — amber past `alertThresholdPercent`, red past 100% (styling only; no alerts exist)
    - **Budgets are versioned by month, so `/budgets` needs a month selector.**
      `GET /api/v1/budgets?month=2026-09` reports, per budget, the limit that
      actually applied that month plus that month's usage. Past months are
      readable; a **future month is rejected**, so don't let the picker offer
      one. A budget that didn't exist yet is simply absent from that month.
    - Editing a limit takes effect from the current month onward and leaves
      history intact — worth a line of UI copy, since "change the limit" looks
      destructive otherwise. Deleting stops it from this month on, and past
      months still report it.
    - `percentUsed` is **not capped at 100** and `remaining` goes **negative**
      on overspend — clamp the bar width for display, but show the real
      numbers. Usage rolls sub-category spending up into the parent.
    - Response shape, verified against a live instance: `{id, category,
      limitAmount, period, alertThresholdPercent, month, effectiveFrom,
      effectiveTo, spent, remaining, percentUsed}`. `category` is the embedded
      object, not an id. `month`/`effectiveFrom`/`effectiveTo` are **`yyyy-MM`
      strings**, not dates, and `effectiveTo` is `null` while the limit is still
      in force. A real overspend reads `spent: 62500.5000, remaining:
      -12500.5000, percentUsed: 125.00` — note `percentUsed` comes back at
      **scale 2** while money fields are scale 4. That is deliberate, not an
      oversight: it's computed with an explicit `PERCENT_SCALE` and `HALF_UP`
      rounding as a display percentage, whereas the money fields take scale 4
      from their `numeric(19,4)` columns. Don't "fix" it.
    - **An empty list is normal, not an error state.** Asking for a month before
      a budget existed returns `[]` rather than a zero-usage row. The empty state
      must read as "no budget that month", not "no budgets configured" — the
      month selector makes this reachable in one click.
    - One active budget per category: a duplicate returns 409 with code
      `DUPLICATE_BUDGET`, which the create form should map onto the category
      field rather than a generic toast.
- Goal tracker cards: target amount, target date, progress %, linked account
    - **There is no contribute action and no contribute endpoint.** Progress is
      derived on read from the linked account's balance against the target, so
      "contributing" means recording an ordinary transaction into that account.
    - **Decided:** the card's contribute button opens the normal transaction
      form pre-filled as a **`TRANSFER`** with `toAccountId` set to the linked
      account, leaving the source account for the user to pick. Not an
      `INCOME`: moving money from checking into savings is a transfer between
      the family's own accounts, and filing it as income would double-count it
      in the monthly summary, which sums income by category — the money was
      already counted when it was earned. Leave the type switchable, since
      money arriving from outside (a salary paid straight into the savings
      account) genuinely is `INCOME`.
    - Two wrinkles on that pre-filled transfer: differing currencies between
      the source and linked accounts require `toAmount`, and a non-KZT source
      account requires `exchangeRate`.
    - `type` is `SAVINGS` or `EMERGENCY_FUND`; the linked account is **fixed
      once set** (only name, target amount, target date and status are
      editable). Several goals may share one account.
    - `status` is user-set: `ACTIVE`, `ABANDONED`, `ARCHIVED`. There is no
      `ACHIEVED` status — `achieved` is a derived boolean, so an achieved goal
      still sits in whatever status the user left it in. `GET /api/v1/goals`
      returns **every** status, so the page filters client-side; default to
      active and tuck the rest behind a toggle.
    - `progressPercent` is clamped to 0–100 (unlike budgets).

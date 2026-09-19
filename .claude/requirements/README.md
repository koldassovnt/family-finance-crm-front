# Frontend Requirements — Family Finance CRM (React)

**These are the *frontend* requirements**, split by phase to mirror the
backend's own `.claude/requirements/`. The backend's copies live in its repo,
not here — see `00-architecture-and-foundations.md` for the path.

Read `00-architecture-and-foundations.md` first: the phase docs reference it
rather than repeating it.

| Doc | Scope | Frontend state |
|---|---|---|
| [00 — Architecture & foundations](00-architecture-and-foundations.md) | Stack, formatting, auth, errors, routes, API conventions | Built |
| [Phase 0 + 1 — Foundation & ledger](phase-0-1-foundation-ledger.md) | Accounts, transactions, reconcile, monthly summary | Built |
| [Phase 2 — Budgets & goals](phase-2-budgets-goals.md) | Budgets, goals | Built |
| [Phase 4 — Bills & due-date calendar](phase-4-bills-calendar.md) | Bills, calendar, batch create | Built |
| [Phase 7 — Topics («События»)](phase-7-topics.md) | A lens over the ledger | Built |
| [Settings](settings.md) | Category tree, password, user creation | Built |
| [Parked — phases 5 & 6](later/phases-5-6-parked.md) | Investments, net worth | Out of scope |

Phase 3 was dropped before any work started — loans and mortgages are ordinary
expense categories. Phase 7 reuses a number from a dropped phase of the same
index; it is unrelated to it.

## This is the spec, not the log

These files say what *should* be true. `docs/progress/` records what was
actually built, when, and what was verified against a running backend. When the
two disagree, this folder is the intent and `docs/progress/` is the truth about
the code.

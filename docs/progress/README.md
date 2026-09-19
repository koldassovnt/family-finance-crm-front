# Progress log

What has actually been built, phase by phase, and what is still open.

The phases mirror the backend's, so a line here maps onto a section of
`.claude/frontend-requirements.md` and onto the matching phase doc in the
backend repo. **This log records what happened; the spec records what should
happen.** When they disagree, the spec is the intent and this file is the
truth about the code.

| Phase | Scope | State |
|---|---|---|
| [Foundation](00-foundation.md) | Tooling, API client, auth, formatting, shell | **Done** |
| [Phase 0 + 1](phase-0-1-ledger.md) | Accounts, transactions, reconcile, summary | **Done** |
| [Phase 2](phase-2-budgets-goals.md) | Budgets, goals | **Done** |
| [Phase 4](phase-4-bills.md) | Bills, due-date calendar | **Done** |
| [Phase 7](phase-7-topics.md) | Topics — a lens over the ledger | **Not started** — backend only |

Phases 5–6 (investments, net worth) are out of scope; Phase 3 was dropped
before any work started. Phase 7 arrived on the backend after this frontend
was underway and has not been scheduled here.

## Conventions for this log

- One file per phase. Append as work lands rather than rewriting history.
- Record **decisions and their reasons**, not a diff summary — the git log
  already covers what changed, and each commit body carries its own rationale.
- Note anything verified against the running backend, and anything that is
  still only verified by `tsc`. The difference matters when picking up later.

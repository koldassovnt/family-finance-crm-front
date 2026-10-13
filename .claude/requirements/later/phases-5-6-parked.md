# Parked — Phase 6, and the rest of Phase 5

**Out of current scope.** Nothing here is built, and nothing should be started
without a decision.

### Phase 5 — what is left

Trades, holdings, current value and gain are built — see
`../phase-5-investments.md`. What remains:

- Allocation breakdown chart (by asset class / instrument). There is no
  asset-class field today — the kind of asset lives in the trade's note.

### Phase 6 — Net Worth Dashboard

The backend's doc is `.claude/requirements/phase-6-net-worth.md` in its repo.

The transaction export described there is the one part that is built — it is
a button on `/transactions`, specified under "Export to Excel" in
`../00-architecture-and-foundations.md`. The rest stays parked:

- This becomes the home/landing screen once it exists
- Total-assets trend chart over time (cash + investments; label it "Total Assets", not "Net Worth" — debts aren't tracked, see the backend Phase 6 doc)
- Consolidated at-a-glance view pulling from every other page

# Parked — Phase 6, and the rest of Phase 5

**Out of current scope.** Nothing here is built, and nothing should be started
without a decision.

### Phase 5 — what is left

Trades and holdings **at cost** are built — see `../phase-5-investments.md`.
What remains waits for a price source, which the owner has said comes later
from external APIs:

- Current valuation and unrealized gain/loss per holding
- Allocation breakdown chart (by asset class / instrument). There is no
  asset-class field today — the kind of asset lives in the trade's note.

When prices arrive they are new columns beside «Вложено», not a relabelling of
it.

### Phase 6 — Net Worth Dashboard

The backend's doc is `.claude/requirements/phase-6-net-worth.md` in its repo.

- This becomes the home/landing screen once it exists
- Total-assets trend chart over time (cash + investments; label it "Total Assets", not "Net Worth" — debts aren't tracked, see the backend Phase 6 doc)
- Consolidated at-a-glance view pulling from every other page

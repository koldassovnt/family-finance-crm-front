# Phase 7 — Topics

**Status: not started. Backend only.** No frontend work has been decided on
or done; this file records what exists so the decision can be made with the
facts rather than from the announcement.

A topic groups the transactions of one undertaking — a trip, a renovation — so
it can be viewed and totalled on its own. It adds no money concepts: every
expense stays an ordinary transaction and a topic is a lens over the ledger.
It is deliberately **not** a category. A category says what the money was for
and carries a budget; a topic says which occasion it belonged to and cuts
across categories. A transaction can have both.

Backend spec lives in the backend repo at
`.claude/requirements/phase-7-topics.md` (commits 2379477, ca35706).

## What already reaches the frontend

`TransactionResponse` now embeds `topic: {id, name, status} | null` beside
`category` — confirmed against the running API, where 4 of 11 September rows
carry «Малайзия 2026». The field is typed in `api/types.ts` so the
transcription stays honest, but nothing renders it yet.

`POST`/`PATCH /transactions` accept `topicId` (absent-vs-null on PATCH), and
`GET /transactions` accepts `&topicId=`.

## Endpoints, if this gets built

| Method | Path | Notes |
|---|---|---|
| GET | `/topics` | list with totals; `?status=ACTIVE\|CLOSED` |
| GET | `/topics/{id}` | topic plus `expenseByCategory`/`incomeByCategory` in the same `CategorySummary` shape the monthly summary uses — the existing chart takes them unchanged |
| POST | `/topics` | duplicate name is 409 |
| PATCH | `/topics/{id}` | nullable fields are absent-vs-null |
| DELETE | `/topics/{id}` | soft delete; transactions untouched |
| GET | `/topics/{id}/transactions` | **no date range required** — membership is the bound |
| GET | `/topics/{id}/candidates` | unattached INCOME/EXPENSE inside the topic's window; 400 if the topic has no dates |
| POST | `/topics/{id}/transactions` | bulk attach, all-or-nothing |
| DELETE | `/topics/{id}/transactions/{transactionId}` | detach one |

## Traps recorded in advance

- **`TRANSFER` and `ADJUSTMENT` cannot belong to a topic** (400, keyed to
  `topicId` or `transactionIds`). Attaching a transfer would count both the
  withdrawal and the thing it paid for. `INCOME` *is* allowed — a refund or
  money repaid by a travel companion belongs to a trip's net cost. So a topic
  picker follows the same show/hide rule as the category picker.
- **A CLOSED topic still accepts attachments** — a late invoice is normal.
  Closing only means "drop it from the picker", so filter the picker on
  `ACTIVE` but block nothing.
- **No `@SQLRestriction`, exactly like `Category`** — a transaction keeps
  resolving its topic's name after the topic is soft-deleted. Render what the
  row gives you; expect topics absent from `GET /topics`.

## Seeded data

- «Малайзия 2026», ACTIVE, planned 400 000, 2026-09-01..09-16, 4 transactions,
  spent 169 912,7165, remaining 230 087,2835. One of the four is the USD
  subscription, so the total exercises cross-currency conversion via
  `amountKzt`.
- «Ремонт кухни», CLOSED, planned 900 000, nothing attached — an empty-state
  topic and the status filter in one.

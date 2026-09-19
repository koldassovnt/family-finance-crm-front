# Phase 7 — Topics

**Status: built.** Scheduled by the user after bills, and labelled
**«Событие»** in the UI — «Тема» is the literal translation but reads oddly for
a trip. The entity stays `Topic` in code.

A topic groups the transactions of one undertaking — a trip, a renovation — so
it can be viewed and totalled on its own. It adds no money concepts: every
expense stays an ordinary transaction and a topic is a lens over the ledger.
It is deliberately **not** a category. A category says what the money was for
and carries a budget; a topic says which occasion it belonged to and cuts
across categories. A transaction can have both.

Backend spec lives in the backend repo at
`.claude/requirements/phase-7-topics.md` (commits 2379477, ca35706).

## Built

- **`/topics`** — cards with spent, received, net and planned-vs-remaining,
  filtered server-side on `?status`.
- **`/topics/:id`** — header figures, the dashboard's category chart reused
  unchanged, the attached transactions with detach, and bulk attach.
- **Topic picker** on the transaction entry form (ACTIVE only, hidden for
  transfers) and a **topic filter** on `/transactions` (every topic).

## Decisions worth remembering

- **The declared window and the real span are shown separately.** A flight
  booked two weeks early legitimately falls outside `startDate`, so rendering
  the declared dates as though they bounded the spending would make correct
  data look wrong.
- **`received` is shown beside `spent`,** not just the gross — a refunded
  booking otherwise makes a trip look more expensive than it was.
- **Candidates start unchecked.** The date window is a weak signal, and the
  endpoint is a suggestion, never an action.
- The list filters server-side on `?status`, unlike goals, because it is a real
  query parameter — no reason to fetch closed topics in order to hide them.

## Verified against the running backend

- `GET /transactions?topicId=` returns the four attached rows, one of them USD,
  so a row's own currency and the KZT totals differ visibly on one screen.
- `/candidates` on a dateless topic is a 400 keyed to `startDate`. The dialog
  never sends it — it says so up front instead.
- A topic created and soft-deleted during testing left its transactions alone,
  as the spec promises.
- «Турция 2026» drove out a real omission: the page rendered
  `expenseByCategory` and dropped `incomeByCategory`, hiding the «Возвраты»
  row that explains why net sits below spent. Fixed. Its out-of-window first
  transaction and its eight USD rows are the data the declared-vs-actual span
  and the per-row currency exist for.

## How topics reach the transaction screens

`TransactionResponse` embeds `topic: {id, name, status} | null` beside
`category`, so the list renders it with no join — and, like a category, it
keeps resolving after the topic is soft-deleted.

`POST`/`PATCH /transactions` accept `topicId` (absent-vs-null on PATCH, so an
explicit null detaches), and `GET /transactions` accepts `&topicId=`.

## Endpoints

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

**Figures below are a snapshot (2026-09-19), not constants.** Using the app
changes them — a transaction recorded through the UI lands in these totals
like any other. Treat them as "what the data looked like when this was
written", and re-read the API rather than trusting them if something looks
off.

- «Малайзия 2026», ACTIVE, planned 400 000, 2026-09-01..09-16, 4 transactions,
  spent 169 912,7165, remaining 230 087,2835. One of the four is the USD
  subscription, so the total exercises cross-currency conversion via
  `amountKzt`.
- **«Турция 2026», ACTIVE — the one that exercises the hard cases.** 12
  transactions, 8 USD at four different rates (479.10, 478.20, 477.85, 477.60)
  and 4 KZT, so eight rows carry a currency that isn't the totals' currency on
  the same screen. Planned 1 600 000, spent 1 075 155,3175, received 40 596,0
  from a refunded excursion, net 1 034 559,3175, remaining 565 440,6825; four
  expense categories and one income category.
  **Its `firstTransactionOn` (2026-08-02) precedes its `startDate`
  (2026-08-15)** — flights booked two weeks early — which is exactly why the
  declared window and the real span are rendered separately.
- **«Подготовка к школе», ACTIVE — the over-plan case.** Planned 100 000
  against one 128 400,75 expense, so `remaining` is **−28 400,75** at 128.4% of
  plan. Seeded additively by attaching an already-unattached September row, so
  no other topic's totals moved and no summary or budget figure changed:
  attaching a transaction changes nothing but its topic reference.
- «Ремонт кухни», CLOSED, planned 900 000, nothing attached — an empty-state
  topic and the status filter in one.

«Малайзия 2026» drifted from 4 rows to 5 (spent 169 912,7165 → 179 912,7165)
when a 10 000 ₸ «Развлечения» expense dated 2026-09-19 was recorded through the
UI. Nobody seeded it — which is the useful part: the row carries a matching
category kind and an ACTIVE topic, so it is evidence the entry form and the
topic picker work end to end.

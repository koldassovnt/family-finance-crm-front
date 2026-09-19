# Phase 7 — Topics («События»)

Status: **built**. See `00-architecture-and-foundations.md` for the stack,
formatting rules, auth and error contract this builds on.

A topic groups the transactions of one undertaking — a trip, a renovation, a
wedding — so they can be viewed and totalled together. It adds **no money
concepts**: every expense stays an ordinary transaction, and a topic is a lens
over the ledger rather than a second ledger.

**It is deliberately not a category.** A category says *what the money was for*
and carries a budget; a topic says *which occasion it belonged to* and cuts
across categories. A transaction may have both, and usually should.

## Russian label

**«Событие», not «Тема».** The literal translation reads like a forum thread;
«Событие» covers trips, renovations and weddings naturally. The entity stays
`Topic` in code and in the API — only the UI wording differs.

## `/topics`

- Cards showing spent, received, net, and planned vs remaining where
  `plannedAmount` is set. Every figure is **KZT**, derived from `amountKzt`, so
  a trip paid partly abroad is never a sum of mixed currencies.
- **Show `received` beside `spent`, not the gross alone.** A refunded booking
  otherwise makes a trip look more expensive than it was; `net` is the honest
  cost.
- `remaining` is `null` when `plannedAmount` is unset, and goes **negative** on
  overspend — style that case like a budget's overspend.
- Filter on `?status=ACTIVE` **server-side**, unlike goals: it is a real query
  parameter, so there is no reason to fetch closed topics in order to hide them.

## `/topics/:id`

- Header figures, the attached transactions, and the category breakdown.
- **Reuse the dashboard's category chart unchanged.** `GET /topics/{id}` returns
  `expenseByCategory` and `incomeByCategory` in the same `CategorySummary` shape
  the monthly summary uses, precisely so this needs no second chart.
- **Render `incomeByCategory` too.** It is usually one or two rows — a refund, a
  repayment — so a list beats a second chart competing with the expense one.
  Dropping it hides why `net` sits below `spent`.
- **Show the declared window and the real span separately.** `startDate`/
  `endDate` are metadata, not a constraint: a flight booked two weeks early
  legitimately falls outside them, so `firstTransactionOn` can precede
  `startDate`. Rendering the declared dates as if they bounded the spending
  makes correct data look like a bug.
- `GET /topics/{id}/transactions` needs **no date range** — membership is itself
  the bound, unlike the ledger endpoint's one-year cap.
- Detaching removes the link only; the transaction stays in the ledger.

## Bulk attach

The primary way a trip actually gets tagged: you label it after getting home,
not one row at a time.

- Driven by `GET /topics/{id}/candidates` — unattached `INCOME`/`EXPENSE` inside
  the topic's window, newest first.
- **400 when the topic has no dates**, keyed to `startDate`. Don't send the
  request; say so in the dialog instead. "Everything you ever recorded" is not a
  candidate list.
- **Every row starts unchecked.** The date window is a weak signal — a flight
  booked in March belongs to a June trip, and lunch on the day you flew home may
  not be trip spending at all. Candidates are a suggestion, never an action.
- `POST /topics/{id}/transactions` is **all-or-nothing**: one bad id rejects the
  whole call and the message names the offenders, so a partial result never
  leaves the user guessing which of 23 rows landed.

## On the transaction screens

- **The picker follows the same show/hide rule as the category picker**: shown
  for `INCOME`/`EXPENSE`, hidden for `TRANSFER`. Attaching a transfer would
  count both the withdrawal and the thing it paid for. `INCOME` *is* allowed —
  refunds and money repaid by a travel companion belong to a trip's net cost.
- **The picker lists `ACTIVE` topics only.** A finished trip should stop
  cluttering daily entry. The filter on `/transactions` lists every topic
  instead, since you still look back at a closed one.
- A **`CLOSED` topic still accepts attachments** — a late invoice is normal.
  Closing affects the picker, not the API, so block nothing.
- `TransactionResponse` embeds `topic: {id, name, status} | null`, so the list
  renders it with no join — and, exactly like a category, it keeps resolving
  after the topic is soft-deleted.
- `topicId` is settable on create and is absent-vs-null on `PATCH`, so an
  explicit `null` detaches.

## Deleting

Soft delete, and it **never touches the transactions** — they keep their link,
as they do with a soft-deleted category. A topic is a view; deleting a view must
not delete money. Nothing blocks the delete either, unlike the category/budget
and account/goal rules: those protect a live configuration that computes
something, and a topic computes nothing but its own view.

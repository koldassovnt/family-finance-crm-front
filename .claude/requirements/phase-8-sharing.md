# Phase 8 — Sharing («Поделиться»)

Status: **built on both sides.** What the frontend actually does, and what was
verified against a running backend, is in `docs/progress/phase-8-sharing.md`.
The backend's own doc is `.claude/requirements/phase-8-sharing.md` in its repo;
read it for the data model and the exposure decisions. This file covers only
what the frontend has to decide, plus the contract as built (below).

**The backend on `:8080` is live and current** — rebuilt after Phase 8 shipped,
and `/v3/api-docs` lists the whole `/api/v1/shares` family. Schema is at `V8`.

**Seven shares are seeded**, all from «Хозяин» to «Член семьи», chosen so each
exercises a different rendering case: an account whose one transfer has an
unshared counterparty, a goal whose linked account 404s for the grantee, two
budgets (one over limit, one amber), two bills (one overdue), and the trip
topic with income and expense breakdowns. The member also owns three accounts
of their own. Both are a snapshot, not a fixture — treat a missing row as the
environment having moved on, not as a bug.

⚠ **A revoke is a soft delete**, and a partial unique index then permits
re-sharing the same pair. Demo rows have at times been deleted outright during
environment cleanup; don't read that as evidence about revoke semantics.
Re-sharing after a revoke must work, and is worth testing.

See `00-architecture-and-foundations.md` for the stack, formatting rules, auth
and error contract this builds on.

A member shares **one specific thing they own** — an account, goal, budget,
bill or topic — with another household member, who can then **view it and
nothing more**. Everyone can share, not just the `OWNER`.

Controlled from the resource itself: the detail view for an account or a topic,
and the card or row for a goal, budget or bill, which have no detail view of
their own.

---

## The two things the frontend settles

### 1. A viewer gets no write affordance at all — not a disabled one

**Decided: absent, not disabled.** Where `access` is `VIEWER`, the edit,
delete, reconcile, attach, detach and mark-paid controls are **not rendered**.

A disabled button is a worse answer than no button. It poses a question —
*why can't I?* — that the control itself cannot answer, invites a click that
does nothing, and reads as a fault in the app rather than a deliberate
boundary. Absence plus one clear statement answers it once.

That statement is the other half of the rule: **every viewed screen carries a
read-only marker naming the owner** at the top — «Доступно для просмотра ·
владелец: Айгуль». Without it, a page with no buttons looks broken rather than
borrowed. Navigation is never hidden: the viewer can reach and read the thing,
they simply cannot act on it.

The server rejects every write regardless. The UI's job is to not offer them.

### 2. A separate «Общий доступ» screen — not mixed lists

**Decided: keep `scope=OWN` everywhere it is already used, and put shared
things on their own screen**, whose incoming tab is driven by
`GET /api/v1/shares/incoming`.

The temptation is `scope=ALL` on `/accounts`, badging the rows. Reject it,
because of the rule the backend states plainly: **a shared resource
contributes nothing to the viewer's own figures**. A mixed accounts list would
show rows that deliberately do not feed the dashboard, the summary or any
budget — a list where some rows count toward your totals and some silently do
not is a trap, and badging fixes identity without fixing arithmetic. Someone
would add up the column, disagree with their own dashboard, and be right to.

One screen where *nothing* counts toward your totals is honest; a mixed list
where *some* rows do is not. So:

- `/shared` — «Общий доступ», with «Доступно мне» and «Чем я делюсь» as its two
  tabs. The incoming tab is grouped by resource type and each row names its
  owner.
- Existing lists keep their current behaviour, unchanged, with no `scope`
  parameter sent. Nothing already built alters its meaning.
- Revisit mixed lists only if the "never mixes into totals" rule ever changes —
  which it should not.

#### Each group shows the resource, not the share row

**`/shares/incoming` decides which groups appear; the figures come from the
resources themselves**, fetched per present type with `scope=SHARED`.

The first build rendered accounts and topics as a name plus an owner badge,
on the reasoning that they have detail pages to link to. That was the wrong
cut. A share grants a read over the *whole* resource, so a row that withholds
the balance is not being careful — the balance is one click away on the page
that row links to. It is just a screen that says nothing, sitting beside
budgets and goals that show real numbers.

So each group renders what its owner sees: an account with its type, bank and
balance; a topic through the same card `/topics` uses, with spent, received,
net, plan, remaining and the real span; a goal's progress; a budget's bar; a
bill with its due date and `overdue`.

**Reuse the owner's own components** — `TopicCard`, `GoalCard`, `BudgetBar` —
rather than shared-screen variants. Same reason viewer mode reuses the detail
pages: a second rendering of the same figures drifts, and the one used less
often drifts faster.

Two consequences worth keeping:

- **Accounts and topics still link to their detail pages.** The row is a
  summary, not a replacement — the history and the attached transactions live
  there.
- **A shared budget needs a month selector**, like the owned list. A budget is
  a per-month figure, and an implicit month looks like "always" while meaning
  "this month".

---

## The contract, as built

Verified against the backend source at `901fed3`, not just its summary.

| Endpoint | Notes |
|---|---|
| `GET /api/v1/users` | The household, for the picker. Any authenticated member, not just `OWNER`. `{id, email, displayName, role}`. |
| `GET /api/v1/shares?resourceType=&resourceId=` | Who one resource is shared with. Owner only — **a viewer of that very resource gets 404, not 403.** |
| `POST /api/v1/shares` | `{resourceType, resourceId, granteeUserId}`. No `access` field; `VIEWER` is implied. |
| `DELETE /api/v1/shares/{id}` | Revoke. Takes effect on the next read. |
| `GET /api/v1/shares/incoming` \| `/outgoing` | All five types in one list. No `scope` fan-out needed. |

**`ShareResponse`** — `{id, resourceType, resourceId, resourceName, owner,
grantee, access, sharedAt}`, where `owner`/`grantee` are `{id, displayName}`.

- `resourceName` is **null only on the per-resource listing**, where the caller
  is already looking at the thing. It is populated on incoming/outgoing. A
  budget's is its category's name.
- `sharedAt` is nullable in the DTO. Don't render it unguarded.

### Two enums, not one — type them separately

`ShareResponse.access` is `ShareAccess`, which has **exactly one value,
`VIEWER`**. A resource's `access` is `AccessLevel`, which is `OWNER | VIEWER`.
They are different types in the backend (`Enums.kt:37`, `:44`) and a single
frontend union would quietly merge them; the day `EDITOR` arrives it will
arrive in one and not the other.

### The additive changes to endpoints already in use

Both are backward-compatible — every call the frontend makes today returns
what it returned before, and the backend made that a test rather than an
assumption.

- **`scope=OWN|SHARED|ALL`** on `/accounts`, `/goals`, `/budgets`, `/bills`,
  `/topics`. **Default `OWN`.** Per the decision above, the frontend keeps
  sending no `scope` at all.
- **`access` and `owner: {id, displayName}`** now ride on those five list
  responses and on `GET /accounts/{id}` and `GET /topics/{id}`. **`owner` is
  null when `access` is `OWNER`.** Badge and sort off these — never a second
  call to find out whose something is.

### Which reads a viewer may make

`GET /accounts/{id}`, `/accounts/{id}/transactions`, `/topics/{id}`,
`/topics/{id}/transactions`, and the five lists via `scope`.

**`GET /topics/{id}/candidates` stays owner-only.** It suggests transactions to
attach — a writing tool wearing a read verb. Don't render it in viewer mode.

**Every mutating endpoint returns 404 to a viewer**, for all five types.

### Errors

- Foreign or unowned resource id → **404, never 403.** A 403 would confirm the
  id exists. The UI must not undo that by wording the two differently.
- Sharing with yourself → 400. Re-sharing the same thing with the same person
  → 409. Unknown `granteeUserId` → 404.

## Sharing from a detail view

A **«Поделиться»** control on each of the five detail views (account, goal,
budget, bill, topic), owner-only. It lists current grantees with a revoke
beside each, and a picker of family members to add from `GET /api/v1/users`.

- The picker excludes yourself — sharing with yourself is a 400, so don't
  offer it — and anyone the resource is already shared with, since a duplicate
  is a 409.
- Map the errors: 409 onto the picker («Уже есть доступ»), 404 on an unknown
  grantee as a generic failure. Never surface the 404-for-foreign-resource
  case as anything other than "not found" — the backend deliberately makes a
  foreign id indistinguishable from a missing one, and the UI must not undo
  that by wording it differently.
- `GET /api/v1/shares/outgoing` powers a **«Чем я делюсь»** list, so revoking
  everything does not mean visiting five pages.

## What a share discloses — say it at the moment of sharing

**Per-type wording, not one generic warning.** The share dialog states plainly
what the grantee will be able to see, before the grant is made. "Share my
account" sounds narrower than it is.

| Type | The UI must say |
|---|---|
| **Счёт** | Balance **and the whole transaction history** — every amount, date, note, and the category and event names on those rows. |
| **Событие** | Its totals **and every attached transaction**, including ones belonging to accounts you have not shared. **The widest of the five — be loudest here.** |
| **Цель** | The target and progress **and the linked account's name, currency and balance**. See the note below. |
| **Бюджет** | The category, the limit and the usage, for any month — but not the transactions behind it. |
| **Платёж** | Only the bill itself. |

### ⚠ The goal case, and why the backend's fallback does not work

The backend flags the goal disclosure as an assumption and offers, as the
alternative, "a goal response that shows only a percentage to viewers".

**That alternative protects nothing, and the frontend should say so rather
than implement it.** Progress *is* `balance / targetAmount`. If a viewer can
see the percentage and the target — and a goal without its target is not worth
sharing — then the balance is one multiplication away. Hiding the number while
publishing both of its factors is theatre, and worse than honest disclosure
because it tells the sharer they are protected when they are not.

So there are only two real options:

1. **Disclose it, and say so loudly** — the dialog names the account whose
   balance becomes visible. **This is the recommendation.**
2. **Don't allow goal sharing**, if that disclosure is not acceptable.

Anything in between is a false promise. Whichever is chosen, the dialog must
name the account explicitly: «Будет виден баланс счёта „Депозит“», not a
vague note about progress.

**Settled with the backend (`827def4`): option 1, binary.** The share dialog
discloses the balance and names the account. The guard that comes with it:
**if a percentage-only goal response is ever added for viewers, it must drop
`targetAmount` too.** A percentage beside its target is the balance written
in two numbers instead of one, and shipping that would reintroduce exactly
the false promise this section rejects.

**As built, the disclosure is wider than "the balance is derivable".** A
shared goal carries `linkedAccount` **with its balance on it**. The backend
confirmed this against a running instance: the grantee reads the balance of
«Каспи Голд» through the goal while `GET /accounts/{that id}` still 404s for
them. So the dialog is not warning about an inference — it is warning about a
number the viewer is handed. Name the account.

## Rendering a viewer's screens

- **Reuse the normal detail pages** in viewer mode rather than building
  parallel read-only ones. Two implementations of the same screen drift, and
  the one used less often drifts faster — which here means the one with the
  access rules in it.
- The read-only marker and the absence of write controls are driven by
  `access`, which every response carries. Never infer it from anything else.
- **An unresolvable account on a shared row needs its own wording, not the
  deleted-account fallback.** A transfer out of a shared account into one that
  isn't shared, or a topic's transactions across unshared accounts, leaves an
  `accountId` the viewer cannot resolve. The mechanism is the same missing-name
  case as a soft-deleted account, but the *meaning* is not: that account exists
  and is perfectly healthy, it simply isn't yours to see. Rendering «Удалённый
  счёт» there would state something false. Use «Другой счёт» — the fallback
  helper takes the label, so this is a parameter, not a second helper.
- **Nothing shared appears in any total.** The dashboard, the monthly summary
  and budget usage stay own-only, and no viewer-side figure is ever added to
  them. If a shared item ever shows up in one, stop and fix it before shipping
  anything else: two people's dashboards would disagree about the same
  household and both would be right.

## Russian labels

- «Участники семьи» — the member list
- «Поделиться» — the action
- «Общий доступ» — the sharing screen itself, and its nav entry
- «Доступно мне» — incoming shares, a tab within it
- «Чем я делюсь» — outgoing shares, the other tab
- «Доступно для просмотра» — the read-only marker
- «владелец: …» — the owner, on the marker and on each shared row
- «Выберите участника» — the picker's own text, which must not repeat its label
- «Другой счёт» — an account the viewer cannot resolve

The screen and its first tab must not share a name. «Доступно мне» as both the
heading and the tab beneath it reads as a rendering fault.

## Deleting a member breaks shares unless it revokes them

Raised as an open question here; **answered, and the answer is sharper than
the question.** Verified in the backend source: `User` carries
`@SQLRestriction("is_deleted = false")`, unlike `Category`, `Topic`, `Account`
and `Budget`, which deliberately don't.

That restriction applies to relationship loading. A `Share` holds a
**non-nullable** association to its grantee and to its owner, so once either
is soft-deleted, Hibernate refuses to return the row the association points
at. The outgoing list wouldn't render a share with a blank name — **it would
fail when it read that share**. A 500, not a cosmetic gap.

So the frontend cannot fix this with a fallback label, and denormalising the
display name onto the share would only paper over a broken association.
Dropping the restriction from `User` isn't available either: it is what stops
a deleted member authenticating, and the JWT filter depends on it.

### It is not only `Share` — every shareable thing has the same association

Confirmed in the backend source, and written into its spec as `827def4`. All
six declare `owner` as `@ManyToOne(optional = false)` onto `User` —
`Account`, `Goal`, `Budget`, `Bill`, `Topic`, and `Category` too. The problem
is the ownership edge itself, not the share row.

**Why this has never fired:** nothing dereferences `owner` for its fields
today. Across every service it is only assigned, or compared for an ownership
check (`goal.owner != owner`, `GoalServiceImpl.kt:98`), and `dto/Mappers.kt`
does not mention `owner` at all. The owner is always the caller — who cannot
be soft-deleted, or they would not have authenticated past
`JwtAuthenticationFilter`. **Phase 8's `owner: {id, displayName}` is the
first reader in the system that resolves an owner who is not the requester.**
That is what turns a dormant association into a 500.

**The rule, as landed with the backend:** a user delete must leave **no
resolvable path from a live row to their `User`**. In practice their
resources go with their shares. Revoking grants clears `Share` rows and does
**not** touch ownership — two separate obligations, and doing only the first
still leaves every account, goal, budget, bill, topic and category they owned
pointing at a `User` Hibernate will refuse to load.

**The case worth testing** is a viewer reading a resource whose owner was
removed. Not an owner reading a grant to someone removed: revoke-on-delete
makes the soft-deleted grantee unreachable, so that path is already closed by
the rule above.

There is **no user-delete endpoint today**, so this is a constraint on
whoever adds one rather than work for this phase. It is written down here so
it isn't rediscovered as a 500 in production.

## Resolved while building

- **`scope=SHARED` is used after all, and `/shares/incoming` is still the
  right entry point.** This spec originally proposed incoming alone, reasoning
  that a row carrying `resourceName` and `owner` "is the whole screen". It
  isn't: that produces a list of labels next to sections showing real figures.
  The two answer different questions and both are needed — incoming says *what
  is shared and by whom* in one call, and `scope=SHARED` supplies the figures
  for the types actually present. What the original note got right is the part
  worth keeping: don't fan out five `scope=SHARED` calls to discover what
  exists, when one call already says so.
- **Not `scope=ALL`.** It returns owned rows first, then shared, each group
  sorted by name — not one sorted list. Nothing here needs it: the owned lists
  send no `scope` and this screen wants only what others share.

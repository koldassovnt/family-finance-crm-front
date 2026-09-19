# Phase 8 — Sharing («Поделиться»)

Status: **spec'd, not built — on either side.** The backend's own doc is
`.claude/requirements/phase-8-sharing.md` in its repo (pushed, `3707d55`);
read it for the data model, the endpoints and the exposure decisions. This
file covers only what the frontend has to decide.

See `00-architecture-and-foundations.md` for the stack, formatting rules, auth
and error contract this builds on.

A member shares **one specific thing they own** — an account, goal, budget,
bill or topic — with another household member, who can then **view it and
nothing more**. Controlled from that resource's own detail view. Everyone has
it, not just the `OWNER`.

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

### 2. A separate «Доступно мне» screen — not mixed lists

**Decided: keep `scope=OWN` everywhere it is already used, and put shared
things on their own screen**, built from `GET /api/v1/shares/incoming`.

The temptation is `scope=ALL` on `/accounts`, badging the rows. Reject it,
because of the rule the backend states plainly: **a shared resource
contributes nothing to the viewer's own figures**. A mixed accounts list would
show rows that deliberately do not feed the dashboard, the summary or any
budget — a list where some rows count toward your totals and some silently do
not is a trap, and badging fixes identity without fixing arithmetic. Someone
would add up the column, disagree with their own dashboard, and be right to.

One screen where *nothing* counts toward your totals is honest; a mixed list
where *some* rows do is not. So:

- `/shared` — «Доступно мне», grouped by resource type, each row badged with
  its owner, linking to that resource's normal detail page in viewer mode.
- Existing lists keep their current behaviour, unchanged, with no `scope`
  parameter sent. Nothing already built alters its meaning.
- Revisit mixed lists only if the "never mixes into totals" rule ever changes —
  which it should not.

---

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
- «Доступно мне» — incoming shares
- «Чем я делюсь» — outgoing shares
- «Доступно для просмотра» — the read-only marker
- «Другой счёт» — an account the viewer cannot resolve

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

**The rule: deleting a member must soft-delete their shares in the same
transaction, in both directions** — those they granted and those granted to
them. That keeps every share row resolvable, and it is what anyone would
expect anyway: a member removed from the household loses access.

There is **no user-delete endpoint today**, so this is a constraint on
whoever adds one rather than work for this phase. It is written down here so
it isn't rediscovered as a 500 in production.

## Open questions for whoever builds this
- `scope=SHARED` exists and this spec doesn't use it: `/shares/incoming`
  already returns everything across the five types in one call, which is what
  the «Доступно мне» screen needs. If that turns out to lack a field the screen
  wants, prefer fixing the incoming payload over fanning out five `scope=SHARED`
  calls.

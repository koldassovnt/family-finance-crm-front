# Phase 9 — Planned purchases

**Status: built, not yet used in a browser, not deployed.** Written on
2026-10-13 from the contract the backend session sent the same day (backend
1.3.0). Spec: `.claude/requirements/phase-9-planned-purchases.md`.

## Built

- **`/purchases`** («Покупки») — two lists, «Мои» and «Семейные», from one
  request; an add form with a choice of list; a tick and a delete per item.
- **`PlannedPurchase`** in the API types and `plannedPurchasesApi` with all
  four calls, including the rename the screen does not use.

## Decisions worth remembering

- **This replaced a larger design.** The backend first shipped family
  *expenses* — a flag on transactions and a household view with totals — and
  the owner rejected it as too complicated before any frontend was written for
  it. Nothing of it exists here. The lesson is in the spec: keep this feature
  as small as the request.
- **The scope was agreed with the owner before building:** two lists, add,
  tick, delete; confirmation on family deletes only; no rename in the first
  version.
- **Personal is the default list** in the add form, so the unconsidered case
  is the private one.
- **A 404 on an item is treated as "someone else deleted it"**, not as an
  error: a family item is everyone's, so the race is ordinary.
- **The add form is `useState`, not react-hook-form.** It is one text field
  and a select; a schema and a resolver would be more code than the form.
- **No optimistic update on the tick.** The list reloads after each change,
  which also applies the server's reordering. On a home LAN the delay is not
  worth a second code path that can disagree with the server.

## Verification

`tsc -b`, `vite build` and `oxlint` only, in the Docker build stage. The
endpoint answers 401 without a token, so it exists in the running backend. No
authenticated request was sent and nothing was rendered. To drive by hand, with
two users:

- add a personal and a family item; the personal one is absent for the other
  user, the family one is there with the adder's name;
- tick and untick in both lists, and see a ticked item move below the others;
- delete a personal item (no dialog) and a family one (dialog);
- as the second user, tick a family item the first user has already deleted
  without reloading — expect «Этой покупки уже нет в списке»;
- submit a blank name;
- the layout at phone width, and the add button lining up with the inputs.

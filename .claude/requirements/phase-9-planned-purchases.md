# Phase 9 — Planned purchases («Покупки»)

Frontend for the backend's phase 9 (backend 1.3.0, 2026-10-13). The backend's
doc is `.claude/requirements/phase-9-planned-purchases.md` in its repo.

## Where it came from

The owner's wife asked for a way to write down shared family purchases next to
personal ones. A first, larger design — expenses marked as family, with a
household view of amounts and categories — was built on the backend and
**rejected by the owner as too complicated**, then removed. This is what
replaced it. **Keep it as simple as the request**: when in doubt about adding
something here, don't.

## What it is

A list of things to buy. An item has a name, is personal or family, and is
bought or not.

- **It is not part of the ledger.** No amount, date, category or account, and
  marking an item bought creates no transaction. The page says so, because a
  screen about purchases in a finance app looks like it might.
- **A family item is everyone's.** Any member sees it, marks it, deletes it.
- **A personal item is only its creator's.** The API never sends anyone else's.
- So **every item the list returns is editable by the caller** — there is no
  read-only row and no owner check on the frontend.

## Screen — `/purchases`

In the nav after «События», open to every role.

- **Two lists side by side from `lg`**, «Мои» and «Семейные», split client-side on
  `isFamily` from the one `GET`. Stacked below that.
- **The family hint sits on the heading's line**, never on a line of its own:
  only one list has a hint, and its own line would start that list lower than
  the other. That is also why the lists pair up only from `lg` — narrower, the
  hint wraps.
- **One add form above them:** the name and a select for which list, **«Мой»
  by default** — the private choice, so a forgotten selection hides an item
  rather than publishing it. The name is required; a blank one is caught
  before the request.
- **Per item:** a checkbox for bought and a delete button. A bought item is
  struck through and muted. Family items show who added them; personal ones
  don't, since it is always the viewer.
- **Order is the server's:** still-to-buy first, then newest. Don't re-sort.
  Bought items stay until deleted.
- **Deleting a family item confirms; a personal one does not.** The family
  delete reaches everyone's list. A personal one affects nobody else and is one
  line to retype.
- **A 404 on a tick or a delete means another member deleted the item first.**
  Say «Этой покупки уже нет в списке» and reload — it is not a server error.
- With nothing in either list the page shows one empty message; once either
  list has an item, the other says it is empty under its own heading.

## API

All under `/api/v1/planned-purchases`, any logged-in user.

| Method | Path | Notes |
|---|---|---|
| GET | `/planned-purchases` | own personal items + every family item; no parameters |
| POST | `/planned-purchases` | `{name, isFamily}`; name ≤ 255, trimmed by the server; 201 |
| PATCH | `/planned-purchases/{id}` | `{isBought}` and/or `{name}`; absent means unchanged |
| DELETE | `/planned-purchases/{id}` | 204, soft delete |

`isFamily` **cannot be changed** after creation — moving an item between the
lists is delete and add again. Errors are the usual shape: 400 with
`fieldErrors.name` for a blank name, 404 for an unknown, deleted or
someone-else's id.

Nothing else in the app reads these, so the mutations invalidate only
`['planned-purchases']`.

## Not built, on purpose

- **Renaming.** The API supports it (`PATCH {name}`); the screen doesn't offer
  it. Delete and retype covers a shopping list. Add it only if asked.
- **Moving between lists** — not possible in the API.
- **No link to transactions**, in either direction: no "record this as an
  expense" button. That connection is exactly what was rejected.
- No amounts, quantities, dates, categories, ordering by hand, or clearing all
  bought items at once.
- No live updates: another member's change appears on the next load or after
  your own next action.

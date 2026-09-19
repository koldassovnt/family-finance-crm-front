# Settings

Status: **built**. See `00-architecture-and-foundations.md` for the stack,
formatting rules, auth and error contract this builds on.

Not a backend phase — these three screens cover endpoints spread across
Phase 0/1, so they are grouped here by where they live in the UI.

## `/settings/categories` — the tree

- Categories arrive as a **flat list with `parentId`** to arbitrary depth
  (`GET /api/v1/categories`); build the tree client-side, there is no nested
  endpoint. Indent by depth rather than assuming two levels — the real data is
  three deep and branches at the bottom.
- **Expense and income are separate trees.** They never mix, and a category's
  `kind` decides which transactions may use it.
- **`kind` is fixed after creation.** Changing it would strand every transaction
  already filed under the category, so editing offers name and parent only.
- **The parent picker excludes the category itself and everything beneath it.**
  Reparenting a category under its own descendant would detach the branch from
  the tree. Offer same-kind parents only.
- **Two different blocks share a 409, and the UI should say which**: a category
  with live sub-categories (re-parent or delete the children first), and one
  whose budget still has an open version (delete the budget first). Historical
  transactions **never** block a delete — they keep the category and keep
  rendering its name, so deleting only removes it from the pickers.

## `/settings/password`

- `POST /api/v1/users/me/password` returns 204.
- **A successful change is a logout.** It moves `passwordChangedAt` forward and
  the JWT filter rejects every token issued before it — including the one making
  the call. Sign out and return to login rather than leaving the user on a
  screen whose next request 401s.
- Reachable from the display name in the header.

## `/settings/users`

- **`OWNER` only**, and **create-only**: there is no list-users endpoint, so a
  table would be a table of nothing. `GET /api/v1/users/me` returns just the
  caller. Say so on the screen rather than leaving an empty table.
- **The form offers no role.** The endpoint can only create a `MEMBER` and
  rejects a request for `OWNER`.
- The route is gated client-side for convenience only — the server returns 403
  `FORBIDDEN` to a `MEMBER` regardless, and that is the real boundary.

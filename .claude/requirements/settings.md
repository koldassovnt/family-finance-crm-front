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

## `/settings/profile` — «Профиль»

Your own account, any role. Reachable from the display name in the header.
`/settings/password`, its old address, redirects here.

### Telegram username

Added in backend 1.5.0 (commit 8c9aff0) for a Telegram bot that will know
people by their username. How the bot authenticates is not decided and is not
part of this screen.

- `PATCH /api/v1/users/me` with `{"telegramUsername": …}` edits only the
  caller and returns the updated user. The server trims the input and accepts
  it with or without the "@"; it always **stores and returns it with the "@"**.
- **An empty input sends `null`, which clears it.** A body without the field
  changes nothing.
- 400 `VALIDATION_FAILED` with `fieldErrors.telegramUsername` unless it is 5–32
  of `A-Z a-z 0-9 _` (Telegram's own rule). Check the same rule before sending.
- 409 `CONFLICT` when another user already holds it, compared ignoring case.
  Show it under the field.
- Saving keeps the session, so replace the signed-in user with the response.

### Password

- `POST /api/v1/users/me/password` returns 204.
- **A successful change is a logout.** It moves `passwordChangedAt` forward and
  the JWT filter rejects every token issued before it — including the one making
  the call. Sign out and return to login rather than leaving the user on a
  screen whose next request 401s.

## `/settings/users`

- **`OWNER` only**, and **create-only**: there is no list-users endpoint, so a
  table would be a table of nothing. `GET /api/v1/users/me` returns just the
  caller. Say so on the screen rather than leaving an empty table.
- **The form offers no role.** The endpoint can only create a `MEMBER` and
  rejects a request for `OWNER`.
- The route is gated client-side for convenience only — the server returns 403
  `FORBIDDEN` to a `MEMBER` regardless, and that is the real boundary.
- **The Telegram username is optional on create**, on the same terms as on the
  profile page. Leave it out of the request when blank. A 409 here can mean the
  email or the username is taken.

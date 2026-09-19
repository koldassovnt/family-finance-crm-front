# Settings screens

The three screens behind `/settings/*`. They aren't a backend phase — they
cover endpoints spread across Phase 0/1 — so they get their own file.

## Built

- **`/settings/categories`** — the tree, create/edit/delete.
- **`/settings/password`** — change your own password.
- **`/settings/users`** — `OWNER`-only, create-only.

## Decisions worth remembering

- **The category tree is built client-side and rendered recursively.** The API
  returns a flat list with `parentId` to arbitrary depth; indentation comes
  from depth, not from a fixed two-level layout.
- **Kind is fixed after creation.** Changing it would strand every transaction
  already filed under the category, so editing offers name and parent only.
  Expense and income render as separate trees — they never mix.
- **The parent picker excludes the category and its descendants.** Reparenting
  a category under its own child would detach the branch from the tree.
- **A successful password change is a logout.** `passwordChangedAt` moves
  forward and the JWT filter rejects every token issued before it, including
  the one making the call — so the page signs out rather than leaving the user
  on a screen whose next request 401s.
- **`/settings/users` is create-only and says so.** There is no list-users
  endpoint, and the form offers no role, since the endpoint can only create a
  `MEMBER`.

## Verified against the running backend

- The tree builder against the live categories: three levels deep, branching
  at the bottom (Продукты → Кофе → Зёрна and Оборудование), which is what
  distinguishes real recursion from a two-level special case.
- The owner-only guard from both sides, earlier: a `MEMBER` token gets 403
  `FORBIDDEN` from `POST /users` regardless of what the client hides.

## Open

- Deleting a category blocked by a budget or by children returns 409 with a
  server message; neither block has been triggered from the UI.
- Changing a password has not been exercised — doing so would invalidate the
  seeded credentials everything else is tested with.

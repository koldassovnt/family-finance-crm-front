# Phase 5 — Investments

**Status: built, not yet driven against the backend.** The backend half went
live on 2026-10-08 (its main `3d4da41`); this was written the same day from the
contract its session handed over. Spec: `.claude/requirements/phase-5-investments.md`.

## Built

- **`CRYPTO` account type** in the account form.
- **Trades in the operation form.** A broker or crypto account offers only
  «Сделка» and «Перевод»; the account field moved above the type because it now
  decides which types exist.
- **Trades in the ledger tables** — titled by side and ticker, with
  quantity × price beneath.
- **Editing and deleting a trade**, including the 409 when the change would
  leave a ticker oversold.
- **`/investments`** — holdings at cost, grouped by currency, with the
  «Добавить имеющийся актив» entry point for `OPENING`.
- **Holdings on `/accounts/:id`** for a broker or crypto account, viewer
  included.

## Decisions worth remembering

- **Nothing is called a value.** Every figure is purchase cost, so the column is
  «Вложено». When prices arrive they are new columns.
- **`OPENING` is a separate button, not a third side.** It moves no cash and is
  how an existing portfolio gets in; beside Buy and Sell it would read as a kind
  of deal.
- **One form, not two.** The opening dialog is the operation form with an
  `opening` flag rather than a copy, so the trade validation exists once.
- **The amount's validation moved out of its zod transform** into the
  cross-field refinement. A trade has no amount input, so an empty string is
  correct there and an error only for the other types.
- **Trades are signed but not coloured.** They are neither income nor expense,
  and the monthly summary ignores them.
- **Three number formatters, on purpose.** `formatQuantity` (up to 10 decimals,
  zeros trimmed), `formatUnitPrice` (a typed price, never rounded) and
  `formatAveragePrice` (a derived price, rounded).
- **Totals are never re-added client-side** — the KZT ones are sums of
  per-purchase conversions and cannot be.
- **A sale exceeding the holding is left to the server**, which reports it on
  `quantity`.

## Verification

**`tsc -b`, `vite build` and `oxlint` only**, run in the Docker build stage
because this machine has no Node. No request was sent to the backend and
nothing was rendered in a browser — the phase 8 notes are the reminder that
those catch different things. Still to drive by hand:

- a `BUY` on a USD broker account, then the row in `/transactions` and the
  position in `/investments`;
- a fractional crypto quantity end to end, including reopening it in the edit
  dialog;
- a `SELL` above the holding (400 on `quantity`) and deleting a purchase that
  was later sold (409);
- an `OPENING` with a past date, confirming the account balance does not move;
- a shared broker account as a viewer: holdings visible on the account page,
  absent from the viewer's `/investments`.

## Seeded data

None. The backend session added no accounts or trades; the live database only
received migration V9.

# Phase 0 + 1 — Foundation & Ledger

Status: **built**. See `00-architecture-and-foundations.md` for the
stack, formatting rules, auth and error contract this builds on.

- Login screen
- Accounts list + account detail
- Add/edit account form. Account types as built: `CASH`, `BANK`, `DEPOSIT`,
  `BROKER` (no card/loan/mortgage types). `CASH` has no bank; every other type
  takes an optional bank picked from `GET /api/v1/banks`, which is a global
  list — `POST /api/v1/banks` is find-or-create by name, so a combobox that
  creates on the fly is the right control. Only `name` and `bankId` are
  editable afterwards: type, currency and balance are fixed at creation, and
  the balance moves only through transactions.
- Transaction entry form (income / expense / transfer — form fields change
  based on type; a transfer between differently-currencied accounts must show
  a second `toAmount` input)
    - **`exchangeRate` (KZT per 1 unit) is required whenever the account isn't
      in KZT,** and must be absent or `1` when it is. Every total the backend
      reports is KZT, derived from that rate, so this input is not optional
      polish — a foreign-currency transaction cannot be saved without it.
    - Editing is restricted to amount, exchange rate, date, category and note.
      Changing the type or either account means delete and recreate, so the
      edit form must not offer those fields.
    - **`amountKzt` is re-derived from the post-update state**, so amount and
      rate can be corrected together or separately and the KZT figure follows.
      Editing `amount` also reverses and re-applies the balance effect, and
      only ever touches the accounts the transaction already has. A PATCH that
      touches neither money field recomputes nothing.
    - **`exchangeRate` is validated against the transaction's own currency**,
      not the request's: a KZT transaction rejects any rate but 1. Show the
      field on the same rule as the create form — only when the transaction's
      currency isn't KZT.
    - **`toAmount` is patchable, and on a cross-currency transfer it travels
      with `amount`.** This is server-enforced, not a convention:
      - Changing `amount` on a cross-currency transfer **requires** `toAmount`
        in the same request — 400 with a `toAmount` field error otherwise. Sent
        together, each side moves by its own figure in one reverse/apply pass,
        so the transaction is never half-corrected.
      - `toAmount` alone is valid and corrects only the destination side.
      - `toAmount` on anything else — a same-currency transfer, an income, an
        expense — is a 400.
      So the edit form presents the two fields together and submits them
      together. Both rejections key their `fieldErrors` to `toAmount`, so they
      land on the right input with no special handling.
      - `amountKzt` re-derives from `amount` and `exchangeRate` only: it
        describes the **source** movement, so correcting `toAmount` doesn't
        touch it.
    - Future dates are rejected (today in `Asia/Almaty`); cap the date picker.
    - **`toAmount` is required when the two accounts' currencies differ and
      rejected when they match** — not "optional when they match". Show the
      input only on a cross-currency transfer and omit the key entirely
      otherwise; sending a redundant value is a 400, not a no-op.
    - **The category must match the type's kind**: an `EXPENSE` transaction
      needs an `EXPENSE` category, `INCOME` needs `INCOME`. Filter the picker by
      kind rather than letting the backend reject the mismatch — the list comes
      back flat with a `kind` field on every row, so this is a client-side
      filter, not another call.
    - **`TRANSFER` and `ADJUSTMENT` carry no category at all** and one is
      rejected if supplied. Hide the field for those types; don't send `null`
      into a create body either (see the PATCH note — absent, not null).
    - **Deleting a transaction reverses its balance effect** on both accounts
      for a transfer. It is a soft delete, but the balance moves, so it needs a
      confirm dialog rather than a one-click row action — this is the only
      destructive action in the ledger that silently changes a number elsewhere
      on screen.
- Balance-correction ("reconcile") action on an account: enter the balance
  your bank actually shows via `POST /api/v1/accounts/{id}/reconcile`, and the
  backend writes the `ADJUSTMENT` for the difference. `ADJUSTMENT` is rejected
  on the ordinary transaction endpoint, so this is the only route to one. It
  400s when the balance already matches — show that as an ordinary message,
  not an error state. A non-KZT account needs `exchangeRate` here too.
- Negative balances are legal — show them in red rather than blocking entry
- Transaction history per account (remember: a transfer shows up for both accounts involved, per the backend doc)
- Monthly summary: income vs. expense, broken down by category —
  `GET /api/v1/transactions/summary?month=2026-09`, defaulting to the current
  Almaty month. Totals are **always KZT** regardless of account currency, and
  `TRANSFER`/`ADJUSTMENT` are excluded. Uncategorised spending comes back with
  a null `categoryId`/`categoryName`, so the chart needs a label for it.
    - **Decided: this lives on the dashboard, not its own route.** It is a
      single call and it is exactly the "this month at a glance" the dashboard
      is specified as. Give the dashboard a month selector so past months are
      reachable — the same control `/budgets` needs, which makes the two read
      as one system. A separate reports page only earns its place with Phase
      6's XLSX export, which is out of scope; if a drill-down is wanted before
      then, mount the same component at a route rather than building a second
      view.
- Categories arrive as a **flat list with `parentId`** (`GET /api/v1/categories`,
  `kind` is `EXPENSE` or `INCOME`) — build the tree client-side; there is no
  nested endpoint.
    - **Two things block a delete, both 409, and the UI should say which.** A
      category with live sub-categories cannot be deleted (re-parent or delete
      the children first), and neither can one whose budget still has an open
      version (delete the budget first). Historical transactions **never** block
      it — they keep the category and keep rendering its name.
    - A `parent` must belong to the same owner, and kind is fixed by what the
      category is for — the tree editor only needs to offer name and parent.

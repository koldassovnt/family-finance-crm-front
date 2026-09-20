import type { Account, AccountSummary } from '@/api/types'
import { strings } from '@/strings'

/**
 * A transaction references accounts by id only, and `GET /accounts` returns
 * active accounts only — an account can be soft-deleted while its transactions
 * remain (only an *active* goal blocks the delete; transactions are never
 * checked). So this lookup legitimately misses, and the fallback is a label
 * rather than `undefined` or a crash.
 */
export function accountNameLookup(
  accounts: (Account | AccountSummary)[] | undefined,
  /**
   * What to call an id that isn't in the list. Defaults to «Удалённый счёт»,
   * which is right for your own ledger and wrong for a viewer: the other side
   * of a transfer out of a shared account is missing because it wasn't shared,
   * not because it was deleted. Same mechanism, opposite meaning — so the
   * caller supplies the label rather than this growing a second function.
   */
  fallback: string = strings.common.deletedAccount,
) {
  const byId = new Map((accounts ?? []).map((account) => [account.id, account]))
  return {
    name: (id: string | null): string => {
      if (id === null) return ''
      return byId.get(id)?.name ?? fallback
    },
    get: (id: string | null): Account | AccountSummary | undefined =>
      id === null ? undefined : byId.get(id),
  }
}

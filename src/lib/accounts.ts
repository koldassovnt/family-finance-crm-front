import type { Account } from '@/api/types'
import { strings } from '@/strings'

/**
 * A transaction references accounts by id only, and `GET /accounts` returns
 * active accounts only — an account can be soft-deleted while its transactions
 * remain (only an *active* goal blocks the delete; transactions are never
 * checked). So this lookup legitimately misses, and the fallback is a label
 * rather than `undefined` or a crash.
 */
export function accountNameLookup(accounts: Account[] | undefined) {
  const byId = new Map((accounts ?? []).map((account) => [account.id, account]))
  return {
    name: (id: string | null): string => {
      if (id === null) return ''
      return byId.get(id)?.name ?? strings.common.deletedAccount
    },
    get: (id: string | null): Account | undefined =>
      id === null ? undefined : byId.get(id),
  }
}

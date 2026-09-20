import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { sharesApi } from '@/api/endpoints'
import type { Share } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatInstantDate } from '@/lib/format'
import { strings } from '@/strings'

/**
 * Everything you have opened to someone, in one place, so revoking a person's
 * access does not mean remembering which five screens you granted it from.
 */
export function OutgoingShares() {
  const queryClient = useQueryClient()
  const outgoing = useQuery({ queryKey: ['shares', 'outgoing'], queryFn: sharesApi.outgoing })

  const revoke = useMutation({
    mutationFn: (id: string) => sharesApi.remove(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['shares'] })
      toast.success(strings.sharing.revoked)
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  return (
    <QueryState query={outgoing} empty={strings.sharing.nothingOutgoing}>
      {(shares: Share[]) => (
        <ul className="divide-y rounded-md border">
          {shares.map((share) => (
            <li key={share.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
              <Badge variant="outline" className="shrink-0">
                {strings.sharing.resourceTypes[share.resourceType]}
              </Badge>
              <span className="truncate font-medium">
                {share.resourceName ?? strings.sharing.resourceTypes[share.resourceType]}
              </span>
              <span className="truncate text-sm text-muted-foreground">
                {share.grantee.displayName}
              </span>
              {/* Nullable in the DTO — it is BaseEntity.createdAt. */}
              {share.sharedAt !== null && (
                <span className="shrink-0 text-xs text-muted-foreground">
                  {strings.sharing.sharedAt} {formatInstantDate(share.sharedAt)}
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="ms-auto shrink-0"
                disabled={revoke.isPending}
                onClick={() => revoke.mutate(share.id)}
              >
                {strings.sharing.revoke}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </QueryState>
  )
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { sharesApi, usersApi } from '@/api/endpoints'
import type { Share, ShareResourceType, User } from '@/api/types'
import { FieldSelect } from '@/components/FieldSelect'
import { QueryState } from '@/components/QueryState'
import { useAuth } from '@/auth/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { formatInstantDate } from '@/lib/format'
import { strings } from '@/strings'

interface ShareButtonProps {
  resourceType: ShareResourceType
  resourceId: string
  /** Named in the dialog's subtitle so it is unambiguous what is being shared. */
  resourceName: string
  /**
   * A goal only. The account whose balance the grant discloses outright —
   * `linkedAccount` travels inside the goal response with its balance on it,
   * while the account itself stays 404 for the grantee. The dialog names it,
   * because "the goal's progress" does not sound like "my deposit balance".
   */
  goalAccountName?: string
  /** Rendered as a plain button by default; the detail pages want it quieter. */
  variant?: 'outline' | 'ghost'
}

/**
 * Opens read-only access to one resource for one household member.
 *
 * Owner-only by construction: render it only where `access` is `OWNER`. The
 * listing endpoint behind it 404s for a viewer — deliberately, since a 403
 * would confirm the resource exists.
 */
export function ShareButton({
  resourceType,
  resourceId,
  resourceName,
  goalAccountName,
  variant = 'ghost',
}: ShareButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button size="sm" variant={variant} onClick={() => setOpen(true)}>
        {strings.sharing.share}
      </Button>
      {open && (
        <ShareDialog
          resourceType={resourceType}
          resourceId={resourceId}
          resourceName={resourceName}
          goalAccountName={goalAccountName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function ShareDialog({
  resourceType,
  resourceId,
  resourceName,
  goalAccountName,
  onClose,
}: Omit<ShareButtonProps, 'variant'> & { onClose: () => void }) {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const [granteeId, setGranteeId] = useState('')

  const shares = useQuery({
    queryKey: ['shares', resourceType, resourceId],
    queryFn: () => sharesApi.forResource(resourceType, resourceId),
  })
  const members = useQuery({ queryKey: ['users'], queryFn: usersApi.list })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['shares'] })
  }

  const grant = useMutation({
    mutationFn: () => sharesApi.create({ resourceType, resourceId, granteeUserId: granteeId }),
    onSuccess: () => {
      invalidate()
      setGranteeId('')
      toast.success(strings.sharing.granted)
    },
    onError: (error) => {
      // 409 is the one case with a better home than a generic toast: the pair
      // already exists, which is a statement about the person just picked.
      if (error instanceof ApiError && error.code === 'CONFLICT') {
        toast.error(strings.sharing.duplicate)
        return
      }
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  const revoke = useMutation({
    mutationFn: (id: string) => sharesApi.remove(id),
    onSuccess: () => {
      invalidate()
      toast.success(strings.sharing.revoked)
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  // Sharing with yourself is a 400 and a duplicate is a 409, so neither is
  // offered: the picker only lists people the grant could actually go to.
  const granted = new Set((shares.data ?? []).map((share) => share.grantee.id))
  const candidates = (members.data ?? []).filter(
    (member: User) => member.id !== me?.id && !granted.has(member.id),
  )

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{strings.sharing.shareTitle}</DialogTitle>
          <DialogDescription>
            {strings.sharing.resourceTypes[resourceType]} «{resourceName}»
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Said before the grant, not after: "share my account" sounds
              narrower than what a grantee actually gets. */}
          <Alert>
            <AlertDescription className="space-y-1">
              <span>{strings.sharing.disclosure[resourceType]}</span>
              {goalAccountName !== undefined && (
                <span className="font-medium">
                  {strings.sharing.goalAccountWarning(goalAccountName)}
                </span>
              )}
            </AlertDescription>
          </Alert>

          <div className="space-y-1.5">
            <Label htmlFor="share-grantee">{strings.sharing.addGrantee}</Label>
            {candidates.length === 0 ? (
              <p className="text-sm text-muted-foreground">{strings.sharing.noCandidates}</p>
            ) : (
              <div className="flex gap-2">
                <FieldSelect
                  id="share-grantee"
                  value={granteeId}
                  onChange={setGranteeId}
                  options={candidates.map((member) => ({
                    value: member.id,
                    label: member.displayName,
                  }))}
                  placeholder={strings.sharing.addGrantee}
                />
                <Button
                  type="button"
                  disabled={granteeId === '' || grant.isPending}
                  onClick={() => grant.mutate()}
                >
                  {strings.sharing.share}
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <p className="text-sm font-medium">{strings.sharing.sharedWith}</p>
            <QueryState query={shares} empty={strings.sharing.noGrantees}>
              {(rows: Share[]) => (
                <ul className="divide-y rounded-md border">
                  {rows.map((share) => (
                    <li key={share.id} className="flex items-center gap-2 px-3 py-2">
                      <span className="truncate">{share.grantee.displayName}</span>
                      {/* sharedAt is BaseEntity.createdAt and nullable in the DTO. */}
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
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            {strings.common.cancel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

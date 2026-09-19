import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { accountsApi, topicsApi } from '@/api/endpoints'
import type { Transaction } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { TransactionAmount } from '@/components/transactions/TransactionAmount'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Checkbox } from '@/components/ui/checkbox'
import { accountNameLookup } from '@/lib/accounts'
import { formatDate } from '@/lib/format'
import { strings } from '@/strings'

/**
 * Bulk attach, driven by `/candidates` — the way a trip actually gets tagged,
 * since you label it after getting home rather than one row at a time.
 *
 * Candidates are a **suggestion, never an action**: nothing is attached until
 * the user picks. The date window is a weak signal — a flight booked in March
 * belongs to a June trip, and lunch on the day you flew home may not be trip
 * spending at all — so every row starts unchecked.
 */
export function AttachCandidatesDialog({
  topicId,
  hasDates,
  open,
  onOpenChange,
}: {
  topicId: string
  /** `/candidates` 400s without both dates, so don't call it. */
  hasDates: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const candidates = useQuery({
    queryKey: ['topic-candidates', topicId],
    queryFn: () => topicsApi.candidates(topicId),
    enabled: open && hasDates,
  })
  const accounts = useQuery({ queryKey: ['accounts'], queryFn: accountsApi.list })
  const lookup = accountNameLookup(accounts.data)

  const attach = useMutation({
    mutationFn: () => topicsApi.attach(topicId, [...selected]),
    onSuccess: (attached) => {
      for (const key of ['topics', 'topic', 'topic-candidates', 'transactions']) {
        void queryClient.invalidateQueries({ queryKey: [key] })
      }
      toast.success(`${strings.topics.attached}: ${attached.length}`)
      setSelected(new Set())
      onOpenChange(false)
    },
    onError: (error) => {
      // All-or-nothing: a single bad id rejects the whole call, and the
      // message names the offenders.
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  function toggle(id: string) {
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{strings.topics.attachTitle}</DialogTitle>
          <DialogDescription>{strings.topics.candidatesHint}</DialogDescription>
        </DialogHeader>

        {!hasDates ? (
          <p className="text-sm text-muted-foreground">{strings.topics.candidatesNeedDates}</p>
        ) : (
          <QueryState query={candidates} empty={strings.topics.noCandidates}>
            {(rows: Transaction[]) => (
              <ul className="divide-y">
                {rows.map((transaction) => (
                  <li key={transaction.id}>
                    <label className="flex cursor-pointer items-center gap-3 py-2">
                      <Checkbox
                        checked={selected.has(transaction.id)}
                        onCheckedChange={() => toggle(transaction.id)}
                      />
                      <span className="w-24 shrink-0 text-sm tabular-nums text-muted-foreground">
                        {formatDate(transaction.occurredOn)}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm">
                        {transaction.category?.name ??
                          strings.transactions.types[transaction.type]}
                        <span className="text-muted-foreground">
                          {' · '}
                          {lookup.name(transaction.accountId)}
                        </span>
                      </span>
                      <TransactionAmount transaction={transaction} />
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </QueryState>
        )}

        <DialogFooter className="items-center gap-3 sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {strings.topics.selected}: {selected.size}
          </span>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {strings.common.cancel}
            </Button>
            <Button
              type="button"
              disabled={selected.size === 0 || attach.isPending}
              onClick={() => attach.mutate()}
            >
              {strings.common.add}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

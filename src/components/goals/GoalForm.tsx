import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { goalsApi } from '@/api/endpoints'
import type { Account, Goal, GoalStatus, GoalType } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { parseMoney } from '@/lib/format'
import { strings } from '@/strings'

const GOAL_TYPES: GoalType[] = ['SAVINGS', 'EMERGENCY_FUND']
const GOAL_STATUSES: GoalStatus[] = ['ACTIVE', 'ABANDONED', 'ARCHIVED']

/**
 * The linked account is fixed once set — progress is measured against it, so
 * swapping it would silently rewrite what every past reading meant. Status is
 * editable here because it is purely user-set; there is no ACHIEVED state to
 * compete with it.
 */
export function GoalForm({
  goal,
  accounts,
  open,
  onOpenChange,
}: {
  goal: Goal | null
  accounts: Account[]
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const isEditing = goal !== null

  const [name, setName] = useState(goal?.name ?? '')
  const [type, setType] = useState<GoalType>(goal?.type ?? 'SAVINGS')
  const [targetAmount, setTargetAmount] = useState(
    goal === null ? '' : String(goal.targetAmount),
  )
  const [targetDate, setTargetDate] = useState(goal?.targetDate ?? '')
  const [accountId, setAccountId] = useState(goal?.linkedAccount.id ?? '')
  const [status, setStatus] = useState<GoalStatus>(goal?.status ?? 'ACTIVE')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const linkedCurrency =
    accounts.find((account) => account.id === accountId)?.currency ??
    goal?.linkedAccount.currency

  const mutation = useMutation({
    mutationFn: () => {
      if (isEditing) {
        return goalsApi.update(goal.id, {
          name: name === goal.name ? undefined : name,
          targetAmount:
            parseMoney(targetAmount) === goal.targetAmount ? undefined : parseMoney(targetAmount),
          // Explicit null clears the date; absent leaves it alone.
          targetDate:
            targetDate === (goal.targetDate ?? '')
              ? undefined
              : targetDate === ''
                ? null
                : targetDate,
          status: status === goal.status ? undefined : status,
        })
      }
      return goalsApi.create({
        name,
        type,
        targetAmount: parseMoney(targetAmount),
        linkedAccountId: accountId,
        targetDate: targetDate === '' ? null : targetDate,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['goals'] })
      toast.success(isEditing ? strings.goals.updated : strings.goals.created)
      onOpenChange(false)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.hasFieldErrors) {
        setFieldErrors(error.fieldErrors)
        return
      }
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? strings.goals.editTitle : strings.goals.addTitle}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="goal-name">{strings.goals.name}</Label>
            <Input id="goal-name" value={name} onChange={(event) => setName(event.target.value)} />
            {fieldErrors.name !== undefined && (
              <p className="text-sm text-destructive">{fieldErrors.name}</p>
            )}
          </div>

          {!isEditing && (
            <div className="space-y-1.5">
              <Label>{strings.transactions.type}</Label>
              <Select value={type} onValueChange={(value) => setType((value ?? 'SAVINGS') as GoalType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map((goalType) => (
                    <SelectItem key={goalType} value={goalType}>
                      {strings.goals.types[goalType]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>{strings.goals.linkedAccount}</Label>
            {isEditing ? (
              <p className="text-sm">
                {goal.linkedAccount.name} · {goal.linkedAccount.currency}
              </p>
            ) : (
              <Select value={accountId} onValueChange={(value) => setAccountId(value ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder={strings.goals.linkedAccount} />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.name} · {account.currency}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            <p className="text-xs text-muted-foreground">{strings.goals.linkedAccountHint}</p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-target">
              {strings.goals.targetAmount}
              {linkedCurrency === undefined ? '' : `, ${linkedCurrency}`}
            </Label>
            <Input
              id="goal-target"
              inputMode="decimal"
              placeholder="0,00"
              value={targetAmount}
              onChange={(event) => setTargetAmount(event.target.value)}
            />
            {fieldErrors.targetAmount !== undefined && (
              <p className="text-sm text-destructive">{fieldErrors.targetAmount}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="goal-date">{strings.goals.targetDate}</Label>
            {/* Optional, and unlike a transaction date it may be in the future
                — that is the whole point of a target. */}
            <Input
              id="goal-date"
              type="date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </div>

          {isEditing && (
            <div className="space-y-1.5">
              <Label>{strings.goals.status}</Label>
              <Select
                value={status}
                onValueChange={(value) => setStatus((value ?? 'ACTIVE') as GoalStatus)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_STATUSES.map((goalStatus) => (
                    <SelectItem key={goalStatus} value={goalStatus}>
                      {strings.goals.statuses[goalStatus]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.status !== undefined && (
                <p className="text-sm text-destructive">{fieldErrors.status}</p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {strings.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={
              mutation.isPending ||
              name.trim() === '' ||
              targetAmount.trim() === '' ||
              (!isEditing && accountId === '')
            }
            onClick={() => mutation.mutate()}
          >
            {strings.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { budgetsApi } from '@/api/endpoints'
import type { Budget, Category } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FieldSelect } from '@/components/FieldSelect'
import { parseMoney } from '@/lib/format'
import { strings } from '@/strings'

/**
 * A budget's category is fixed after creation — usage for a different
 * category is simply a different budget — so editing offers only the limit
 * and the threshold.
 *
 * Editing the limit is not a correction of history: it closes the current
 * version and opens a new one from this month, so past months keep reporting
 * the limit that actually applied then. That reads as destructive without a
 * line of copy, hence the description.
 */
export function BudgetForm({
  budget,
  categories,
  budgetedCategoryIds,
  open,
  onOpenChange,
}: {
  /** Null creates; a budget edits it. */
  budget: Budget | null
  categories: Category[]
  /** Categories that already have a live budget — one per category. */
  budgetedCategoryIds: Set<string>
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const isEditing = budget !== null

  const [categoryId, setCategoryId] = useState(budget?.category.id ?? '')
  const [limit, setLimit] = useState(budget === null ? '' : String(budget.limitAmount))
  const [threshold, setThreshold] = useState(
    budget?.alertThresholdPercent === null || budget === null
      ? ''
      : String(budget.alertThresholdPercent),
  )
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Usage only ever counts EXPENSE transactions, so an income budget could
  // never read anything but zero — the API rejects one.
  const selectable = categories.filter(
    (category) =>
      category.kind === 'EXPENSE' &&
      (category.id === budget?.category.id || !budgetedCategoryIds.has(category.id)),
  )

  const mutation = useMutation({
    mutationFn: () => {
      const parsedThreshold = threshold.trim() === '' ? null : Number(threshold)
      if (isEditing) {
        return budgetsApi.update(budget.id, {
          limitAmount: parseMoney(limit),
          alertThresholdPercent: parsedThreshold,
        })
      }
      return budgetsApi.create({
        categoryId,
        limitAmount: parseMoney(limit),
        // Required by the API even though MONTHLY is its only value.
        period: 'MONTHLY',
        alertThresholdPercent: parsedThreshold ?? undefined,
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['budgets'] })
      toast.success(isEditing ? strings.budgets.updated : strings.budgets.created)
      onOpenChange(false)
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        // A duplicate belongs on the category field, not in a toast.
        if (error.code === 'DUPLICATE_BUDGET') {
          setFieldErrors({ categoryId: strings.budgets.duplicate })
          return
        }
        if (error.hasFieldErrors) {
          setFieldErrors(error.fieldErrors)
          return
        }
        toast.error(error.message)
        return
      }
      toast.error(strings.common.error)
    },
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? strings.budgets.editTitle : strings.budgets.addTitle}
          </DialogTitle>
          {isEditing && <DialogDescription>{strings.budgets.editHint}</DialogDescription>}
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>{strings.transactions.category}</Label>
            {isEditing ? (
              // Fixed after creation.
              <p className="text-sm">{budget.category.name}</p>
            ) : (
              <FieldSelect
                value={categoryId}
                onChange={setCategoryId}
                placeholder={strings.transactions.category}
                options={selectable.map((category) => ({
                  value: category.id,
                  label: category.name,
                }))}
              />
            )}
            {!isEditing && (
              <p className="text-xs text-muted-foreground">{strings.budgets.expenseOnly}</p>
            )}
            {fieldErrors.categoryId !== undefined && (
              <p className="text-sm text-destructive">{fieldErrors.categoryId}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget-limit">{strings.budgets.limit}</Label>
            <Input
              id="budget-limit"
              inputMode="decimal"
              placeholder="0,00"
              value={limit}
              onChange={(event) => setLimit(event.target.value)}
            />
            {fieldErrors.limitAmount !== undefined && (
              <p className="text-sm text-destructive">{fieldErrors.limitAmount}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="budget-threshold">{strings.budgets.alertThreshold}</Label>
            <Input
              id="budget-threshold"
              inputMode="numeric"
              placeholder="80"
              value={threshold}
              onChange={(event) => setThreshold(event.target.value)}
            />
            <p className="text-xs text-muted-foreground">{strings.budgets.alertThresholdHint}</p>
            {fieldErrors.alertThresholdPercent !== undefined && (
              <p className="text-sm text-destructive">{fieldErrors.alertThresholdPercent}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {strings.common.cancel}
          </Button>
          <Button
            type="button"
            disabled={
              mutation.isPending || limit.trim() === '' || (!isEditing && categoryId === '')
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

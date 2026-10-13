import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { plannedPurchasesApi } from '@/api/endpoints'
import type { PlannedPurchase } from '@/api/types'
import { FieldSelect } from '@/components/FieldSelect'
import { QueryState } from '@/components/QueryState'
import { PurchaseList } from '@/components/purchases/PurchaseList'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { strings } from '@/strings'

const MINE = 'mine'
const FAMILY = 'family'

/**
 * A shopping list, in two halves: your own and the family's. It is not part of
 * the ledger — an item has a name and a tick, and ticking it records nothing
 * anywhere else, so no other query is invalidated from here.
 */
export function PurchasesPage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [list, setList] = useState<string>(MINE)
  const [nameError, setNameError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<PlannedPurchase | null>(null)

  const purchases = useQuery({
    queryKey: ['planned-purchases'],
    queryFn: plannedPurchasesApi.list,
  })

  const reload = () => queryClient.invalidateQueries({ queryKey: ['planned-purchases'] })

  // A family item is everyone's, so another member can delete it between this
  // page loading and a click on it. That is a 404, and the right response is
  // to say so and drop the stale row rather than show a server error.
  const onItemError = (error: Error) => {
    if (error instanceof ApiError && error.code === 'NOT_FOUND') {
      toast.error(strings.purchases.gone)
      void reload()
      return
    }
    toast.error(error instanceof ApiError ? error.message : strings.common.error)
  }

  const create = useMutation({
    mutationFn: plannedPurchasesApi.create,
    onSuccess: () => {
      setName('')
      void reload()
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fieldErrors.name !== undefined) {
        setNameError(error.fieldErrors.name)
        return
      }
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  const toggle = useMutation({
    mutationFn: (item: PlannedPurchase) =>
      plannedPurchasesApi.update(item.id, { isBought: !item.isBought }),
    onSuccess: () => void reload(),
    onError: onItemError,
  })

  const remove = useMutation({
    mutationFn: (item: PlannedPurchase) => plannedPurchasesApi.remove(item.id),
    onSuccess: () => {
      toast.success(strings.purchases.deleted)
      setDeleting(null)
      void reload()
    },
    onError: (error) => {
      setDeleting(null)
      onItemError(error)
    },
  })

  const busyId = toggle.isPending
    ? toggle.variables.id
    : remove.isPending
      ? remove.variables.id
      : undefined

  function submit(event: React.FormEvent) {
    event.preventDefault()
    // The server trims too; trimming here is only to catch a blank name
    // before spending a request on it.
    const trimmed = name.trim()
    if (trimmed === '') {
      setNameError(strings.purchases.errors.nameRequired)
      return
    }
    create.mutate({ name: trimmed, isFamily: list === FAMILY })
  }

  // A family delete reaches everyone's list, so it confirms. A personal one
  // affects nobody else and a mistyped item is one line to add back.
  function requestRemove(item: PlannedPurchase) {
    if (item.isFamily) setDeleting(item)
    else remove.mutate(item)
  }

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{strings.purchases.title}</h1>
        <p className="text-sm text-muted-foreground">{strings.purchases.hint}</p>
      </div>

      <form
        onSubmit={submit}
        noValidate
        className="grid items-start gap-3 sm:grid-cols-[1fr_12rem_auto]"
      >
        <div className="space-y-1.5">
          <Label htmlFor="purchase-name" className="h-4">{strings.purchases.name}</Label>
          <Input
            id="purchase-name"
            value={name}
            maxLength={255}
            placeholder={strings.purchases.namePlaceholder}
            aria-invalid={nameError !== null}
            aria-describedby={nameError !== null ? 'purchase-name-error' : undefined}
            onChange={(event) => {
              setName(event.target.value)
              setNameError(null)
            }}
          />
          {nameError !== null && (
            <p id="purchase-name-error" className="text-sm text-destructive">
              {nameError}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="purchase-list" className="h-4">{strings.purchases.list}</Label>
          <FieldSelect
            id="purchase-list"
            value={list}
            onChange={setList}
            options={[
              { value: MINE, label: strings.purchases.listMine },
              { value: FAMILY, label: strings.purchases.listFamily },
            ]}
          />
        </div>
        {/* Padded by the label's height and gap so the button lines up with
            the inputs, which sit under labels. */}
        <Button type="submit" disabled={create.isPending} className="sm:mt-5.5">
          {strings.common.add}
        </Button>
      </form>

      {/* One message when there is nothing at all; once either list has an
          item, the other says it is empty under its own heading. */}
      <QueryState query={purchases} empty={strings.purchases.none}>
        {(items: PlannedPurchase[]) => (
          <div className="grid items-start gap-6 md:grid-cols-2">
            <PurchaseList
              title={strings.purchases.mine}
              empty={strings.purchases.noneMine}
              items={items.filter((item) => !item.isFamily)}
              busyId={busyId}
              onToggle={toggle.mutate}
              onRemove={requestRemove}
            />
            <PurchaseList
              title={strings.purchases.family}
              hint={strings.purchases.familyHint}
              empty={strings.purchases.noneFamily}
              items={items.filter((item) => item.isFamily)}
              showAddedBy
              busyId={busyId}
              onToggle={toggle.mutate}
              onRemove={requestRemove}
            />
          </div>
        )}
      </QueryState>

      <AlertDialog open={deleting !== null} onOpenChange={(next) => !next && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{strings.purchases.deleteFamilyTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {deleting !== null && (
                <>
                  «{deleting.name}»
                  <br />
                </>
              )}
              {strings.purchases.deleteFamilyWarning}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{strings.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={() => {
                if (deleting !== null) remove.mutate(deleting)
              }}
            >
              {strings.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  )
}

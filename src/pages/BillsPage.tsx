import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { billsApi } from '@/api/endpoints'
import type { Bill } from '@/api/types'
import { MonthSelector } from '@/components/MonthSelector'
import { QueryState } from '@/components/QueryState'
import { BillBatchForm } from '@/components/bills/BillBatchForm'
import { BillCalendar } from '@/components/bills/BillCalendar'
import { BillForm } from '@/components/bills/BillForm'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { currentMonthInAlmaty, formatDate, formatMoneyWithCurrency } from '@/lib/format'
import { strings } from '@/strings'

type PendingDelete = { bill: Bill; series: boolean } | null

export function BillsPage() {
  const [month, setMonth] = useState(currentMonthInAlmaty)
  const [editing, setEditing] = useState<Bill | null>(null)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isBatchOpen, setIsBatchOpen] = useState(false)
  const [pendingDelete, setPendingDelete] = useState<PendingDelete>(null)
  const queryClient = useQueryClient()

  // Two calls, deliberately orthogonal: the grid shows what falls due this
  // month, the panel shows what is still owed whenever it fell due. A month
  // query alone would hide an unpaid bill from August the moment you look at
  // September — which is exactly the bill that needs attention.
  const monthBills = useQuery({
    queryKey: ['bills', { month }],
    queryFn: () => billsApi.list({ month }),
  })
  const unpaidBills = useQuery({
    queryKey: ['bills', { unpaid: true }],
    queryFn: () => billsApi.list({ unpaid: true }),
  })

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: ['bills'] })
  }

  const togglePaid = useMutation({
    mutationFn: (bill: Bill) => billsApi.update(bill.id, { isPaid: !bill.isPaid }),
    onSuccess: invalidate,
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  const remove = useMutation({
    mutationFn: ({ bill, series }: NonNullable<PendingDelete>) =>
      series && bill.batchId !== null
        ? billsApi.removeBatch(bill.batchId)
        : billsApi.remove(bill.id),
    onSuccess: (_result, variables) => {
      invalidate()
      toast.success(variables.series ? strings.bills.seriesDeleted : strings.bills.deleted)
      setPendingDelete(null)
    },
    onError: (error) => {
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{strings.bills.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <MonthSelector month={month} onChange={setMonth} />
          <Button variant="outline" onClick={() => setIsBatchOpen(true)}>
            {strings.bills.batchAdd}
          </Button>
          <Button
            onClick={() => {
              setEditing(null)
              setIsFormOpen(true)
            }}
          >
            {strings.bills.add}
          </Button>
        </div>
      </div>

      {isFormOpen && (
        <BillForm
          key={editing?.id ?? 'new'}
          bill={editing}
          open
          onOpenChange={(next) => !next && setIsFormOpen(false)}
        />
      )}
      {isBatchOpen && <BillBatchForm open onOpenChange={setIsBatchOpen} />}

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(next) => !next && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingDelete?.series === true
                ? strings.bills.deleteSeriesTitle
                : strings.bills.deleteTitle}
            </AlertDialogTitle>
            {pendingDelete?.series === true && (
              <AlertDialogDescription>{strings.bills.deleteSeriesHint}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{strings.common.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={remove.isPending}
              onClick={() => {
                if (pendingDelete !== null) remove.mutate(pendingDelete)
              }}
            >
              {strings.common.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">{strings.bills.calendar}</h2>
          <QueryState query={monthBills} empty={strings.bills.noneThisMonth}>
            {(bills: Bill[]) => (
              <BillCalendar
                month={month}
                bills={bills}
                onSelect={(bill) => {
                  setEditing(bill)
                  setIsFormOpen(true)
                }}
              />
            )}
          </QueryState>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{strings.bills.unpaidPanel}</CardTitle>
          </CardHeader>
          <CardContent>
            <QueryState query={unpaidBills} empty={strings.bills.nothingUnpaid}>
              {(bills: Bill[]) => (
                <ul className="divide-y">
                  {bills.map((bill) => (
                    <li key={bill.id} className="space-y-1 py-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm">{bill.name}</p>
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {formatDate(bill.dueDate)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {bill.overdue && (
                            <Badge variant="destructive">{strings.bills.overdue}</Badge>
                          )}
                          <span className="text-sm tabular-nums">
                            {formatMoneyWithCurrency(bill.amount, bill.currency)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Checkbox
                            checked={bill.isPaid}
                            disabled={togglePaid.isPending}
                            onCheckedChange={() => togglePaid.mutate(bill)}
                          />
                          {strings.bills.markPaid}
                        </label>
                        <div className="flex gap-1">
                          {/* The batch id is a convenience handle, not a
                              grouping that constrains the rows. */}
                          {bill.batchId !== null && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setPendingDelete({ bill, series: true })}
                            >
                              {strings.bills.deleteSeries}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDelete({ bill, series: false })}
                          >
                            {strings.common.delete}
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </QueryState>
            {/* Marking paid sets a flag and creates no transaction — say so,
                or the ledger and this list quietly disagree. */}
            <p className="pt-3 text-xs text-muted-foreground">{strings.bills.markPaidHint}</p>
          </CardContent>
        </Card>
      </div>
    </section>
  )
}

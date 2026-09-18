import { useState } from 'react'
import { MonthSelector } from '@/components/MonthSelector'
import { AccountsPanel } from '@/components/dashboard/AccountsPanel'
import { BillsPanel } from '@/components/dashboard/BillsPanel'
import { BudgetsPanel } from '@/components/dashboard/BudgetsPanel'
import { SummaryPanel } from '@/components/dashboard/SummaryPanel'
import { currentMonthInAlmaty } from '@/lib/format'
import { strings } from '@/strings'

/**
 * This month at a glance. The month selector drives the summary and the
 * budgets — both are month-scoped — while accounts and bills are current-state
 * and deliberately ignore it: a balance has no history here, and a bill you
 * owe is owed regardless of which month you happen to be looking at.
 */
export function DashboardPage() {
  const [month, setMonth] = useState(currentMonthInAlmaty)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{strings.nav.dashboard}</h1>
        <MonthSelector month={month} onChange={setMonth} />
      </div>

      <SummaryPanel month={month} />

      <div className="grid gap-4 lg:grid-cols-3">
        <AccountsPanel />
        <BudgetsPanel month={month} />
        <BillsPanel />
      </div>
    </div>
  )
}

import { useState } from 'react'
import { MonthSelector } from '@/components/MonthSelector'
import { AccountsPanel } from '@/components/dashboard/AccountsPanel'
import { BillsPanel } from '@/components/dashboard/BillsPanel'
import { BudgetsPanel } from '@/components/dashboard/BudgetsPanel'
import { CategoryExpensesPanel } from '@/components/dashboard/CategoryExpensesPanel'
import { SummaryPanel } from '@/components/dashboard/SummaryPanel'
import { currentMonthInAlmaty } from '@/lib/format'
import { strings } from '@/strings'

/**
 * This month at a glance. The month selector drives the summary, the budgets
 * and the category list — all month-scoped — while accounts and bills are
 * current-state and deliberately ignore it: a balance has no history here, and a bill you
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

      {/* Two by two before four across: at the lg width a fourth column would
          leave each panel too narrow for a name beside a money amount. */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <AccountsPanel />
        <BudgetsPanel month={month} />
        <BillsPanel />
        <CategoryExpensesPanel month={month} />
      </div>
    </div>
  )
}

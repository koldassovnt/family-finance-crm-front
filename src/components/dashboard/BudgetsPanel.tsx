import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { budgetsApi } from '@/api/endpoints'
import type { Budget } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { BudgetBar } from '@/components/budgets/BudgetBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { strings } from '@/strings'

export function BudgetsPanel({ month }: { month: string }) {
  const query = useQuery({
    queryKey: ['budgets', month],
    queryFn: () => budgetsApi.list(month),
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">
          <Link to="/budgets" className="underline-offset-4 hover:underline">
            {strings.dashboard.budgets}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* An empty month means "no budget existed then", not "none configured". */}
        <QueryState query={query} empty={strings.budgets.noneThisMonth}>
          {(budgets: Budget[]) => (
            <ul className="space-y-4">
              {budgets.map((budget) => (
                <li key={budget.id}>
                  <BudgetBar budget={budget} />
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </CardContent>
    </Card>
  )
}

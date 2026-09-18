import { Placeholder } from './_Placeholder'
import { strings } from '@/strings'

export function BudgetsPage() {
  return (
    <Placeholder
      title={strings.budgets.title}
      notes={[
        'GET /budgets?month= — будущий месяц отклоняется, пустой список это норма',
        'percentUsed не ограничен сотней, remaining уходит в минус',
        'Жёлтый после alertThresholdPercent, красный после 100%',
        'Дубликат категории — 409 DUPLICATE_BUDGET на поле категории',
      ]}
    />
  )
}

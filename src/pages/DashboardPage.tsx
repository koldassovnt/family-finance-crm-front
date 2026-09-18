import { Placeholder } from './_Placeholder'
import { strings } from '@/strings'

export function DashboardPage() {
  return (
    <Placeholder
      title={strings.nav.dashboard}
      notes={[
        'GET /transactions/summary?month= — месяц по умолчанию текущий (Алматы), суммы всегда в KZT',
        'Селектор месяца общий с /budgets; будущий месяц выбрать нельзя',
        'GET /accounts — балансы по валютам, без общей суммы',
        'GET /budgets?month= — прогресс-бары',
        'GET /bills?unpaid=true — фильтровать по overdue вручную',
      ]}
    />
  )
}

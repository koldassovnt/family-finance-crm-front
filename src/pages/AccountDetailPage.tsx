import { Placeholder } from './_Placeholder'
import { strings } from '@/strings'

export function AccountDetailPage() {
  return (
    <Placeholder
      title={strings.accounts.title}
      notes={[
        'GET /accounts/{id}/transactions — from/to обязательны, диапазон не больше года',
        'Перевод отображается у обоих счетов',
        'POST /accounts/{id}/reconcile — создаёт ADJUSTMENT; 400, если баланс совпадает',
        'PATCH меняет только name и bankId',
      ]}
    />
  )
}

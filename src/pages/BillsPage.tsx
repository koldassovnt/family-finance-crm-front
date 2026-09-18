import { Placeholder } from './_Placeholder'
import { strings } from '@/strings'

export function BillsPage() {
  return (
    <Placeholder
      title={strings.bills.title}
      notes={[
        'Два запроса: ?month= для сетки и ?unpaid=true для списка к оплате',
        'overdue приходит с сервера — не вычислять на клиенте',
        'unpaid=true это «ещё не оплачено», а не «просрочено»',
        'Пакетное создание: день месяца обрезается до последнего дня, лимит 120 строк',
      ]}
    />
  )
}

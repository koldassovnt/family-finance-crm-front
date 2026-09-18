import { Placeholder } from './_Placeholder'
import { strings } from '@/strings'

export function TransactionsPage() {
  return (
    <Placeholder
      title={strings.transactions.title}
      notes={[
        'GET /transactions — from/to обязательны, диапазон не больше года, без пагинации',
        'Счета приходят только идентификаторами — join с GET /accounts и запасная подпись «Удалённый счёт»',
        'Категория встроена целиком и остаётся после удаления',
        'Удаление операции пересчитывает баланс — нужен диалог подтверждения',
      ]}
    />
  )
}

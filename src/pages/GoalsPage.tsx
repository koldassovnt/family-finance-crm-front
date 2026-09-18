import { Placeholder } from './_Placeholder'
import { strings } from '@/strings'

export function GoalsPage() {
  return (
    <Placeholder
      title={strings.goals.title}
      notes={[
        'GET /goals возвращает все статусы — фильтровать на клиенте',
        'Пополнение открывает форму операции: TRANSFER с toAccountId цели, тип переключаемый',
        'linkedAccount встроен целиком — join не нужен',
        'progressPercent ограничен 0–100',
      ]}
    />
  )
}

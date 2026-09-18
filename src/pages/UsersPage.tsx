import { Placeholder } from './_Placeholder'
import { strings } from '@/strings'

export function UsersPage() {
  return (
    <Placeholder
      title={strings.nav.users}
      notes={[
        'POST /users создаёт только MEMBER — роль OWNER отклоняется',
        'Списка пользователей нет: экран только для создания',
      ]}
    />
  )
}

import { Placeholder } from './_Placeholder'
import { strings } from '@/strings'

export function PasswordPage() {
  return (
    <Placeholder
      title={strings.nav.password}
      notes={[
        'POST /users/me/password возвращает 204',
        'Смена пароля аннулирует текущий токен — после успеха выйти и вернуть на вход',
      ]}
    />
  )
}

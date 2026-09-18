import { Placeholder } from './_Placeholder'
import { strings } from '@/strings'

export function CategoriesPage() {
  return (
    <Placeholder
      title={strings.nav.categories}
      notes={[
        'GET /categories — плоский список с parentId, дерево строится на клиенте',
        'Удаление блокируется дочерними категориями и открытым бюджетом (409)',
        'История операций удалению не мешает',
      ]}
    />
  )
}

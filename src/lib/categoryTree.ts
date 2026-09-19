import type { Category } from '@/api/types'

export interface CategoryNode {
  category: Category
  children: CategoryNode[]
  depth: number
}

/**
 * Builds the tree the API doesn't return: categories arrive as a flat list
 * with `parentId`, to arbitrary depth.
 *
 * A row whose parent isn't in the list is treated as a root rather than
 * dropped — that shouldn't happen, but silently losing a category would be
 * worse than showing it in the wrong place.
 */
export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const byParent = new Map<string | null, Category[]>()
  const ids = new Set(categories.map((category) => category.id))

  for (const category of categories) {
    const parent = category.parentId !== null && ids.has(category.parentId) ? category.parentId : null
    byParent.set(parent, [...(byParent.get(parent) ?? []), category])
  }

  const build = (parentId: string | null, depth: number): CategoryNode[] =>
    [...(byParent.get(parentId) ?? [])]
      .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
      .map((category) => ({
        category,
        children: build(category.id, depth + 1),
        depth,
      }))

  return build(null, 0)
}

/**
 * The category itself plus everything beneath it. Used to keep a parent
 * picker from offering a cycle — reparenting a category under its own
 * descendant would detach the whole branch from the tree.
 */
export function descendantIds(categories: Category[], rootId: string): Set<string> {
  const result = new Set([rootId])
  let added = true
  while (added) {
    added = false
    for (const category of categories) {
      if (category.parentId !== null && result.has(category.parentId) && !result.has(category.id)) {
        result.add(category.id)
        added = true
      }
    }
  }
  return result
}

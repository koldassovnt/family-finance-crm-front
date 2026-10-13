import { XIcon } from 'lucide-react'
import type { PlannedPurchase } from '@/api/types'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

/**
 * One of the two lists. Rows keep the server's order — still to buy first,
 * then newest — so ticking an item moves it down once the list reloads.
 *
 * There is no read-only row: the API never returns an item the caller cannot
 * change.
 */
export function PurchaseList({
  title,
  hint,
  empty,
  items,
  showAddedBy = false,
  busyId,
  onToggle,
  onRemove,
}: {
  title: string
  hint?: string
  empty: string
  items: PlannedPurchase[]
  /** Family items say who added them; on a personal one it is always you. */
  showAddedBy?: boolean
  /** The item with a request in flight, so it cannot be clicked twice. */
  busyId: string | undefined
  onToggle: (item: PlannedPurchase) => void
  onRemove: (item: PlannedPurchase) => void
}) {
  return (
    <div className="space-y-2">
      <h2 className="text-lg font-medium">{title}</h2>

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="divide-y rounded-md border">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-2 py-1 ps-3 pe-1">
              {/* A label, so the whole name is the tap target on a phone. */}
              <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 py-1.5">
                <Checkbox
                  checked={item.isBought}
                  disabled={busyId === item.id}
                  onCheckedChange={() => onToggle(item)}
                />
                <span className="min-w-0">
                  <span
                    className={cn(
                      'block break-words',
                      item.isBought && 'text-muted-foreground line-through',
                    )}
                  >
                    {item.name}
                  </span>
                  {showAddedBy && (
                    <span className="block text-xs text-muted-foreground">
                      {item.addedBy.displayName}
                    </span>
                  )}
                </span>
              </label>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={strings.purchases.remove(item.name)}
                disabled={busyId === item.id}
                onClick={() => onRemove(item)}
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {/* Below the list, not under the heading: only one of the two lists has
          a hint, and a line above would start that list lower than the one
          beside it. */}
      {hint !== undefined && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

import type { UserRef } from '@/api/types'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { strings } from '@/strings'

/**
 * The read-only marker every viewed screen carries.
 *
 * A viewer gets no write controls at all rather than disabled ones — a disabled
 * button poses a question the control itself cannot answer. Absence needs this
 * one statement to go with it, or a page with no buttons reads as broken rather
 * than borrowed.
 *
 * It also says that nothing here counts toward the viewer's own figures, which
 * is the rule most likely to be doubted when two people compare screens.
 */
export function ViewerNotice({ owner }: { owner: UserRef | null }) {
  return (
    <Alert>
      <AlertDescription className="flex flex-wrap items-baseline gap-x-2">
        <span className="font-medium">
          {strings.sharing.readOnly}
          {/* Null would mean the server called this shared without saying whose,
              which it never does — but a missing name is not worth a crash. */}
          {owner !== null && ` · ${strings.sharing.owner}: ${owner.displayName}`}
        </span>
        <span className="text-muted-foreground">{strings.sharing.notInTotals}</span>
      </AlertDescription>
    </Alert>
  )
}

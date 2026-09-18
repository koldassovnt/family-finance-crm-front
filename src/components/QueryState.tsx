import type { UseQueryResult } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { strings } from '@/strings'

interface QueryStateProps<T> {
  query: UseQueryResult<T>
  /** Rendered when the request succeeded but returned nothing. */
  empty?: string
  children: (data: T) => React.ReactNode
}

/**
 * The one loading/error/empty pattern, used by every page rather than
 * reinvented per screen.
 */
export function QueryState<T>({ query, empty, children }: QueryStateProps<T>) {
  if (query.isPending) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label={strings.common.loading}>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />
      </div>
    )
  }

  if (query.isError) {
    const message =
      query.error instanceof ApiError ? query.error.message : strings.common.error
    return (
      <Alert variant="destructive">
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{message}</span>
          <Button variant="outline" size="sm" onClick={() => void query.refetch()}>
            {strings.common.retry}
          </Button>
        </AlertDescription>
      </Alert>
    )
  }

  if (Array.isArray(query.data) && query.data.length === 0) {
    return <p className="text-muted-foreground">{empty ?? strings.common.empty}</p>
  }

  return <>{children(query.data)}</>
}

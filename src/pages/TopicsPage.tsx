import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { topicsApi } from '@/api/endpoints'
import type { Topic } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { TopicCard } from '@/components/topics/TopicCard'
import { TopicForm } from '@/components/topics/TopicForm'
import { Button } from '@/components/ui/button'
import { strings } from '@/strings'

/**
 * A topic groups the transactions of one undertaking — a trip, a renovation —
 * so it can be totalled on its own. It cuts across categories: a category says
 * what the money was for, a topic says which occasion it belonged to.
 */
export function TopicsPage() {
  const [showAll, setShowAll] = useState(false)
  const [isFormOpen, setIsFormOpen] = useState(false)

  // Filtering server-side here, unlike goals: ?status is a real query
  // parameter, so there is no reason to fetch closed topics to hide them.
  const topics = useQuery({
    queryKey: ['topics', { showAll }],
    queryFn: () => topicsApi.list(showAll ? undefined : 'ACTIVE'),
  })

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{strings.topics.title}</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowAll((previous) => !previous)}>
            {showAll ? strings.topics.showActive : strings.topics.showAll}
          </Button>
          <Button onClick={() => setIsFormOpen(true)}>{strings.topics.add}</Button>
        </div>
      </div>

      {isFormOpen && <TopicForm key="new" topic={null} open onOpenChange={setIsFormOpen} />}

      <QueryState
        query={topics}
        empty={showAll ? strings.common.empty : strings.topics.onlyActiveEmpty}
      >
        {(rows: Topic[]) => (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {rows.map((topic) => (
              <TopicCard key={topic.id} topic={topic} />
            ))}
          </div>
        )}
      </QueryState>
    </section>
  )
}

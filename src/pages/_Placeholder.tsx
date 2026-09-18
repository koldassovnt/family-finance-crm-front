import { Alert, AlertDescription } from '@/components/ui/alert'

/**
 * A page that is routed and reachable but not built yet. Each one lists the
 * endpoints and rules its real implementation has to honour, so the next
 * session starts from the contract rather than re-reading the spec.
 */
export function Placeholder({ title, notes }: { title: string; notes: string[] }) {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <Alert>
        <AlertDescription>
          <p className="mb-2 font-medium">Экран ещё не реализован</p>
          <ul className="list-inside list-disc space-y-1 text-sm">
            {notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        </AlertDescription>
      </Alert>
    </section>
  )
}

import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { usersApi } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { strings } from '@/strings'

const MIN_LENGTH = 8

/**
 * Changing the password moves `passwordChangedAt` forward, and the JWT filter
 * rejects any token issued before it — including the one that made this call.
 * So a success is a logout: there is no session left to keep, and pretending
 * otherwise would leave the user on a page whose next request 401s.
 */
export function PasswordPage() {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [repeat, setRepeat] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const mismatch = repeat !== '' && next !== repeat
  const tooShort = next !== '' && next.length < MIN_LENGTH

  const mutation = useMutation({
    mutationFn: () => usersApi.changePassword({ currentPassword: current, newPassword: next }),
    onSuccess: () => {
      toast.success(strings.password.done)
      signOut()
      void navigate('/login', { replace: true })
    },
    onError: (error) => {
      if (error instanceof ApiError && error.hasFieldErrors) {
        setFieldErrors(error.fieldErrors)
        return
      }
      toast.error(error instanceof ApiError ? error.message : strings.common.error)
    },
  })

  return (
    <section className="max-w-md space-y-4">
      <h1 className="text-2xl font-semibold">{strings.password.title}</h1>

      <Alert>
        <AlertDescription>{strings.password.hint}</AlertDescription>
      </Alert>

      <form
        noValidate
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          mutation.mutate()
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor="current-password">{strings.password.current}</Label>
          <Input
            id="current-password"
            type="password"
            autoComplete="current-password"
            value={current}
            onChange={(event) => setCurrent(event.target.value)}
          />
          {fieldErrors.currentPassword !== undefined && (
            <p className="text-sm text-destructive">{fieldErrors.currentPassword}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="new-password">{strings.password.next}</Label>
          <Input
            id="new-password"
            type="password"
            autoComplete="new-password"
            value={next}
            onChange={(event) => setNext(event.target.value)}
          />
          {tooShort && <p className="text-sm text-destructive">{strings.password.tooShort}</p>}
          {fieldErrors.newPassword !== undefined && (
            <p className="text-sm text-destructive">{fieldErrors.newPassword}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="repeat-password">{strings.password.repeat}</Label>
          <Input
            id="repeat-password"
            type="password"
            autoComplete="new-password"
            value={repeat}
            onChange={(event) => setRepeat(event.target.value)}
          />
          {mismatch && <p className="text-sm text-destructive">{strings.password.mismatch}</p>}
        </div>

        <Button
          type="submit"
          disabled={
            mutation.isPending ||
            current === '' ||
            next.length < MIN_LENGTH ||
            next !== repeat
          }
        >
          {strings.password.submit}
        </Button>
      </form>
    </section>
  )
}

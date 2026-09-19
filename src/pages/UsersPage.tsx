import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { usersApi } from '@/api/endpoints'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { strings } from '@/strings'

const MIN_LENGTH = 8

/**
 * Create-only, by design: there is no list-users endpoint, so a table would be
 * a table of nothing. `GET /users/me` returns only the caller.
 *
 * The route is owner-gated client-side for convenience; the server enforces it
 * independently and returns 403 FORBIDDEN to a MEMBER regardless. The endpoint
 * can only create a MEMBER — a request for OWNER is rejected — so the form
 * never offers a role.
 */
export function UsersPage() {
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: () => usersApi.create({ email, displayName, password }),
    onSuccess: (user) => {
      toast.success(`${strings.users.created}: ${user.displayName}`)
      setEmail('')
      setDisplayName('')
      setPassword('')
      setFieldErrors({})
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
      <h1 className="text-2xl font-semibold">{strings.users.title}</h1>

      <Alert>
        <AlertDescription>{strings.users.noList}</AlertDescription>
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
          <Label htmlFor="user-email">{strings.users.email}</Label>
          <Input
            id="user-email"
            type="email"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {fieldErrors.email !== undefined && (
            <p className="text-sm text-destructive">{fieldErrors.email}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-name">{strings.users.displayName}</Label>
          <Input
            id="user-name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
          />
          {fieldErrors.displayName !== undefined && (
            <p className="text-sm text-destructive">{fieldErrors.displayName}</p>
          )}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-password">{strings.users.password}</Label>
          <Input
            id="user-password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <p className="text-xs text-muted-foreground">{strings.users.roleHint}</p>
          {fieldErrors.password !== undefined && (
            <p className="text-sm text-destructive">{fieldErrors.password}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={
            mutation.isPending ||
            email.trim() === '' ||
            displayName.trim() === '' ||
            password.length < MIN_LENGTH
          }
        >
          {strings.users.add}
        </Button>
      </form>
    </section>
  )
}

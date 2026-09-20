import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { toast } from 'sonner'
import { ApiError } from '@/api/client'
import { usersApi } from '@/api/endpoints'
import type { User } from '@/api/types'
import { QueryState } from '@/components/QueryState'
import { useAuth } from '@/auth/AuthContext'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { strings } from '@/strings'

const MIN_LENGTH = 8

/**
 * The household, and the form that adds to it.
 *
 * `GET /users` was opened to every member in phase 8 so the share picker could
 * name people; this screen shows the same list. Creating is still owner-only —
 * the route is gated client-side for convenience and the server enforces it
 * independently, returning 403 to a MEMBER regardless. The endpoint can only
 * create a MEMBER, so the form never offers a role.
 *
 * There is no delete: removing a member would have to revoke their shares and
 * dispose of everything they own, since every shareable resource holds a
 * non-nullable association to its owner. The phase 8 spec has the detail.
 */
export function UsersPage() {
  const { user: me } = useAuth()
  const queryClient = useQueryClient()
  const members = useQuery({ queryKey: ['users'], queryFn: usersApi.list })
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const mutation = useMutation({
    mutationFn: () => usersApi.create({ email, displayName, password }),
    onSuccess: (user) => {
      void queryClient.invalidateQueries({ queryKey: ['users'] })
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

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">
          {strings.users.members}
        </h2>
        <QueryState query={members}>
          {(rows: User[]) => (
            <ul className="divide-y rounded-md border">
              {rows.map((member) => (
                <li key={member.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                  <span className="font-medium">{member.displayName}</span>
                  <span className="truncate text-sm text-muted-foreground">{member.email}</span>
                  <span className="ms-auto flex shrink-0 items-center gap-2">
                    {member.id === me?.id && (
                      <span className="text-xs text-muted-foreground">{strings.users.you}</span>
                    )}
                    <Badge variant={member.role === 'OWNER' ? 'default' : 'secondary'}>
                      {strings.users.roles[member.role]}
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </div>

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

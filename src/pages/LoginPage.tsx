import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate } from 'react-router-dom'
import { z } from 'zod'
import { ApiError } from '@/api/client'
import { authApi } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthContext'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { strings } from '@/strings'

const loginSchema = z.object({
  email: z.email({ message: 'Введите корректный адрес' }),
  password: z.string().min(1, { message: 'Введите пароль' }),
})

type LoginValues = z.infer<typeof loginSchema>

export function LoginPage() {
  const { user, signIn } = useAuth()
  const navigate = useNavigate()

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  const mutation = useMutation({
    mutationFn: ({ email, password }: LoginValues) => authApi.login(email, password),
    onSuccess: (response) => {
      signIn(response.token, response.expiresAt, response.user)
      void navigate('/', { replace: true })
    },
    onError: (error) => {
      // Login is exempt from the global 401 redirect: a wrong password shows
      // here rather than bouncing back to the page the user is already on.
      if (error instanceof ApiError && error.hasFieldErrors) {
        for (const [field, message] of Object.entries(error.fieldErrors)) {
          form.setError(field as keyof LoginValues, { message })
        }
      }
    },
  })

  if (user !== null) return <Navigate to="/" replace />

  const errorMessage =
    mutation.error instanceof ApiError && !mutation.error.hasFieldErrors
      ? mutation.error.status === 401
        ? strings.login.invalidCredentials
        : mutation.error.message
      : null

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4">
      <form
        noValidate
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        className="w-full max-w-sm space-y-4 rounded-lg border p-6"
      >
        <h1 className="text-xl font-semibold">{strings.login.title}</h1>

        {errorMessage !== null && (
          <Alert variant="destructive">
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label htmlFor="email">{strings.login.email}</Label>
          <Input id="email" type="email" autoComplete="username" {...form.register('email')} />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{strings.login.password}</Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            {...form.register('password')}
          />
          {form.formState.errors.password && (
            <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
          )}
        </div>

        <Button type="submit" className="w-full" disabled={mutation.isPending}>
          {mutation.isPending ? strings.login.submitting : strings.login.submit}
        </Button>
      </form>
    </div>
  )
}

import { useCallback, useEffect, useMemo, useState } from 'react'
import { setUnauthenticatedHandler, tokenStorage } from '@/api/client'
import { usersApi } from '@/api/endpoints'
import type { User } from '@/api/types'
import { AuthContext, type AuthContextValue } from './AuthContext'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(tokenStorage.get() !== null)

  const signIn = useCallback<AuthContextValue['signIn']>((token, expiresAt, nextUser) => {
    tokenStorage.set(token, expiresAt)
    setUser(nextUser)
  }, [])

  const signOut = useCallback(() => {
    // Logout is purely client-side; there is no server-side revocation.
    tokenStorage.clear()
    setUser(null)
  }, [])

  // Any 401 outside the login call means the token is gone or expired.
  useEffect(() => {
    setUnauthenticatedHandler(() => setUser(null))
  }, [])

  // A stored token survives a reload but the user object doesn't — re-fetch
  // identity rather than decoding the JWT, which is unverified and has no name.
  useEffect(() => {
    if (tokenStorage.get() === null) return
    let cancelled = false
    usersApi
      .me()
      .then((me) => {
        if (!cancelled) setUser(me)
      })
      .catch(() => {
        if (!cancelled) tokenStorage.clear()
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({ user, isLoading, signIn, signOut }),
    [user, isLoading, signIn, signOut],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

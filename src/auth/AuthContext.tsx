import { createContext, use } from 'react'
import type { User } from '@/api/types'

export interface AuthContextValue {
  user: User | null
  /** False while identity is being re-established from a stored token. */
  isLoading: boolean
  signIn: (token: string, expiresAt: string, user: User) => void
  signOut: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const context = use(AuthContext)
  if (context === null) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

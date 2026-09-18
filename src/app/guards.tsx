import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { strings } from '@/strings'

/** Gate for every authenticated route. */
export function RequireAuth() {
  const { user, isLoading } = useAuth()
  if (isLoading) {
    return <p className="p-6 text-muted-foreground">{strings.common.loading}</p>
  }
  return user === null ? <Navigate to="/login" replace /> : <Outlet />
}

/** OWNER-only routes. The server enforces this too — hiding it is convenience. */
export function RequireOwner() {
  const { user } = useAuth()
  return user?.role === 'OWNER' ? <Outlet /> : <Navigate to="/" replace />
}

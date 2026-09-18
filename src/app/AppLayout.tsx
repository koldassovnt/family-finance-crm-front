import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthContext'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { strings } from '@/strings'

const navItems = [
  { to: '/', label: strings.nav.dashboard, end: true },
  { to: '/accounts', label: strings.nav.accounts },
  { to: '/transactions', label: strings.nav.transactions },
  { to: '/budgets', label: strings.nav.budgets },
  { to: '/goals', label: strings.nav.goals },
  { to: '/bills', label: strings.nav.bills },
  { to: '/settings/categories', label: strings.nav.categories },
]

export function AppLayout() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <span className="font-semibold">{strings.appName}</span>
          <nav className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'rounded-sm py-1 transition-colors hover:text-foreground',
                    isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
            {/* Owner-only: there is no list-users endpoint, so this is create-only. */}
            {user?.role === 'OWNER' && (
              <NavLink
                to="/settings/users"
                className={({ isActive }) =>
                  cn(
                    'rounded-sm py-1 transition-colors hover:text-foreground',
                    isActive ? 'text-foreground font-medium' : 'text-muted-foreground',
                  )
                }
              >
                {strings.nav.users}
              </NavLink>
            )}
          </nav>
          <div className="ms-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{user?.displayName}</span>
            <Button variant="ghost" size="sm" onClick={signOut}>
              {strings.nav.logout}
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}

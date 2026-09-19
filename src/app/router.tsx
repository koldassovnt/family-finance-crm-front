import { Navigate, createBrowserRouter } from 'react-router-dom'
import { AppLayout } from './AppLayout'
import { RequireAuth, RequireOwner } from './guards'
import { AccountDetailPage } from '@/pages/AccountDetailPage'
import { AccountsPage } from '@/pages/AccountsPage'
import { BillsPage } from '@/pages/BillsPage'
import { BudgetsPage } from '@/pages/BudgetsPage'
import { CategoriesPage } from '@/pages/CategoriesPage'
import { DashboardPage } from '@/pages/DashboardPage'
import { GoalsPage } from '@/pages/GoalsPage'
import { LoginPage } from '@/pages/LoginPage'
import { PasswordPage } from '@/pages/PasswordPage'
import { TopicDetailPage } from '@/pages/TopicDetailPage'
import { TopicsPage } from '@/pages/TopicsPage'
import { TransactionsPage } from '@/pages/TransactionsPage'
import { UsersPage } from '@/pages/UsersPage'

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <DashboardPage /> },
          { path: '/accounts', element: <AccountsPage /> },
          { path: '/accounts/:id', element: <AccountDetailPage /> },
          { path: '/transactions', element: <TransactionsPage /> },
          { path: '/budgets', element: <BudgetsPage /> },
          { path: '/goals', element: <GoalsPage /> },
          { path: '/bills', element: <BillsPage /> },
          { path: '/topics', element: <TopicsPage /> },
          { path: '/topics/:id', element: <TopicDetailPage /> },
          { path: '/settings/categories', element: <CategoriesPage /> },
          { path: '/settings/password', element: <PasswordPage /> },
          {
            element: <RequireOwner />,
            children: [{ path: '/settings/users', element: <UsersPage /> }],
          },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])

import { useEffect, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, Outlet } from 'react-router'
import { bootDatabase } from '@/db/boot'
import { AuthProblemPage, PendingApprovalPage } from '@/pages/auth/PendingApprovalPage'
import { useAuth } from './AuthProvider'

export function FullScreenNote({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh items-center justify-center text-sm text-stone-500">{children}</div>
  )
}

/** Opens the dashboard database once, then renders the routed pages. */
function BootGate() {
  const { t } = useTranslation()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    bootDatabase()
      .then(() => {
        if (!cancelled) setReady(true)
      })
      .catch((err: unknown) => {
        console.error('Could not open the dashboard database', err)
        if (!cancelled) setError(err instanceof Error ? err.message : t('common.openFailed'))
      })
    return () => {
      cancelled = true
    }
  }, [t])

  if (error) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center gap-3 px-6">
        <h1 className="text-base font-semibold text-stone-900">{t('common.notReady')}</h1>
        <p className="text-sm leading-6 text-stone-600">{error}</p>
      </div>
    )
  }

  if (!ready) return <FullScreenNote>{t('common.loading')}</FullScreenNote>

  return <Outlet />
}

/**
 * Gate in front of the dashboard routes. Without Supabase the app opens directly;
 * with it, the user must be signed in and approved in `profiles`.
 */
export function RequireAuth() {
  const auth = useAuth()
  const { t } = useTranslation()

  if (!auth.configured) return <BootGate />
  if (auth.loading) return <FullScreenNote>{t('common.loading')}</FullScreenNote>
  if (!auth.session) return <Navigate to="/sign-in" replace />
  if (auth.approval === 'checking') return <FullScreenNote>{t('auth.checking')}</FullScreenNote>
  if (auth.approval === 'error') return <AuthProblemPage />
  if (auth.approval === 'pending') return <PendingApprovalPage />
  return <BootGate />
}

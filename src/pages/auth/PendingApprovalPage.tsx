import { Hourglass, LogOut, RefreshCw, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { MISSING_PROFILES, useAuth } from '@/auth/AuthProvider'
import { Button } from '@/components/ui/Button'
import { AuthLayout } from './AuthLayout'

/** Signed in, but `profiles.approved` is still false. */
export function PendingApprovalPage() {
  const { t } = useTranslation()
  const auth = useAuth()
  const [checking, setChecking] = useState(false)

  async function check() {
    setChecking(true)
    try {
      await auth.refreshApproval()
    } finally {
      setChecking(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.pendingTitle')}
      subtitle={t('auth.pendingBody', { email: auth.user?.email ?? '' })}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3 rounded-xl bg-brand-50 px-4 py-3 text-sm leading-6 text-brand-800">
          <Hourglass size={18} className="shrink-0" />
          {t('auth.pendingHint')}
        </div>
        <Button onClick={() => void check()} disabled={checking} leadingIcon={<RefreshCw size={16} />}>
          {t('auth.checkAgain')}
        </Button>
        <Button variant="secondary" onClick={() => void auth.signOut()} leadingIcon={<LogOut size={16} />}>
          {t('auth.signOut')}
        </Button>
      </div>
    </AuthLayout>
  )
}

/** The approval lookup itself failed, usually because the migration has not been run. */
export function AuthProblemPage() {
  const { t } = useTranslation()
  const auth = useAuth()
  const [checking, setChecking] = useState(false)
  const message =
    auth.approvalError === MISSING_PROFILES
      ? t('auth.errors.missingProfiles')
      : (auth.approvalError ?? t('auth.errors.generic'))

  async function retry() {
    setChecking(true)
    try {
      await auth.refreshApproval()
    } finally {
      setChecking(false)
    }
  }

  return (
    <AuthLayout title={t('auth.problemTitle')}>
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3 rounded-xl bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
          <TriangleAlert size={18} className="mt-1 shrink-0" />
          <span className="break-words">{message}</span>
        </div>
        <Button onClick={() => void retry()} disabled={checking} leadingIcon={<RefreshCw size={16} />}>
          {t('auth.tryAgain')}
        </Button>
        <Button variant="secondary" onClick={() => void auth.signOut()} leadingIcon={<LogOut size={16} />}>
          {t('auth.signOut')}
        </Button>
      </div>
    </AuthLayout>
  )
}

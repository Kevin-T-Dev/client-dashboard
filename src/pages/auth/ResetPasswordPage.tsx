import { KeyRound } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { describeAuthError } from '@/auth/authErrors'
import { FullScreenNote } from '@/auth/RequireAuth'
import { Button } from '@/components/ui/Button'
import { FormField } from '@/components/ui/Field'
import { notify } from '@/components/ui/Toaster'
import { AuthLayout } from './AuthLayout'
import { PasswordInput } from './PasswordInput'

const MIN_PASSWORD = 8

/**
 * Reads an error Supabase put on the redirect URL (expired or already-used link).
 * Must run during the first render: the Supabase client clears the URL once it starts.
 */
function readLinkError(): string | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  const query = new URLSearchParams(window.location.search)
  return (
    hash.get('error_code') ??
    hash.get('error') ??
    query.get('error_code') ??
    query.get('error')
  )
}

/** Opened from the reset email: Supabase signs the user in with a recovery session first. */
export function ResetPasswordPage() {
  const { t } = useTranslation()
  const auth = useAuth()
  const navigate = useNavigate()
  const [linkError] = useState(readLinkError)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!auth.configured) return <Navigate to="/" replace />
  if (auth.loading) return <FullScreenNote>{t('auth.checking')}</FullScreenNote>

  if (linkError || !auth.session) {
    return (
      <AuthLayout
        title={t('auth.resetInvalidTitle')}
        subtitle={t('auth.errors.resetLinkExpired')}
        footer={
          <Link to="/sign-in" className="font-medium text-brand-700 hover:underline">
            {t('auth.backToSignIn')}
          </Link>
        }
      >
        <Button className="w-full" onClick={() => navigate('/forgot-password', { replace: true })}>
          {t('auth.requestNewLink')}
        </Button>
      </AuthLayout>
    )
  }

  function validate(): string | null {
    if (password.length < MIN_PASSWORD) return t('auth.errors.passwordShort')
    if (password !== confirm) return t('auth.errors.passwordMismatch')
    return null
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const problem = validate()
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    setBusy(true)
    try {
      await auth.updatePassword(password)
      notify(t('auth.resetDoneTitle'), t('auth.resetDoneBody'))
      // The recovery session is a normal session now, so go straight in.
      navigate('/', { replace: true })
    } catch (err) {
      setError(describeAuthError(err, t))
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.resetTitle')}
      subtitle={t('auth.resetSubtitle', { email: auth.user?.email ?? '' })}
    >
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
        <div className="flex items-center justify-center rounded-xl bg-brand-50 py-4 text-brand-700">
          <KeyRound size={28} />
        </div>
        <FormField label={t('auth.newPassword')} hint={t('auth.passwordHint')}>
          <PasswordInput value={password} onValueChange={setPassword} autoComplete="new-password" />
        </FormField>
        <FormField label={t('auth.confirmPassword')}>
          <PasswordInput value={confirm} onValueChange={setConfirm} autoComplete="new-password" />
        </FormField>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || !password || !confirm} className="w-full">
          {busy ? t('auth.savingPassword') : t('auth.savePassword')}
        </Button>
      </form>
    </AuthLayout>
  )
}

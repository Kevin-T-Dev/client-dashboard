import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { describeAuthError } from '@/auth/authErrors'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput } from '@/components/ui/Field'
import { AuthLayout } from './AuthLayout'
import { PasswordInput } from './PasswordInput'

interface SignInState {
  /** Set by the register page after a sign-up that still needs email confirmation. */
  registeredEmail?: string
}

export function SignInPage() {
  const { t } = useTranslation()
  const auth = useAuth()
  const location = useLocation()
  const state = (location.state ?? null) as SignInState | null
  const [email, setEmail] = useState(state?.registeredEmail ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!auth.configured || auth.session) return <Navigate to="/" replace />

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setBusy(true)
    try {
      await auth.signIn(email.trim(), password)
      // The session listener now redirects; keep the button busy until then.
    } catch (err) {
      setError(describeAuthError(err, t))
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.signInTitle')}
      subtitle={t('auth.signInSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-medium text-brand-700 hover:underline">
            {t('auth.registerLink')}
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
        {state?.registeredEmail && !error && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm leading-6 text-brand-800">
            {t('auth.confirmBody', { email: state.registeredEmail })}
          </p>
        )}
        <FormField label={t('auth.email')}>
          <TextInput
            type="email"
            value={email}
            onValueChange={(v) => setEmail(String(v))}
            autoComplete="email"
            placeholder={t('auth.emailPlaceholder')}
            required
          />
        </FormField>
        <FormField label={t('auth.password')}>
          <PasswordInput value={password} onValueChange={setPassword} autoComplete="current-password" />
        </FormField>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || !email.trim() || !password} className="w-full">
          {busy ? t('auth.signingIn') : t('auth.signIn')}
        </Button>
      </form>
    </AuthLayout>
  )
}

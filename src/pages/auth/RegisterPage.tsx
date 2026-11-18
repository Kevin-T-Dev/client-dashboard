import { MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { describeAuthError } from '@/auth/authErrors'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput } from '@/components/ui/Field'
import { AuthLayout } from './AuthLayout'
import { PasswordInput } from './PasswordInput'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MIN_PASSWORD = 8

export interface RegisterState {
  /** Prefills the email field. */
  email?: string
  /** Set by the Forgot Password page when the email has no account. */
  fromForgotPassword?: boolean
}

export function RegisterPage() {
  const { t } = useTranslation()
  const auth = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const state = (location.state ?? null) as RegisterState | null
  const [name, setName] = useState('')
  const [email, setEmail] = useState(state?.email ?? '')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Email that still has to be confirmed before signing in. */
  const [awaitingEmail, setAwaitingEmail] = useState<string | null>(null)

  if (!auth.configured || auth.session) return <Navigate to="/" replace />

  if (awaitingEmail) {
    return (
      <AuthLayout title={t('auth.confirmTitle')} subtitle={t('auth.confirmBody', { email: awaitingEmail })}>
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center rounded-xl bg-brand-50 py-6 text-brand-700">
            <MailCheck size={32} />
          </div>
          <Button
            className="w-full"
            onClick={() => navigate('/sign-in', { state: { registeredEmail: awaitingEmail } })}
          >
            {t('auth.signInLink')}
          </Button>
        </div>
      </AuthLayout>
    )
  }

  function validate(): string | null {
    if (!name.trim()) return t('auth.errors.nameRequired')
    if (!EMAIL_PATTERN.test(email.trim())) return t('auth.errors.emailInvalid')
    if (password.length < MIN_PASSWORD) return t('auth.errors.passwordShort')
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
      const result = await auth.signUp(name.trim(), email.trim(), password)
      if (result.needsConfirmation) {
        setAwaitingEmail(email.trim())
        setBusy(false)
      }
      // Otherwise the new session redirects to the dashboard.
    } catch (err) {
      setError(describeAuthError(err, t))
      setBusy(false)
    }
  }

  return (
    <AuthLayout
      title={t('auth.registerTitle')}
      subtitle={t('auth.registerSubtitle')}
      footer={
        <>
          {t('auth.haveAccount')}{' '}
          <Link to="/sign-in" className="font-medium text-brand-700 hover:underline">
            {t('auth.signInLink')}
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
        {state?.fromForgotPassword && state.email && !error && (
          <p className="rounded-lg bg-brand-50 px-3 py-2 text-sm leading-6 text-brand-800">
            {t('auth.notRegisteredBody', { email: state.email })}
          </p>
        )}
        <FormField label={t('auth.name')}>
          <TextInput
            value={name}
            onValueChange={(v) => setName(String(v))}
            autoComplete="name"
            placeholder={t('auth.namePlaceholder')}
            required
          />
        </FormField>
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
        <FormField label={t('auth.password')} hint={t('auth.passwordHint')}>
          <PasswordInput value={password} onValueChange={setPassword} autoComplete="new-password" />
        </FormField>
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? t('auth.registering') : t('auth.register')}
        </Button>
      </form>
    </AuthLayout>
  )
}

import { MailCheck } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/auth/AuthProvider'
import { describeAuthError } from '@/auth/authErrors'
import { Button } from '@/components/ui/Button'
import { FormField, TextInput } from '@/components/ui/Field'
import { AuthLayout } from './AuthLayout'
import type { RegisterState } from './RegisterPage'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface ForgotState {
  /** Prefilled from whatever was typed on the sign-in page. */
  email?: string
}

export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const state = (location.state ?? null) as ForgotState | null
  const [email, setEmail] = useState(state?.email ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  /** Address the reset link was sent to. */
  const [sentTo, setSentTo] = useState<string | null>(null)

  if (!auth.configured || auth.session) return <Navigate to="/" replace />

  async function send(address: string) {
    setError(null)
    setBusy(true)
    try {
      // No account for this address: send them to register instead of mailing nothing.
      // If the check is unavailable (null), fall through and send the link anyway.
      if ((await auth.isEmailRegistered(address)) === false) {
        const state: RegisterState = { email: address, fromForgotPassword: true }
        navigate('/register', { state })
        return
      }
      await auth.requestPasswordReset(address)
      setSentTo(address)
    } catch (err) {
      setError(describeAuthError(err, t))
    } finally {
      setBusy(false)
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const address = email.trim()
    if (!EMAIL_PATTERN.test(address)) {
      setError(t('auth.errors.emailInvalid'))
      return
    }
    await send(address)
  }

  const footer = (
    <Link to="/sign-in" className="font-medium text-brand-700 hover:underline">
      {t('auth.backToSignIn')}
    </Link>
  )

  if (sentTo) {
    return (
      <AuthLayout
        title={t('auth.resetSentTitle')}
        subtitle={t('auth.resetSentBody', { email: sentTo })}
        footer={footer}
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-center rounded-xl bg-brand-50 py-6 text-brand-700">
            <MailCheck size={32} />
          </div>
          <p className="text-sm leading-6 text-stone-500">{t('auth.resetSentHint')}</p>
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <Button variant="secondary" className="w-full" disabled={busy} onClick={() => void send(sentTo)}>
            {busy ? t('auth.sendingResetLink') : t('auth.sendAgain')}
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title={t('auth.forgotTitle')} subtitle={t('auth.forgotSubtitle')} footer={footer}>
      <form onSubmit={(e) => void submit(e)} className="flex flex-col gap-4" noValidate>
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
        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button type="submit" disabled={busy || !email.trim()} className="w-full">
          {busy ? t('auth.sendingResetLink') : t('auth.sendResetLink')}
        </Button>
      </form>
    </AuthLayout>
  )
}

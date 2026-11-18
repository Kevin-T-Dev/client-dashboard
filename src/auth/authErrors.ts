import type { TFunction } from 'i18next'

export type AuthFlowCode = 'already-registered'

/** Problems the app detects itself rather than ones Supabase reports. */
export class AuthFlowError extends Error {
  code: AuthFlowCode

  constructor(code: AuthFlowCode) {
    super(code)
    this.name = 'AuthFlowError'
    this.code = code
  }
}

const byCode: Record<string, string> = {
  'already-registered': 'auth.errors.alreadyRegistered',
  user_already_exists: 'auth.errors.alreadyRegistered',
  invalid_credentials: 'auth.errors.invalidCredentials',
  email_not_confirmed: 'auth.errors.notConfirmed',
  over_email_send_rate_limit: 'auth.errors.rateLimit',
  email_address_not_authorized: 'auth.errors.emailNotAuthorized',
  weak_password: 'auth.errors.weakPassword',
  signup_disabled: 'auth.errors.signupDisabled',
  email_address_invalid: 'auth.errors.emailInvalid',
  same_password: 'auth.errors.samePassword',
  otp_expired: 'auth.errors.resetLinkExpired',
  session_not_found: 'auth.errors.resetLinkExpired',
  user_not_found: 'auth.errors.resetLinkExpired',
}

/** Turns a Supabase auth error into one sentence for the form. */
export function describeAuthError(err: unknown, t: TFunction): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code ?? '')
      : ''
  if (code && byCode[code]) return t(byCode[code])
  const message = err instanceof Error ? err.message : ''
  if (/invalid login credentials/i.test(message)) return t('auth.errors.invalidCredentials')
  if (/email not confirmed/i.test(message)) return t('auth.errors.notConfirmed')
  if (/already registered/i.test(message)) return t('auth.errors.alreadyRegistered')
  if (/rate limit/i.test(message)) return t('auth.errors.rateLimit')
  return message || t('auth.errors.generic')
}

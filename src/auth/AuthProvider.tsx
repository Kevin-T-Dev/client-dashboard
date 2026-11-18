import type { Session, User } from '@supabase/supabase-js'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { clearLocalCache } from '@/db/boot'
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase'
import { AuthFlowError } from './authErrors'

/** Whether the signed-in user may open the dashboard (`profiles.approved`). */
export type Approval = 'checking' | 'approved' | 'pending' | 'error'

export interface SignUpResult {
  /** Supabase still has to confirm the email address before the user can sign in. */
  needsConfirmation: boolean
}

export interface AuthContextValue {
  /** False when the app runs without Supabase (offline sample-data mode). */
  configured: boolean
  /** True until the stored session has been read. */
  loading: boolean
  session: Session | null
  user: User | null
  approval: Approval
  /** `MISSING_PROFILES` or the message of the last failed approval check. */
  approvalError: string | null
  refreshApproval: () => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signUp: (name: string, email: string, password: string) => Promise<SignUpResult>
  /**
   * Whether an account exists for this email. `null` when the check is unavailable
   * (the email_registered migration has not been run, or the request failed).
   */
  isEmailRegistered: (email: string) => Promise<boolean | null>
  /** Emails a link that opens `/reset-password` with a short-lived recovery session. */
  requestPasswordReset: (email: string) => Promise<void>
  /** Sets a new password for the signed-in (or recovering) user. */
  updatePassword: (password: string) => Promise<void>
  signOut: () => Promise<void>
}

export const MISSING_PROFILES = 'missing-profiles'

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchApproval(userId: string): Promise<{ approval: Approval; error: string | null }> {
  const { data, error } = await getSupabase()
    .from('profiles')
    .select('approved')
    .eq('id', userId)
    .maybeSingle()
  if (error) {
    if (error.code === 'PGRST205' || error.message.includes('schema cache')) {
      return { approval: 'error', error: MISSING_PROFILES }
    }
    return { approval: 'error', error: error.message }
  }
  const approved = Boolean((data as { approved?: boolean } | null)?.approved)
  return { approval: approved ? 'approved' : 'pending', error: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const [loading, setLoading] = useState(configured)
  const [session, setSession] = useState<Session | null>(null)
  const [approval, setApproval] = useState<Approval>('checking')
  const [approvalError, setApprovalError] = useState<string | null>(null)
  const userId = session?.user.id ?? null

  useEffect(() => {
    if (!configured) return
    const supabase = getSupabase()
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })
    // Only update state in here: awaiting Supabase inside this callback can deadlock the client.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      if (!active) return
      setSession(next)
      setLoading(false)
    })
    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [configured])

  useEffect(() => {
    if (!userId) return
    let active = true
    setApproval('checking')
    setApprovalError(null)
    void fetchApproval(userId).then((result) => {
      if (!active) return
      setApproval(result.approval)
      setApprovalError(result.error)
    })
    return () => {
      active = false
    }
  }, [userId])

  const refreshApproval = useCallback(async () => {
    if (!userId) return
    const result = await fetchApproval(userId)
    setApproval(result.approval)
    setApprovalError(result.error)
  }, [userId])

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signUp = useCallback(
    async (name: string, email: string, password: string): Promise<SignUpResult> => {
      const { data, error } = await getSupabase().auth.signUp({
        email,
        password,
        options: { data: { full_name: name }, emailRedirectTo: window.location.origin },
      })
      if (error) throw error
      // With email confirmation on, Supabase answers an existing address with a user that has no identities.
      if (data.user && !data.session && (data.user.identities?.length ?? 0) === 0) {
        throw new AuthFlowError('already-registered')
      }
      return { needsConfirmation: !data.session }
    },
    [],
  )

  const isEmailRegistered = useCallback(async (email: string): Promise<boolean | null> => {
    const { data, error } = await getSupabase().rpc('email_registered', { p_email: email })
    if (error) {
      console.warn('Could not check the email address', error.message)
      return null
    }
    return Boolean(data)
  }, [])

  const requestPasswordReset = useCallback(async (email: string) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) throw error
  }, [])

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await getSupabase().auth.updateUser({ password })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await getSupabase().auth.signOut()
    if (error) console.warn('Sign-out', error.message)
    try {
      await clearLocalCache()
    } catch (err) {
      console.warn('Could not clear the local cache', err)
    }
    // A full reload also resets the one-time database boot for the next sign-in.
    window.location.replace('/sign-in')
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      configured,
      loading,
      session,
      user: session?.user ?? null,
      approval,
      approvalError,
      refreshApproval,
      signIn,
      signUp,
      isEmailRegistered,
      requestPasswordReset,
      updatePassword,
      signOut,
    }),
    [
      configured,
      loading,
      session,
      approval,
      approvalError,
      refreshApproval,
      signIn,
      signUp,
      isEmailRegistered,
      requestPasswordReset,
      updatePassword,
      signOut,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

/** The name given at registration, falling back to the email address. */
export function displayName(user: User | null): string {
  const meta = user?.user_metadata as { full_name?: unknown } | undefined
  const name = typeof meta?.full_name === 'string' ? meta.full_name.trim() : ''
  return name || user?.email || ''
}

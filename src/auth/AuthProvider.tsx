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
  signOut: () => Promise<void>
}

export const MISSING_PROFILES = 'missing-profiles'

const AuthContext = createContext<AuthContextValue | null>(null)

async function fetchApproval(): Promise<{ approval: Approval; error: string | null }> {
  const { data, error } = await getSupabase().rpc('is_approved')
  if (error) {
    if (error.code === 'PGRST202' || error.message.includes('schema cache')) {
      return { approval: 'error', error: MISSING_PROFILES }
    }
    return { approval: 'error', error: error.message }
  }
  return { approval: data === true ? 'approved' : 'pending', error: null }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured()
  const [loading, setLoading] = useState(configured)
  const [session, setSession] = useState<Session | null>(null)
  const [checkedApproval, setCheckedApproval] = useState<{
    userId: string
    approval: Approval
    error: string | null
  } | null>(null)
  const userId = session?.user.id ?? null
  const currentApproval = checkedApproval?.userId === userId ? checkedApproval : null
  const approval = currentApproval?.approval ?? 'checking'
  const approvalError = currentApproval?.error ?? null

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
      setCheckedApproval((checked) => checked?.userId === next?.user.id ? checked : null)
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
    void fetchApproval().then((result) => {
      if (active) setCheckedApproval({ userId, ...result })
    })
    return () => {
      active = false
    }
  }, [userId])

  const refreshApproval = useCallback(async () => {
    if (!userId) return
    const result = await fetchApproval()
    setCheckedApproval((checked) => checked?.userId === userId ? { userId, ...result } : checked)
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
      signOut,
    }),
    [configured, loading, session, approval, approvalError, refreshApproval, signIn, signUp, signOut],
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

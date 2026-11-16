import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const publishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.VITE_SUPABASE_ANON_KEY
)?.trim()

const PLACEHOLDER_URL = 'YOUR_PROJECT_REF'
const PLACEHOLDER_KEY = 'your_publishable_key'

/** True when .env has a real project URL and publishable key (not the template). */
export function isSupabaseConfigured(): boolean {
  if (!url || !publishableKey) return false
  if (url.includes(PLACEHOLDER_URL) || publishableKey === PLACEHOLDER_KEY) return false
  return true
}

let client: SupabaseClient | null = null

/**
 * Browser client. Uses the public publishable key only.
 * Never pass the secret key here — it bypasses Row Level Security.
 */
export function getSupabase(): SupabaseClient {
  if (!isSupabaseConfigured() || !url || !publishableKey) {
    throw new Error(
      'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env, then restart the dev server.',
    )
  }
  if (!client) client = createClient(url, publishableKey)
  return client
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Placeholder values from .env.example. If a developer copies .env.example to
// .env.local without filling these in, requests would otherwise resolve to a
// non-existent host and produce a confusing `ERR_NAME_NOT_RESOLVED` /
// `Failed to fetch` error at signup time. Treat these as "not configured".
const PLACEHOLDER_URLS = new Set(['https://your-project.supabase.co'])
const PLACEHOLDER_KEYS = new Set(['sb_publishable_xxx'])

function isValidSupabaseUrl(url: string | undefined): url is string {
  if (!url) return false
  if (PLACEHOLDER_URLS.has(url)) return false
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false
    if (parsed.hostname === 'your-project.supabase.co') return false
    return true
  } catch {
    return false
  }
}

function isValidSupabaseKey(key: string | undefined): key is string {
  if (!key) return false
  if (PLACEHOLDER_KEYS.has(key)) return false
  return key.length > 16
}

export const supabaseConfigured: boolean =
  isValidSupabaseUrl(SUPABASE_URL) && isValidSupabaseKey(SUPABASE_ANON_KEY)

if (!supabaseConfigured && import.meta.env.DEV) {
  console.warn(
    '[supabase] Not configured. Set real VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY ' +
      'values in your .env.local (the placeholders from .env.example will be rejected).',
  )
}

function makeStub(): SupabaseClient {
  // Returning the real client with bogus URLs would throw immediately. Return
  // a thin proxy that surfaces a clear error if any method is called.
  const handler: ProxyHandler<object> = {
    get() {
      throw new Error(
        'Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env.local',
      )
    },
  }
  return new Proxy({}, handler) as unknown as SupabaseClient
}

export const supabase: SupabaseClient = supabaseConfigured
  ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 20,
        },
      },
    })
  : makeStub()

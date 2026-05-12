import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured: boolean = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

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

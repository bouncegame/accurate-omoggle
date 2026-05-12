import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import type { ProfileRow } from '@/types/db'

export type AuthStore = {
  session: Session | null
  user: User | null
  profile: ProfileRow | null
  loading: boolean
  initialized: boolean
  setSession: (s: Session | null) => void
  setProfile: (p: ProfileRow | null) => void
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuth = create<AuthStore>((set, get) => ({
  session: null,
  user: null,
  profile: null,
  loading: true,
  initialized: false,
  setSession: (s) => set({ session: s, user: s?.user ?? null }),
  setProfile: (p) => set({ profile: p }),
  refreshProfile: async () => {
    const u = get().user
    if (!u || !supabaseConfigured) return
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', u.id)
      .maybeSingle()
    if (!error && data) set({ profile: data as ProfileRow })
  },
  signOut: async () => {
    if (!supabaseConfigured) return
    await supabase.auth.signOut()
    set({ session: null, user: null, profile: null })
  },
}))

export async function bootstrapAuth(): Promise<void> {
  if (!supabaseConfigured) {
    useAuth.setState({ loading: false, initialized: true })
    return
  }
  const { data } = await supabase.auth.getSession()
  useAuth.setState({
    session: data.session,
    user: data.session?.user ?? null,
  })
  if (data.session?.user) {
    await useAuth.getState().refreshProfile()
  }
  useAuth.setState({ loading: false, initialized: true })

  supabase.auth.onAuthStateChange(async (_event, session) => {
    useAuth.setState({ session, user: session?.user ?? null })
    if (session?.user) {
      await useAuth.getState().refreshProfile()
    } else {
      useAuth.setState({ profile: null })
    }
  })
}

import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Loader2, Pencil, Save, Sparkles, Swords, Target, Trophy, X } from 'lucide-react'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import type { ProfileRow } from '@/types/db'
import { useAuth } from '@/store/auth'
import { rankFromMogX } from '@/lib/ranks'
import { RankBadge } from '@/components/ui/RankBadge'
import { MogXBar } from '@/components/ui/MogXBar'
import { toast } from '@/components/ui/Toast'

export function Profile() {
  const { handle } = useParams<{ handle: string }>()
  const { user, profile: myProfile, refreshProfile } = useAuth()
  const [profile, setProfile] = useState<ProfileRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState({ display_name: '', bio: '' })
  const [saving, setSaving] = useState(false)

  const isMe = useMemo(
    () => Boolean(profile && user && profile.id === user.id),
    [profile, user],
  )

  useEffect(() => {
    if (!supabaseConfigured || !handle) return
    let cancelled = false
    setLoading(true)
    void (async () => {
      const { data } = await supabase.from('profiles').select('*').eq('handle', handle).maybeSingle()
      if (!cancelled) {
        const row = (data ?? null) as ProfileRow | null
        setProfile(row)
        if (row) setDraft({ display_name: row.display_name, bio: row.bio ?? '' })
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [handle])

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-7 animate-spin text-mog-300" />
      </div>
    )
  }
  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-xl py-12 text-center">
        <h1 className="font-display text-3xl font-bold">Profile not found</h1>
        <p className="mt-2 text-sm text-ink-300">No mogger with that handle exists yet.</p>
        <Link className="btn-primary mt-6 inline-flex" to="/app">
          Back to dashboard
        </Link>
      </div>
    )
  }

  const { current } = rankFromMogX(profile.mogx)
  const winRate =
    profile.matches_played > 0 ? (profile.wins / profile.matches_played) * 100 : 0

  const save = async () => {
    if (!supabaseConfigured || !isMe) return
    const display_name = draft.display_name.trim().slice(0, 40) || profile.display_name
    const bio = draft.bio.trim().slice(0, 240)
    setSaving(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ display_name, bio })
        .eq('id', profile.id)
        .select()
        .single()
      if (error) throw error
      setProfile(data as ProfileRow)
      setEditing(false)
      toast({ kind: 'success', title: 'Profile updated' })
      if (isMe) await refreshProfile()
    } catch (err) {
      const e = err as Error
      toast({ kind: 'error', title: 'Save failed', description: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-3xl">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong relative overflow-hidden rounded-2xl p-6"
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full opacity-60 blur-3xl"
          style={{ background: `radial-gradient(closest-side, ${current.glow}, transparent)` }}
        />

        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
          <div
            className="grid size-20 shrink-0 place-items-center rounded-2xl font-display text-3xl font-bold text-ink-950"
            style={{
              background: `linear-gradient(135deg, ${current.gradient[0]}, ${current.gradient[2]})`,
              boxShadow: `0 0 30px -6px ${current.glow}`,
            }}
          >
            {profile.display_name.slice(0, 1).toUpperCase()}
          </div>
          <div className="flex-1">
            {editing && isMe ? (
              <input
                value={draft.display_name}
                onChange={(e) => setDraft((d) => ({ ...d, display_name: e.target.value }))}
                maxLength={40}
                className="input-field text-xl"
              />
            ) : (
              <div className="font-display text-3xl font-bold text-white">{profile.display_name}</div>
            )}
            <div className="text-sm text-ink-300">@{profile.handle}</div>
            <div className="mt-2">
              <RankBadge rank={current} size="md" />
            </div>
          </div>
          {isMe && !editing && (
            <button onClick={() => setEditing(true)} className="btn-ghost text-sm">
              <Pencil className="size-3.5" /> Edit
            </button>
          )}
          {isMe && editing && (
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setEditing(false)
                  setDraft({ display_name: profile.display_name, bio: profile.bio ?? '' })
                }}
                className="btn-ghost text-sm"
              >
                <X className="size-3.5" /> Cancel
              </button>
              <button onClick={() => void save()} disabled={saving} className="btn-primary text-sm">
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}{' '}
                Save
              </button>
            </div>
          )}
        </div>

        <div className="mt-6">
          {editing && isMe ? (
            <textarea
              value={draft.bio}
              onChange={(e) => setDraft((d) => ({ ...d, bio: e.target.value }))}
              maxLength={240}
              rows={3}
              placeholder="Bio (240 chars max)"
              className="input-field resize-none"
            />
          ) : profile.bio ? (
            <p className="text-pretty text-sm text-ink-200">{profile.bio}</p>
          ) : (
            <p className="text-sm italic text-ink-500">No bio yet.</p>
          )}
        </div>

        <div className="mt-6">
          <MogXBar mogx={profile.mogx} />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={Trophy} label="Wins" value={profile.wins} color="#10b981" />
          <Stat icon={Swords} label="Matches" value={profile.matches_played} color="#6ee7b7" />
          <Stat icon={Target} label="Best score" value={profile.best_score.toFixed(2)} color="#a855f7" />
          <Stat icon={Sparkles} label="Win rate" value={`${winRate.toFixed(0)}%`} color="#f59e0b" />
        </div>

        {isMe && (
          <div className="mt-6 flex justify-end">
            <Link to="/app/play" className="btn-primary text-sm">
              <Swords className="size-4" /> Queue another match
            </Link>
          </div>
        )}
      </motion.div>

      {!isMe && myProfile && (
        <p className="mt-4 text-center text-xs text-ink-400">
          Viewing as <span className="text-ink-200">@{myProfile.handle}</span>.{' '}
          <Link to="/app/play" className="text-mog-300 underline">
            Queue up
          </Link>{' '}
          to challenge a stranger.
        </p>
      )}
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  value: number | string
  color: string
}) {
  return (
    <div className="glass rounded-xl p-3">
      <div className="flex items-center justify-between">
        <Icon className="size-4" style={{ color }} />
        <span className="text-[10px] uppercase tracking-[0.18em] text-ink-400">{label}</span>
      </div>
      <div className="mt-2 font-display text-xl font-semibold tabular-nums text-white">{value}</div>
    </div>
  )
}

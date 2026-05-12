import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
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
        <Loader2 className="size-7 animate-spin text-mog-500" />
      </div>
    )
  }
  if (!profile) {
    return (
      <div className="mx-auto w-full max-w-xl py-12 text-center">
        <h1 className="font-mono text-3xl font-extrabold uppercase tracking-tight">profile not found</h1>
        <p className="mt-2 font-mono text-xs text-ink-300">no mogger with that handle exists yet.</p>
        <Link className="btn-primary mt-6 inline-flex" to="/app">
          back to dashboard
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
      <div className="border border-ink-400 bg-ink-900 p-6">
        <div className="flex flex-col items-start gap-4 md:flex-row md:items-center">
          <div className="grid size-20 shrink-0 place-items-center bg-mog-500 font-mono text-4xl font-extrabold text-black">
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
              <div className="font-mono text-3xl font-extrabold uppercase tracking-tight text-white">
                {profile.display_name}
              </div>
            )}
            <div className="font-mono text-xs text-ink-300">@{profile.handle}</div>
            <div className="mt-3">
              <RankBadge rank={current} size="md" />
            </div>
          </div>
          {isMe && !editing && (
            <button onClick={() => setEditing(true)} className="btn-ghost text-sm">
              <Pencil className="size-3.5" /> edit
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
                <X className="size-3.5" /> cancel
              </button>
              <button onClick={() => void save()} disabled={saving} className="btn-primary text-sm">
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}{' '}
                save
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
              placeholder="bio (240 chars max)"
              className="input-field resize-none"
            />
          ) : profile.bio ? (
            <p className="font-mono text-sm text-ink-200">{profile.bio}</p>
          ) : (
            <p className="font-mono text-xs italic text-ink-400">no bio yet.</p>
          )}
        </div>

        <div className="mt-6">
          <MogXBar mogx={profile.mogx} />
        </div>

        <div className="mt-6 grid grid-cols-2 divide-x divide-ink-500 border border-ink-500 md:grid-cols-4">
          <Stat icon={Trophy} label="wins" value={profile.wins} />
          <Stat icon={Swords} label="matches" value={profile.matches_played} />
          <Stat icon={Target} label="best" value={profile.best_score.toFixed(2)} />
          <Stat icon={Sparkles} label="win rate" value={`${winRate.toFixed(0)}%`} />
        </div>

        {isMe && (
          <div className="mt-6 flex justify-end">
            <Link to="/app/play" className="btn-primary text-sm">
              <Swords className="size-4" /> queue another match
            </Link>
          </div>
        )}
      </div>

      {!isMe && myProfile && (
        <p className="mt-4 text-center font-mono text-[10px] uppercase tracking-[0.16em] text-ink-400">
          viewing as <span className="text-mog-500">@{myProfile.handle}</span>.{' '}
          <Link to="/app/play" className="text-mog-500 underline">
            queue up
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
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  value: number | string
}) {
  return (
    <div className="p-3">
      <div className="flex items-center justify-between">
        <Icon className="size-3.5 text-mog-500" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">{label}</span>
      </div>
      <div className="mt-2 font-mono text-xl font-bold tabular-nums text-white">{value}</div>
    </div>
  )
}

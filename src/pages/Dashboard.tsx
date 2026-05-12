import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Crosshair,
  Flame,
  Gauge,
  Sparkles,
  Swords,
  Target,
  TrendingUp,
  Trophy,
} from 'lucide-react'
import { useAuth } from '@/store/auth'
import { MogXBar } from '@/components/ui/MogXBar'
import { rankFromMogX, RANKS } from '@/lib/ranks'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import type { MatchRow } from '@/types/db'
import { RankBadge } from '@/components/ui/RankBadge'
import { cn } from '@/lib/cn'

export function Dashboard() {
  const { profile, user } = useAuth()
  const [recent, setRecent] = useState<MatchRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseConfigured || !user) return
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('matches')
        .select('*')
        .or(`a_user_id.eq.${user.id},b_user_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(10)
      if (!cancelled) {
        setRecent((data ?? []) as MatchRow[])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  if (!profile) return null

  const { current } = rankFromMogX(profile.mogx)
  const winRate =
    profile.matches_played > 0 ? (profile.wins / profile.matches_played) * 100 : 0

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="font-mono text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
          welcome back, <span className="text-mog-500">{profile.display_name}</span>
        </h1>
        <p className="mt-2 font-mono text-xs text-ink-300">
          your standing on the ladder and a quick way back to mogging.
        </p>
      </div>

      <div className="border border-ink-400 bg-ink-900 p-6">
        <div className="mb-6 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <RankBadge rank={current} size="lg" />
            <div>
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-300">current rank</div>
              <div className="font-mono text-xs text-ink-200">{current.tagline}</div>
            </div>
          </div>
          <Link to="/app/play" className="btn-primary text-sm">
            <Swords className="size-4" /> queue match
          </Link>
        </div>

        <MogXBar mogx={profile.mogx} />

        <div className="mt-6 grid grid-cols-2 divide-x divide-ink-500 border border-ink-500 md:grid-cols-4">
          <Stat icon={Trophy} label="wins" value={profile.wins.toString()} />
          <Stat icon={Flame} label="win rate" value={`${winRate.toFixed(0)}%`} />
          <Stat icon={Target} label="best" value={profile.best_score.toFixed(2)} />
          <Stat icon={Sparkles} label="matches" value={profile.matches_played.toString()} />
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <div className="border border-ink-500 bg-ink-900 p-5">
          <SectionTitle icon={TrendingUp} title="recent matches" />
          {loading && <Skeleton rows={3} />}
          {!loading && recent.length === 0 && (
            <EmptyState
              icon={Swords}
              title="no matches yet"
              body="queue up and start collecting mogx."
              cta={
                <Link to="/app/play" className="btn-primary text-sm">
                  <Crosshair className="size-4" /> find a match
                </Link>
              }
            />
          )}
          {!loading && recent.length > 0 && (
            <ul className="mt-4 divide-y divide-ink-500 border-t border-ink-500">
              {recent.map((m) => (
                <MatchRowItem key={m.id} match={m} meId={user!.id} />
              ))}
            </ul>
          )}
        </div>

        <div className="border border-ink-500 bg-ink-900 p-5">
          <SectionTitle icon={Gauge} title="the ladder" />
          <ul className="mt-4 divide-y divide-ink-500 border border-ink-500">
            {RANKS.map((r) => {
              const isCurrent = r.key === current.key
              const reached = profile.mogx >= r.threshold
              return (
                <li
                  key={r.key}
                  className={cn(
                    'flex items-center justify-between gap-3 px-3 py-2',
                    isCurrent && 'bg-mog-500/[0.06]',
                    !reached && !isCurrent && 'opacity-50',
                  )}
                >
                  <RankBadge rank={r} size="sm" />
                  <span className="font-mono text-xs tabular-nums text-ink-300">
                    {r.threshold.toLocaleString()}
                  </span>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
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
  value: string
}) {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between">
        <Icon className="size-3.5 text-mog-500" />
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-300">{label}</span>
      </div>
      <div className="mt-2 font-mono text-2xl font-bold tabular-nums text-white">{value}</div>
    </div>
  )
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
}) {
  return (
    <div className="flex items-center gap-2 border-b border-ink-500 pb-3">
      <Icon className="size-3.5 text-mog-500" />
      <h2 className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-ink-100">{title}</h2>
    </div>
  )
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-3 space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse border border-ink-500 bg-ink-800" />
      ))}
    </div>
  )
}

function EmptyState({
  icon: Icon,
  title,
  body,
  cta,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  title: string
  body: string
  cta?: React.ReactNode
}) {
  return (
    <div className="mt-4 flex flex-col items-center gap-3 border border-ink-500 bg-ink-950 py-10 text-center">
      <div className="border border-ink-500 bg-ink-900 p-3">
        <Icon className="size-5 text-mog-500" />
      </div>
      <div className="font-mono text-sm font-bold uppercase tracking-tight text-white">{title}</div>
      <div className="px-6 font-mono text-[11px] text-ink-300">{body}</div>
      {cta && <div className="mt-1">{cta}</div>}
    </div>
  )
}

function MatchRowItem({ match, meId }: { match: MatchRow; meId: string }) {
  const iAmA = match.a_user_id === meId
  const myScore = iAmA ? match.a_score : match.b_score
  const oppScore = iAmA ? match.b_score : match.a_score
  const won = match.winner === (iAmA ? 'a' : 'b')
  const draw = match.winner === 'draw'
  const mogxGained = iAmA ? match.mogx_delta_a : match.mogx_delta_b
  return (
    <li className="flex items-center justify-between gap-3 py-3">
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'inline-flex items-center justify-center border px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em]',
            won
              ? 'border-mog-500 bg-mog-500/10 text-mog-500'
              : draw
                ? 'border-ink-400 bg-ink-800 text-ink-200'
                : 'border-blood-500 bg-blood-500/10 text-blood-500',
          )}
        >
          {won ? 'mog' : draw ? 'draw' : 'lost'}
        </div>
        <div className="font-mono text-sm tabular-nums">
          <span className="text-white">{myScore?.toFixed(2) ?? '--'}</span>
          <span className="px-1.5 text-ink-400">vs</span>
          <span className="text-ink-300">{oppScore?.toFixed(2) ?? '--'}</span>
        </div>
      </div>
      <div className="text-right">
        <div
          className={cn(
            'font-mono text-sm tabular-nums',
            mogxGained > 0 ? 'text-mog-500' : 'text-ink-400',
          )}
        >
          {mogxGained > 0 ? '+' : ''}{mogxGained}
        </div>
        <div className="font-mono text-[10px] text-ink-400">
          {new Date(match.created_at).toLocaleString()}
        </div>
      </div>
    </li>
  )
}

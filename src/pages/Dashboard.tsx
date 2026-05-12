import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
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
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
          Welcome back,{' '}
          <span
            style={{
              background: current.textGradient,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              color: 'transparent',
            }}
          >
            {profile.display_name}
          </span>
        </h1>
        <p className="mt-1 text-sm text-ink-300">
          Your current standing on the ladder and a quick way back to mogging.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="glass-strong relative overflow-hidden rounded-2xl p-6"
      >
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full opacity-50 blur-3xl"
          style={{ background: `radial-gradient(closest-side, ${current.glow}, transparent)` }}
        />
        <div className="mb-6 flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
          <div className="flex items-center gap-3">
            <RankBadge rank={current} size="lg" />
            <div>
              <div className="text-xs uppercase tracking-[0.2em] text-ink-400">Current rank</div>
              <div className="text-sm text-ink-200">{current.tagline}</div>
            </div>
          </div>
          <Link to="/app/play" className="btn-primary text-sm">
            <Swords className="size-4" /> Queue match
          </Link>
        </div>

        <MogXBar mogx={profile.mogx} />

        <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Stat icon={Trophy} label="Wins" value={profile.wins.toString()} accent="#10b981" />
          <Stat icon={Flame} label="Win rate" value={`${winRate.toFixed(0)}%`} accent="#f59e0b" />
          <Stat icon={Target} label="Best score" value={profile.best_score.toFixed(2)} accent="#a855f7" />
          <Stat icon={Sparkles} label="Matches" value={profile.matches_played.toString()} accent="#6ee7b7" />
        </div>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass rounded-2xl p-5"
        >
          <SectionTitle icon={TrendingUp} title="Recent matches" />
          {loading && <Skeleton rows={3} />}
          {!loading && recent.length === 0 && (
            <EmptyState
              icon={Swords}
              title="No matches yet"
              body="Queue up and start collecting MogX."
              cta={
                <Link to="/app/play" className="btn-primary text-sm">
                  <Crosshair className="size-4" /> Find a match
                </Link>
              }
            />
          )}
          {!loading && recent.length > 0 && (
            <ul className="mt-3 divide-y divide-white/5">
              {recent.map((m) => (
                <MatchRowItem key={m.id} match={m} meId={user!.id} />
              ))}
            </ul>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="glass rounded-2xl p-5"
        >
          <SectionTitle icon={Gauge} title="The ladder" />
          <ul className="mt-3 space-y-2">
            {RANKS.map((r) => {
              const isCurrent = r.key === current.key
              const reached = profile.mogx >= r.threshold
              return (
                <li
                  key={r.key}
                  className={cn(
                    'flex items-center justify-between rounded-lg px-3 py-2 ring-1 ring-transparent transition-colors',
                    isCurrent && 'ring-mog-500/30 bg-white/[0.03]',
                    !reached && !isCurrent && 'opacity-60',
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
        </motion.div>
      </div>
    </div>
  )
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
  label: string
  value: string
  accent: string
}) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between">
        <Icon className="size-4" style={{ color: accent }} />
        <span className="text-[10px] uppercase tracking-[0.18em] text-ink-400">{label}</span>
      </div>
      <div className="mt-2 font-display text-2xl font-semibold tabular-nums text-white">{value}</div>
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
    <div className="flex items-center gap-2">
      <Icon className="size-4 text-mog-300" />
      <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-ink-200">{title}</h2>
    </div>
  )
}

function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mt-3 space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-white/[0.04]" />
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
    <div className="mt-4 flex flex-col items-center gap-3 rounded-xl bg-white/[0.02] py-10 text-center ring-1 ring-white/5">
      <div className="rounded-full bg-mog-500/10 p-3 ring-1 ring-mog-500/30">
        <Icon className="size-5 text-mog-300" />
      </div>
      <div className="text-sm font-medium text-white">{title}</div>
      <div className="px-6 text-xs text-ink-300">{body}</div>
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
            'inline-flex items-center justify-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
            won
              ? 'bg-mog-500/15 text-mog-300 ring-1 ring-mog-500/30'
              : draw
                ? 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
                : 'bg-blood-500/15 text-blood-500 ring-1 ring-blood-500/30',
          )}
        >
          {won ? 'Mog' : draw ? 'Draw' : 'Lost'}
        </div>
        <div className="font-mono text-sm tabular-nums">
          <span className="text-white">{myScore?.toFixed(2) ?? '--'}</span>
          <span className="px-1.5 text-ink-500">vs</span>
          <span className="text-ink-300">{oppScore?.toFixed(2) ?? '--'}</span>
        </div>
      </div>
      <div className="text-right">
        <div
          className={cn(
            'font-mono text-sm tabular-nums',
            mogxGained > 0 ? 'text-mog-300' : 'text-ink-400',
          )}
        >
          +{mogxGained}
        </div>
        <div className="text-[10px] text-ink-500">{new Date(match.created_at).toLocaleString()}</div>
      </div>
    </li>
  )
}

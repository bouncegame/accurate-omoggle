import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Crown } from 'lucide-react'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import type { ProfileRow } from '@/types/db'
import { rankFromMogX } from '@/lib/ranks'
import { RankBadge } from '@/components/ui/RankBadge'
import { useAuth } from '@/store/auth'
import { cn } from '@/lib/cn'

export function Leaderboard() {
  const { user } = useAuth()
  const [rows, setRows] = useState<ProfileRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabaseConfigured) {
      setLoading(false)
      return
    }
    let cancelled = false
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .order('mogx', { ascending: false })
        .limit(100)
      if (!cancelled) {
        setRows((data ?? []) as ProfileRow[])
        setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="mx-auto w-full max-w-4xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Leaderboard</h1>
        <p className="mt-1 text-sm text-ink-300">
          Top 100 moggers by MogX. Climbing the ladder is the only thing that matters.
        </p>
      </motion.div>

      <div className="mt-6 glass rounded-2xl">
        {loading && (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-white/[0.04]" />
            ))}
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="px-6 py-12 text-center text-sm text-ink-300">
            No moggers yet. <Link className="underline" to="/app/play">Be the first.</Link>
          </div>
        )}
        {!loading && rows.length > 0 && (
          <ul className="divide-y divide-white/5">
            {rows.map((p, i) => {
              const { current } = rankFromMogX(p.mogx)
              const isMe = user?.id === p.id
              return (
                <li
                  key={p.id}
                  className={cn(
                    'flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-white/[0.02]',
                    isMe && 'bg-mog-500/[0.06]',
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div
                      className={cn(
                        'flex w-9 shrink-0 items-center justify-center font-mono text-sm font-semibold tabular-nums',
                        i === 0 ? 'text-chad-400' : i < 3 ? 'text-mog-300' : 'text-ink-400',
                      )}
                    >
                      {i === 0 ? <Crown className="size-4" /> : i + 1}
                    </div>
                    <div
                      className="grid size-9 shrink-0 place-items-center rounded-full font-display text-sm font-semibold text-ink-950"
                      style={{
                        background: `linear-gradient(135deg, ${current.gradient[0]}, ${current.gradient[2]})`,
                      }}
                    >
                      {p.display_name.slice(0, 1).toUpperCase()}
                    </div>
                    <Link
                      to={`/app/profile/${p.handle}`}
                      className="min-w-0 truncate text-sm font-medium text-white hover:underline"
                    >
                      {p.display_name}
                      <span className="ml-1.5 text-ink-400">@{p.handle}</span>
                    </Link>
                  </div>
                  <div className="flex items-center gap-3">
                    <RankBadge rank={current} size="xs" />
                    <div className="text-right">
                      <div className="font-mono text-sm tabular-nums text-white">
                        {p.mogx.toLocaleString()}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-ink-400">MogX</div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
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
      <div>
        <h1 className="font-mono text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
          leaderboard
        </h1>
        <p className="mt-2 font-mono text-xs text-ink-300">
          top 100 moggers by mogx. climbing the ladder is the only thing that matters.
        </p>
      </div>

      <div className="mt-6 border border-ink-400 bg-ink-900">
        <div className="grid grid-cols-[40px_1fr_120px_120px] gap-3 border-b border-ink-500 px-4 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-300">
          <span>#</span>
          <span>mogger</span>
          <span>rank</span>
          <span className="text-right">mogx</span>
        </div>
        {loading && (
          <div className="space-y-px p-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-12 animate-pulse border border-ink-500 bg-ink-800" />
            ))}
          </div>
        )}
        {!loading && rows.length === 0 && (
          <div className="px-6 py-12 text-center font-mono text-xs text-ink-300">
            no moggers yet. <Link className="text-mog-500 underline" to="/app/play">be the first.</Link>
          </div>
        )}
        {!loading && rows.length > 0 && (
          <ul className="divide-y divide-ink-500">
            {rows.map((p, i) => {
              const { current } = rankFromMogX(p.mogx)
              const isMe = user?.id === p.id
              return (
                <li
                  key={p.id}
                  className={cn(
                    'grid grid-cols-[40px_1fr_120px_120px] items-center gap-3 px-4 py-3 transition-colors hover:bg-ink-800',
                    isMe && 'bg-mog-500/[0.06]',
                  )}
                >
                  <div
                    className={cn(
                      'font-mono text-sm font-bold tabular-nums',
                      i === 0 ? 'text-mog-500' : i < 3 ? 'text-ink-100' : 'text-ink-400',
                    )}
                  >
                    {i === 0 ? <Crown className="size-4 text-mog-500" /> : i + 1}
                  </div>
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="grid size-8 shrink-0 place-items-center bg-mog-500 font-mono text-sm font-extrabold text-black">
                      {p.display_name.slice(0, 1).toUpperCase()}
                    </div>
                    <Link
                      to={`/app/profile/${p.handle}`}
                      className="min-w-0 truncate font-mono text-sm font-bold uppercase tracking-tight text-white hover:text-mog-500"
                    >
                      {p.display_name}
                      <span className="ml-1.5 normal-case font-medium text-ink-400">@{p.handle}</span>
                    </Link>
                  </div>
                  <div><RankBadge rank={current} size="xs" /></div>
                  <div className="text-right font-mono text-sm font-bold tabular-nums text-white">
                    {p.mogx.toLocaleString()}
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

import { rankFromMogX } from '@/lib/ranks'
import { RankBadge } from './RankBadge'

type Props = {
  mogx: number
}

// Brutalist progress: a hard segmented track with a single flat fill.
// No shimmer, no glow, no gradient. Numbers are tabular mono for that
// scoreboard-readout feel.
export function MogXBar({ mogx }: Props) {
  const { current, next, progress, toNext } = rankFromMogX(mogx)
  const accent = current.gradient[1]
  const nextAccent = next?.gradient[1] ?? accent

  return (
    <div className="w-full">
      <div className="mb-2 flex items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <RankBadge rank={current} size="md" />
          <div className="hidden sm:block label-caps normal-case">{current.tagline}</div>
        </div>
        <div className="flex items-baseline gap-2 font-mono">
          <span className="text-base tabular-nums text-white">
            {Math.floor(mogx).toLocaleString()}
          </span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-ink-300">MogX</span>
        </div>
      </div>

      <div className="relative h-2 w-full border border-ink-500 bg-ink-950">
        <div
          className="absolute inset-y-0 left-0 transition-[width] duration-500 ease-out"
          style={{ width: `${progress * 100}%`, background: accent }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-[0.16em]">
        <span className="tabular-nums text-ink-300">{Math.floor(progress * 100)}%</span>
        {next ? (
          <span className="text-ink-300">
            {toNext.toLocaleString()} to{' '}
            <span style={{ color: nextAccent }}>{next.name}</span>
          </span>
        ) : (
          <span className="text-mog-500">max rank</span>
        )}
      </div>
    </div>
  )
}

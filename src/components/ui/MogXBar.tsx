import { motion } from 'framer-motion'
import { rankFromMogX } from '@/lib/ranks'
import { RankBadge } from './RankBadge'
import { ChevronsRight } from 'lucide-react'

type Props = {
  mogx: number
}

export function MogXBar({ mogx }: Props) {
  const { current, next, progress, toNext } = rankFromMogX(mogx)

  return (
    <div className="w-full">
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <RankBadge rank={current} size="md" />
          <div className="hidden sm:block text-xs text-ink-300">{current.tagline}</div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono tabular-nums text-ink-200">
            {Math.floor(mogx).toLocaleString()}
          </span>
          <span className="text-ink-400">MogX</span>
        </div>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-ink-800 ring-1 ring-white/5">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress * 100}%` }}
          transition={{ type: 'spring', stiffness: 60, damping: 14 }}
          style={{
            background: `linear-gradient(90deg, ${current.gradient[0]} 0%, ${current.gradient[1]} 50%, ${next?.gradient[0] ?? current.gradient[2]} 100%)`,
            boxShadow: `0 0 24px -4px ${current.glow}`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-y-0 left-0 rounded-full opacity-50"
          style={{
            width: `${progress * 100}%`,
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2.5s linear infinite',
          }}
        />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-ink-400">
        <span className="font-mono tabular-nums">
          {Math.floor(progress * 100)}%
        </span>
        {next ? (
          <span className="inline-flex items-center gap-1">
            <ChevronsRight className="size-3" />
            <span>
              {toNext.toLocaleString()} to{' '}
              <span
                className="font-semibold"
                style={{
                  background: next.textGradient,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                }}
              >
                {next.name}
              </span>
            </span>
          </span>
        ) : (
          <span className="text-gradient-chad font-semibold">MAX RANK</span>
        )}
      </div>
    </div>
  )
}

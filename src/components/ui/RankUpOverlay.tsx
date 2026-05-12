import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import type { Rank } from '@/lib/ranks'

type Props = {
  rank: Rank | null
  onDone: () => void
}

// Brutalist rank-up reveal: a black takeover with a hard horizontal bar
// flying in, ALL CAPS, mono, accent color = the new rank. No conic rays, no
// particles, no glow. Reads like a terminal event log line at 100x scale.
export function RankUpOverlay({ rank, onDone }: Props) {
  useEffect(() => {
    if (!rank) return
    const timer = setTimeout(onDone, 3000)
    return () => clearTimeout(timer)
  }, [rank, onDone])

  return (
    <AnimatePresence>
      {rank && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-ink-950"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onClick={onDone}
        >
          <motion.div
            className="flex flex-col items-start px-8"
            initial={{ x: -40, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.25, ease: [0.2, 0.9, 0.2, 1] }}
          >
            <div className="flex items-center gap-3 font-mono text-xs font-bold uppercase tracking-[0.24em] text-ink-300">
              <span className="inline-block size-2 animate-blink bg-mog-500" />
              rank up
            </div>
            <h1
              className="mt-3 font-mono text-7xl font-extrabold uppercase leading-none tracking-tight md:text-9xl"
              style={{ color: rank.gradient[1] }}
            >
              {rank.name}
            </h1>
            <p className="mt-4 max-w-xl font-mono text-sm text-ink-200">
              {rank.tagline}
            </p>
            <div className="mt-6 font-mono text-[10px] uppercase tracking-[0.24em] text-ink-400">
              click anywhere to dismiss
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

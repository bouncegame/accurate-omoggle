import { AnimatePresence, motion } from 'framer-motion'
import { useEffect } from 'react'
import type { Rank } from '@/lib/ranks'
import { Sparkles } from 'lucide-react'

type Props = {
  rank: Rank | null
  onDone: () => void
}

// Cinematic full-screen reveal when the player ranks up.
export function RankUpOverlay({ rank, onDone }: Props) {
  useEffect(() => {
    if (!rank) return
    const timer = setTimeout(onDone, 3800)
    return () => clearTimeout(timer)
  }, [rank, onDone])

  return (
    <AnimatePresence>
      {rank && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          <motion.div
            className="absolute inset-0 backdrop-blur-2xl"
            style={{
              background: `radial-gradient(ellipse 60% 60% at 50% 45%, ${rank.glow.replace('0.4)', '0.55)').replace('0.5)', '0.55)').replace('0.6)', '0.65)')}, rgba(0,0,0,0.85) 70%)`,
            }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onDone}
          />
          {/* radial rays */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0, rotate: 0 }}
            animate={{ opacity: 0.4, rotate: 360 }}
            transition={{ duration: 18, ease: 'linear', repeat: Infinity }}
            style={{
              background: `conic-gradient(from 0deg at 50% 50%, transparent 0deg, ${rank.gradient[1]}55 8deg, transparent 16deg, transparent 32deg, ${rank.gradient[0]}40 40deg, transparent 48deg, transparent 90deg, ${rank.gradient[2]}55 98deg, transparent 106deg)`,
              maskImage:
                'radial-gradient(ellipse 50% 50% at 50% 50%, transparent 25%, black 30%, black 60%, transparent 75%)',
              WebkitMaskImage:
                'radial-gradient(ellipse 50% 50% at 50% 50%, transparent 25%, black 30%, black 60%, transparent 75%)',
            }}
          />

          {/* particles */}
          {Array.from({ length: 36 }).map((_, i) => (
            <motion.span
              key={i}
              className="pointer-events-none absolute left-1/2 top-1/2 size-2 rounded-full"
              style={{ background: rank.gradient[i % 3] }}
              initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
              animate={{
                x: Math.cos((i / 36) * Math.PI * 2) * (180 + Math.random() * 120),
                y: Math.sin((i / 36) * Math.PI * 2) * (180 + Math.random() * 120),
                scale: [0, 1, 0.4],
                opacity: [0, 1, 0],
              }}
              transition={{ duration: 1.4 + Math.random() * 0.6, ease: 'easeOut', delay: 0.15 + Math.random() * 0.2 }}
            />
          ))}

          {/* central card */}
          <motion.div
            className="relative z-10 mx-6 max-w-md text-center"
            initial={{ scale: 0.6, opacity: 0, y: 30 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 220, damping: 18, delay: 0.1 }}
          >
            <motion.div
              className="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-display font-semibold uppercase tracking-[0.3em]"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
              }}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.35 }}
            >
              <Sparkles className="size-3.5" /> Rank Up
            </motion.div>

            <motion.h1
              className="font-display text-6xl font-bold leading-tight md:text-7xl"
              style={{
                background: rank.textGradient,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                color: 'transparent',
                textShadow: `0 0 40px ${rank.glow}`,
              }}
              initial={{ letterSpacing: '0.5em', opacity: 0 }}
              animate={{ letterSpacing: '0em', opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.45 }}
            >
              {rank.name.toUpperCase()}
            </motion.h1>

            <motion.p
              className="mt-3 text-sm text-ink-200"
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.85 }}
            >
              {rank.tagline}
            </motion.p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FaceScanner, type FaceScannerHandle } from '@/components/FaceScanner'
import type { ScoreBreakdown } from '@/lib/face/score'
import { ArrowRight, Eye, Info, Ruler, Scale, ScanFace, Smile, Triangle } from 'lucide-react'
import { Link } from 'react-router-dom'

const SUB_SCORES: Array<{
  key: keyof Omit<ScoreBreakdown, 'total'>
  label: string
  weight: string
  blurb: string
  icon: React.ComponentType<{ className?: string }>
}> = [
  { key: 'symmetry', label: 'Symmetry', weight: '32%', blurb: '11 paired landmarks vs the facial midline.', icon: Scale },
  { key: 'proportions', label: 'Proportions', weight: '22%', blurb: 'Vertical thirds + face aspect ratio (1.45).', icon: Ruler },
  { key: 'jawline', label: 'Jawline', weight: '16%', blurb: 'Angle formed at the chin by left/right jaw points.', icon: Triangle },
  { key: 'eyeSpacing', label: 'Eye spacing', weight: '12%', blurb: 'Inter-eye distance / single eye width.', icon: Eye },
  { key: 'lipRatio', label: 'Lip ratio', weight: '10%', blurb: 'Lower lip / upper lip thickness vs φ (1.618).', icon: Smile },
  { key: 'noseRatio', label: 'Nose ratio', weight: '8%', blurb: 'Nose width / face width vs target 0.235.', icon: ScanFace },
]

export function Calibrate() {
  const ref = useRef<FaceScannerHandle>(null)
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null)

  return (
    <div className="mx-auto w-full max-w-5xl">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Calibrate your face.</h1>
        <p className="mt-1 text-sm text-ink-300">
          Frame your face inside the box. The 468-point mesh runs locally; the score is the
          weighted sum of six explicit sub-scores you can watch update live.
        </p>
      </motion.div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1fr]">
        <FaceScanner
          ref={ref}
          autoStart
          onScore={(_total, b) => setBreakdown(b)}
          label="Calibration"
        />

        <div className="glass rounded-2xl p-5">
          <div className="mb-3 flex items-center gap-2 text-xs text-ink-300">
            <Info className="size-3.5 text-mog-300" />
            <span>
              These six numbers fully determine the live score. No model, no randomness, no judgment.
            </span>
          </div>
          <ul className="space-y-3">
            {SUB_SCORES.map(({ key, label, weight, blurb, icon: Icon }) => {
              const v = breakdown?.[key] ?? 0
              return (
                <li key={key} className="rounded-xl bg-white/[0.02] p-3 ring-1 ring-white/5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Icon className="size-4 text-mog-300" />
                      <div>
                        <div className="text-sm font-semibold text-white">{label}</div>
                        <div className="text-[11px] text-ink-400">{blurb}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm tabular-nums text-white">
                        {v.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-ink-500">weight {weight}</div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink-800">
                    <motion.div
                      className="h-full rounded-full"
                      style={{
                        background:
                          'linear-gradient(90deg, #6ee7b7 0%, #10b981 60%, #a855f7 100%)',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.max(0, Math.min(1, v)) * 100}%` }}
                      transition={{ type: 'spring', stiffness: 80, damping: 14 }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="mt-5 flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-between">
            <div className="text-xs text-ink-400">
              When you're happy with the read, queue your first match.
            </div>
            <Link to="/app/play" className="btn-primary text-sm">
              Find a match <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

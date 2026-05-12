import { useRef, useState } from 'react'
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
  { key: 'symmetry', label: 'symmetry', weight: '32%', blurb: '11 paired landmarks vs the facial midline.', icon: Scale },
  { key: 'proportions', label: 'proportions', weight: '22%', blurb: 'vertical thirds + face aspect ratio (1.45).', icon: Ruler },
  { key: 'jawline', label: 'jawline', weight: '16%', blurb: 'angle formed at the chin by left/right jaw points.', icon: Triangle },
  { key: 'eyeSpacing', label: 'eye spacing', weight: '12%', blurb: 'inter-eye distance / single eye width.', icon: Eye },
  { key: 'lipRatio', label: 'lip ratio', weight: '10%', blurb: 'lower lip / upper lip thickness vs φ (1.618).', icon: Smile },
  { key: 'noseRatio', label: 'nose ratio', weight: '8%', blurb: 'nose width / face width vs target 0.235.', icon: ScanFace },
]

export function Calibrate() {
  const ref = useRef<FaceScannerHandle>(null)
  const [breakdown, setBreakdown] = useState<ScoreBreakdown | null>(null)

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div>
        <h1 className="font-mono text-3xl font-extrabold uppercase tracking-tight md:text-4xl">
          calibrate your face
        </h1>
        <p className="mt-2 font-mono text-xs text-ink-300 md:text-sm">
          frame your face inside the box. the 468-point mesh runs locally; the score is the
          weighted sum of six explicit sub-scores you can watch update live.
        </p>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-[1fr_1fr]">
        <FaceScanner
          ref={ref}
          autoStart
          onScore={(_total, b) => setBreakdown(b)}
          label="calibration"
        />

        <div className="border border-ink-500 bg-ink-900 p-5">
          <div className="mb-4 flex items-start gap-2 border border-ink-500 bg-ink-950 p-3 font-mono text-[11px] leading-relaxed text-ink-200">
            <Info className="size-3.5 shrink-0 text-mog-500" />
            <span>
              these six numbers fully determine the live score. no model, no randomness, no judgment.
            </span>
          </div>
          <ul className="divide-y divide-ink-500 border border-ink-500">
            {SUB_SCORES.map(({ key, label, weight, blurb, icon: Icon }) => {
              const v = breakdown?.[key] ?? 0
              return (
                <li key={key} className="bg-ink-950 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <Icon className="size-3.5 text-mog-500" />
                      <div>
                        <div className="font-mono text-xs font-bold uppercase tracking-[0.08em] text-white">
                          {label}
                        </div>
                        <div className="font-mono text-[10px] text-ink-300">{blurb}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold tabular-nums text-white">
                        {v.toFixed(2)}
                      </div>
                      <div className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">
                        w {weight}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 h-1.5 border border-ink-500 bg-ink-900">
                    <div
                      className="h-full bg-mog-500 transition-[width] duration-300"
                      style={{ width: `${Math.max(0, Math.min(1, v)) * 100}%` }}
                    />
                  </div>
                </li>
              )
            })}
          </ul>

          <div className="mt-5 flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-ink-400">
              when you're happy with the read, queue your first match.
            </div>
            <Link to="/app/play" className="btn-primary text-sm">
              find a match <ArrowRight className="size-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

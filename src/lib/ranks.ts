// AccurateOmoggle rank ladder.
// Ordering (low -> high): Chud, Chudlite, Sub5, Sub7, Average Joe, Mogger, Chadlite, Chad

export type RankKey =
  | 'chud'
  | 'chudlite'
  | 'sub5'
  | 'sub7'
  | 'averagejoe'
  | 'mogger'
  | 'chadlite'
  | 'chad'

export type Rank = {
  key: RankKey
  name: string
  threshold: number // MogX required to enter this rank
  tagline: string
  // Gradient stops used for the rank chip, progress bar, and rank-up cinematic.
  gradient: [string, string, string]
  glow: string
  textGradient: string
}

export const RANKS: readonly Rank[] = [
  {
    key: 'chud',
    name: 'Chud',
    threshold: 0,
    tagline: 'Just hatched. Keep grinding.',
    gradient: ['#6b7280', '#4b5563', '#374151'],
    glow: 'rgba(107,114,128,0.45)',
    textGradient: 'linear-gradient(135deg,#d1d5db,#6b7280,#374151)',
  },
  {
    key: 'chudlite',
    name: 'Chudlite',
    threshold: 100,
    tagline: 'Faint signs of bone structure.',
    gradient: ['#94a3b8', '#64748b', '#475569'],
    glow: 'rgba(148,163,184,0.5)',
    textGradient: 'linear-gradient(135deg,#e2e8f0,#94a3b8,#475569)',
  },
  {
    key: 'sub5',
    name: 'Sub5',
    threshold: 300,
    tagline: 'Below the median. Pickup the looksmaxxing pace.',
    gradient: ['#fb7185', '#f43f5e', '#be123c'],
    glow: 'rgba(244,63,94,0.5)',
    textGradient: 'linear-gradient(135deg,#fda4af,#f43f5e,#be123c)',
  },
  {
    key: 'sub7',
    name: 'Sub7',
    threshold: 700,
    tagline: 'Cresting toward decent. Tighten the jaw.',
    gradient: ['#fb923c', '#f97316', '#c2410c'],
    glow: 'rgba(249,115,22,0.5)',
    textGradient: 'linear-gradient(135deg,#fed7aa,#f97316,#c2410c)',
  },
  {
    key: 'averagejoe',
    name: 'Average Joe',
    threshold: 1400,
    tagline: 'Statistically unremarkable. Comfortably mid.',
    gradient: ['#fbbf24', '#f59e0b', '#b45309'],
    glow: 'rgba(245,158,11,0.55)',
    textGradient: 'linear-gradient(135deg,#fde68a,#f59e0b,#b45309)',
  },
  {
    key: 'mogger',
    name: 'Mogger',
    threshold: 2400,
    tagline: 'You start winning the lobbies.',
    gradient: ['#34d399', '#10b981', '#047857'],
    glow: 'rgba(16,185,129,0.55)',
    textGradient: 'linear-gradient(135deg,#6ee7b7,#10b981,#047857)',
  },
  {
    key: 'chadlite',
    name: 'Chadlite',
    threshold: 3800,
    tagline: 'Genetics whispering. Almost there.',
    gradient: ['#67e8f9', '#06b6d4', '#0e7490'],
    glow: 'rgba(6,182,212,0.6)',
    textGradient: 'linear-gradient(135deg,#a5f3fc,#06b6d4,#0e7490)',
  },
  {
    key: 'chad',
    name: 'Chad',
    threshold: 6000,
    tagline: 'Apex. Every lobby folds.',
    gradient: ['#fde68a', '#f59e0b', '#a855f7'],
    glow: 'rgba(168,85,247,0.6)',
    textGradient: 'linear-gradient(135deg,#fde68a,#f59e0b,#a855f7)',
  },
] as const

export function rankFromMogX(mogx: number): {
  current: Rank
  next: Rank | null
  progress: number // 0..1 to next rank
  toNext: number
} {
  const sorted = [...RANKS].sort((a, b) => a.threshold - b.threshold)
  let current = sorted[0]!
  for (const r of sorted) {
    if (mogx >= r.threshold) current = r
  }
  const idx = sorted.findIndex((r) => r.key === current.key)
  const next = idx >= 0 && idx < sorted.length - 1 ? sorted[idx + 1]! : null
  if (!next) {
    return { current, next: null, progress: 1, toNext: 0 }
  }
  const span = next.threshold - current.threshold
  const into = mogx - current.threshold
  const progress = Math.max(0, Math.min(1, into / span))
  return { current, next, progress, toNext: next.threshold - mogx }
}

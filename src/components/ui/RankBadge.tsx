import type { Rank } from '@/lib/ranks'
import { cn } from '@/lib/cn'

type Props = {
  rank: Rank
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  showName?: boolean
}

// Brutalist rank chip: a hard colored block + the rank name in mono caps.
// Rank color is taken from the mid stop of the legacy gradient array so
// every rank retains its identity (red for sub5, orange for sub7, etc.)
// but renders as a single flat swatch with no glow.
export function RankBadge({ rank, size = 'md', className, showName = true }: Props) {
  const sizes = {
    xs: { pad: 'px-1.5 py-0.5', text: 'text-[9px]', dot: 'size-2' },
    sm: { pad: 'px-2 py-0.5', text: 'text-[10px]', dot: 'size-2.5' },
    md: { pad: 'px-2.5 py-1', text: 'text-[11px]', dot: 'size-3' },
    lg: { pad: 'px-3 py-1.5', text: 'text-sm', dot: 'size-3.5' },
  } as const
  const s = sizes[size]
  const accent = rank.gradient[1]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 border border-ink-500 bg-ink-900 font-mono font-bold uppercase tracking-[0.12em]',
        s.pad,
        s.text,
        className,
      )}
    >
      <span className={s.dot} style={{ background: accent }} />
      {showName && <span style={{ color: accent }}>{rank.name}</span>}
    </span>
  )
}

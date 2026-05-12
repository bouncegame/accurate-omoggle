import { cn } from '@/lib/cn'

type Props = {
  className?: string
  iconOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

// Brutalist wordmark. No SVG, no gradient — just mono caps with one accent
// glyph. The "/" reads as a system path separator, anchoring the "tool, not
// toy" feel of the rest of the UI.
export function Logo({ className, iconOnly = false, size = 'md' }: Props) {
  const sizes = {
    sm: { mark: 'text-[14px]', text: 'text-[14px]' },
    md: { mark: 'text-[16px]', text: 'text-[16px]' },
    lg: { mark: 'text-[22px]', text: 'text-[22px]' },
  } as const
  const s = sizes[size]
  return (
    <div className={cn('inline-flex items-center gap-2 select-none font-mono font-bold uppercase tracking-[0.08em]', className)}>
      <span className={cn('inline-flex items-center justify-center bg-mog-500 px-1.5 text-black', s.mark)}>
        AO
      </span>
      {!iconOnly && (
        <span className={cn('text-ink-100', s.text)}>
          accurate<span className="text-mog-500">/</span>omoggle
        </span>
      )}
    </div>
  )
}

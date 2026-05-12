import { motion } from 'framer-motion'
import type { Rank } from '@/lib/ranks'
import { cn } from '@/lib/cn'

type Props = {
  rank: Rank
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
  showName?: boolean
}

export function RankBadge({ rank, size = 'md', className, showName = true }: Props) {
  const sizes = {
    xs: { pad: 'px-2 py-0.5', text: 'text-[10px]', icon: 12 },
    sm: { pad: 'px-2.5 py-1', text: 'text-xs', icon: 14 },
    md: { pad: 'px-3 py-1.5', text: 'text-sm', icon: 16 },
    lg: { pad: 'px-4 py-2', text: 'text-base', icon: 20 },
  } as const
  const s = sizes[size]
  return (
    <motion.div
      initial={{ scale: 0.92, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 280, damping: 20 }}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-display font-semibold uppercase tracking-wider',
        s.pad,
        s.text,
        className,
      )}
      style={{
        background: `linear-gradient(135deg, ${rank.gradient[0]}30 0%, ${rank.gradient[1]}25 50%, ${rank.gradient[2]}30 100%)`,
        border: `1px solid ${rank.gradient[1]}50`,
        boxShadow: `0 0 18px -2px ${rank.glow}, inset 0 0 12px -8px ${rank.glow}`,
      }}
    >
      <span
        className="block rounded-full"
        style={{
          width: s.icon,
          height: s.icon,
          background: `radial-gradient(circle, ${rank.gradient[0]} 0%, ${rank.gradient[1]} 60%, ${rank.gradient[2]} 100%)`,
          boxShadow: `0 0 14px -2px ${rank.glow}`,
        }}
      />
      {showName && (
        <span
          style={{
            background: rank.textGradient,
            WebkitBackgroundClip: 'text',
            backgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            color: 'transparent',
          }}
        >
          {rank.name}
        </span>
      )}
    </motion.div>
  )
}

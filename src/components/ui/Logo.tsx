import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

type Props = {
  className?: string
  iconOnly?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function Logo({ className, iconOnly = false, size = 'md' }: Props) {
  const sizes = {
    sm: { mark: 22, text: 'text-base' },
    md: { mark: 30, text: 'text-lg' },
    lg: { mark: 44, text: 'text-2xl' },
  } as const
  const s = sizes[size]
  return (
    <div className={cn('inline-flex items-center gap-2.5 select-none', className)}>
      <motion.svg
        width={s.mark}
        height={s.mark}
        viewBox="0 0 40 40"
        fill="none"
        initial={{ rotate: -8, scale: 0.9 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 220, damping: 14 }}
      >
        <defs>
          <linearGradient id="logograd" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#6ee7b7" />
            <stop offset="55%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <path
          d="M20 3 L34 11 L34 27 L20 37 L6 27 L6 11 Z"
          stroke="url(#logograd)"
          strokeWidth="2.6"
          strokeLinejoin="round"
        />
        <path
          d="M13 17 L20 22 L27 17"
          stroke="url(#logograd)"
          strokeWidth="2.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="20" cy="27" r="2" fill="url(#logograd)" />
      </motion.svg>
      {!iconOnly && (
        <span className={cn('font-display font-semibold tracking-tight', s.text)}>
          Accurate<span className="text-gradient">Omoggle</span>
        </span>
      )}
    </div>
  )
}

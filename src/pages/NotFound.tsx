import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'

export function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center">
      <Logo size="md" />
      <h1 className="mt-8 font-display text-6xl font-bold tracking-tight text-gradient">404</h1>
      <p className="mt-2 text-sm text-ink-300">This face has been mogged off the leaderboard.</p>
      <Link to="/" className="btn-primary mt-6">
        Back home
      </Link>
    </div>
  )
}

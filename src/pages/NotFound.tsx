import { Link } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'

export function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center">
      <Logo size="md" />
      <h1 className="mt-10 font-mono text-7xl font-extrabold uppercase tracking-tight text-mog-500">
        404
      </h1>
      <p className="mt-3 font-mono text-xs uppercase tracking-[0.18em] text-ink-300">
        this face has been mogged off the leaderboard
      </p>
      <Link to="/" className="btn-primary mt-8">
        back home
      </Link>
    </div>
  )
}

import { type ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/store/auth'
import { Loader2 } from 'lucide-react'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading, initialized } = useAuth()
  const location = useLocation()

  if (loading || !initialized) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="size-8 animate-spin text-mog-300" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

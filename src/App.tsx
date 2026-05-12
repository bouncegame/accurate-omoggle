import { lazy, Suspense, useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Loader2 } from 'lucide-react'
import { Background } from '@/components/ui/Background'
import { Landing } from '@/pages/Landing'
import { Auth } from '@/pages/Auth'
import { NotFound } from '@/pages/NotFound'
import { RequireAuth } from '@/components/RequireAuth'
import { bootstrapAuth } from '@/store/auth'
import { ToastHost } from '@/components/ui/Toast'

const AppLayout = lazy(() => import('@/pages/AppLayout').then((m) => ({ default: m.AppLayout })))
const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.Dashboard })))
const Play = lazy(() => import('@/pages/Play').then((m) => ({ default: m.Play })))
const Calibrate = lazy(() => import('@/pages/Calibrate').then((m) => ({ default: m.Calibrate })))
const Leaderboard = lazy(() =>
  import('@/pages/Leaderboard').then((m) => ({ default: m.Leaderboard })),
)
const Profile = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.Profile })))

export function App() {
  useEffect(() => {
    void bootstrapAuth()
  }, [])

  return (
    <>
      <Background />
      <ToastHost />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/auth" element={<Auth />} />
          <Route
            path="/app"
            element={
              <RequireAuth>
                <AppLayout />
              </RequireAuth>
            }
          >
            <Route index element={<Dashboard />} />
            <Route path="play" element={<Play />} />
            <Route path="calibrate" element={<Calibrate />} />
            <Route path="leaderboard" element={<Leaderboard />} />
            <Route path="profile/:handle" element={<Profile />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </>
  )
}

function RouteFallback() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Loader2 className="size-7 animate-spin text-mog-300" />
    </div>
  )
}

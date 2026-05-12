import { useEffect } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Background } from '@/components/ui/Background'
import { Landing } from '@/pages/Landing'
import { Auth } from '@/pages/Auth'
import { AppLayout } from '@/pages/AppLayout'
import { Dashboard } from '@/pages/Dashboard'
import { Play } from '@/pages/Play'
import { Leaderboard } from '@/pages/Leaderboard'
import { Profile } from '@/pages/Profile'
import { Calibrate } from '@/pages/Calibrate'
import { NotFound } from '@/pages/NotFound'
import { RequireAuth } from '@/components/RequireAuth'
import { bootstrapAuth } from '@/store/auth'
import { ToastHost } from '@/components/ui/Toast'

export function App() {
  useEffect(() => {
    void bootstrapAuth()
  }, [])

  return (
    <>
      <Background />
      <ToastHost />
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
    </>
  )
}

import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Crosshair, Gauge, LayoutDashboard, LogOut, Sparkles, Trophy } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { useAuth } from '@/store/auth'
import { rankFromMogX } from '@/lib/ranks'
import { RankBadge } from '@/components/ui/RankBadge'
import { cn } from '@/lib/cn'
import { toast } from '@/components/ui/Toast'

type NavItem = {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  end?: boolean
}

const NAV: readonly NavItem[] = [
  { to: '/app', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/play', label: 'Play', icon: Crosshair },
  { to: '/app/calibrate', label: 'Calibrate', icon: Gauge },
  { to: '/app/leaderboard', label: 'Leaderboard', icon: Trophy },
]

export function AppLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-7xl">
      <aside className="sticky top-0 hidden h-dvh w-[244px] shrink-0 flex-col border-r border-white/5 px-4 py-5 md:flex">
        <Logo size="md" />

        <nav className="mt-8 flex flex-col gap-1">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group relative inline-flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-white/[0.06] text-white'
                    : 'text-ink-300 hover:bg-white/[0.03] hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('size-4', isActive ? 'text-mog-300' : 'text-ink-400 group-hover:text-ink-200')} />
                  {label}
                  {isActive && (
                    <span className="absolute inset-y-1.5 left-0 w-[3px] rounded-r-full bg-mog-400" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto">
          {profile && <SidebarProfile />}
          <button
            type="button"
            onClick={async () => {
              await signOut()
              toast({ kind: 'info', title: 'Signed out' })
              navigate('/')
            }}
            className="mt-3 inline-flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink-300 transition-colors hover:bg-white/[0.04] hover:text-white"
          >
            <LogOut className="size-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-white/5 bg-ink-950/80 px-4 py-3 backdrop-blur-md md:hidden">
        <Logo size="sm" />
        {profile && (
          <RankBadge rank={rankFromMogX(profile.mogx).current} size="sm" />
        )}
      </div>

      <main className="min-h-dvh flex-1 px-4 pb-24 pt-16 md:px-8 md:pt-8">
        <Outlet />
      </main>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-white/5 bg-ink-950/90 backdrop-blur-md md:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 py-2.5 text-[10px] font-medium uppercase tracking-wider',
                isActive ? 'text-mog-300' : 'text-ink-400',
              )
            }
          >
            <Icon className="size-5" />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}

function SidebarProfile() {
  const { profile } = useAuth()
  if (!profile) return null
  const { current } = rankFromMogX(profile.mogx)
  return (
    <NavLink
      to={`/app/profile/${profile.handle}`}
      className="glass block rounded-xl p-3 transition-colors hover:bg-white/[0.06]"
    >
      <div className="flex items-center gap-3">
        <div
          className="grid size-10 shrink-0 place-items-center rounded-full font-display text-base font-semibold text-ink-950"
          style={{
            background: `linear-gradient(135deg, ${current.gradient[0]}, ${current.gradient[2]})`,
            boxShadow: `0 0 14px -4px ${current.glow}`,
          }}
        >
          {profile.display_name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-medium text-white">{profile.display_name}</div>
          <div className="truncate text-[11px] text-ink-400">@{profile.handle}</div>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[11px]">
        <span className="inline-flex items-center gap-1 text-ink-300">
          <Sparkles className="size-3" />
          <span className="font-mono tabular-nums">{profile.mogx.toLocaleString()}</span>
        </span>
        <span className="text-ink-400">MogX</span>
      </div>
    </NavLink>
  )
}

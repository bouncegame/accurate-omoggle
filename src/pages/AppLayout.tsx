import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Crosshair, Gauge, LayoutDashboard, LogOut, Trophy } from 'lucide-react'
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
  { to: '/app', label: 'dashboard', icon: LayoutDashboard, end: true },
  { to: '/app/play', label: 'play', icon: Crosshair },
  { to: '/app/calibrate', label: 'calibrate', icon: Gauge },
  { to: '/app/leaderboard', label: 'leaderboard', icon: Trophy },
]

export function AppLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  return (
    <div className="relative mx-auto flex min-h-dvh w-full max-w-7xl">
      <aside className="sticky top-0 hidden h-dvh w-[244px] shrink-0 flex-col border-r border-ink-500 px-4 py-5 md:flex">
        <Logo size="md" />

        <nav className="mt-10 flex flex-col gap-0 border border-ink-500 divide-y divide-ink-500">
          {NAV.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'group relative inline-flex items-center gap-3 px-3 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.12em] transition-colors',
                  isActive
                    ? 'bg-mog-500 text-black'
                    : 'text-ink-300 hover:bg-ink-800 hover:text-white',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={cn('size-3.5', isActive ? 'text-black' : 'text-ink-400 group-hover:text-mog-500')} />
                  {label}
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
            className="mt-3 inline-flex w-full items-center gap-2 border border-ink-500 px-3 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] text-ink-300 transition-colors hover:bg-blood-500 hover:text-white hover:border-blood-500"
          >
            <LogOut className="size-3.5" /> sign out
          </button>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="absolute inset-x-0 top-0 z-20 flex items-center justify-between border-b border-ink-500 bg-ink-950 px-4 py-3 md:hidden">
        <Logo size="sm" />
        {profile && (
          <RankBadge rank={rankFromMogX(profile.mogx).current} size="sm" />
        )}
      </div>

      <main className="min-h-dvh flex-1 px-4 pb-24 pt-16 md:px-8 md:pt-8">
        <Outlet />
      </main>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-cols-4 border-t border-ink-500 bg-ink-950 md:hidden">
        {NAV.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 py-2.5 font-mono text-[10px] font-bold uppercase tracking-[0.14em] transition-colors',
                isActive ? 'text-mog-500' : 'text-ink-400 hover:text-white',
              )
            }
          >
            <Icon className="size-4" />
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
  return (
    <NavLink
      to={`/app/profile/${profile.handle}`}
      className="block border border-ink-500 bg-ink-900 p-3 transition-colors hover:border-mog-500"
    >
      <div className="flex items-center gap-3">
        <div className="grid size-9 shrink-0 place-items-center bg-mog-500 font-mono text-base font-extrabold text-black">
          {profile.display_name.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <div className="truncate font-mono text-xs font-bold uppercase tracking-tight text-white">
            {profile.display_name}
          </div>
          <div className="truncate font-mono text-[10px] text-ink-400">@{profile.handle}</div>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-ink-500 pt-2 font-mono text-[10px] uppercase tracking-[0.14em]">
        <span className="tabular-nums text-mog-500">{profile.mogx.toLocaleString()}</span>
        <span className="text-ink-400">mogx</span>
      </div>
    </NavLink>
  )
}

import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Loader2, Lock, Mail, ScanFace, UserCircle2 } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/store/auth'
import { toast } from '@/components/ui/Toast'

type Mode = 'signin' | 'signup'

export function Auth() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation() as { state?: { from?: string } }
  const { user, initialized } = useAuth()
  const initialMode = (params.get('mode') === 'signup' ? 'signup' : 'signin') as Mode
  const [mode, setMode] = useState<Mode>(initialMode)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [handle, setHandle] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const next = mode === 'signup' ? 'signup' : 'signin'
    if (params.get('mode') !== next) {
      setParams({ mode: next }, { replace: true })
    }
  }, [mode, params, setParams])

  if (initialized && user) {
    return <Navigate to={location.state?.from ?? '/app'} replace />
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    if (!supabaseConfigured) {
      toast({
        kind: 'error',
        title: 'Supabase not configured',
        description:
          'Copy .env.example to .env.local and set real VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY values, then restart the dev server.',
      })
      return
    }
    setBusy(true)
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        toast({ kind: 'success', title: 'Welcome back' })
        navigate(location.state?.from ?? '/app', { replace: true })
      } else {
        const cleanedHandle = handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, '')
        if (cleanedHandle.length < 3) {
          toast({ kind: 'error', title: 'Handle too short', description: 'At least 3 lowercase letters / digits / underscore.' })
          return
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { handle: cleanedHandle, display_name: cleanedHandle },
          },
        })
        if (error) throw error
        if (!data.session) {
          toast({
            kind: 'info',
            title: 'Confirm your email',
            description: 'We sent you a confirmation link.',
            duration: 6000,
          })
          setMode('signin')
        } else {
          toast({ kind: 'success', title: 'Welcome to the mog' })
          navigate('/app', { replace: true })
        }
      }
    } catch (err) {
      const e = err as Error
      toast({ kind: 'error', title: 'Auth failed', description: e.message })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="relative flex min-h-dvh items-center justify-center px-4 py-10">
      <Link
        to="/"
        className="absolute left-5 top-5 inline-flex items-center gap-1.5 text-sm text-ink-300 transition-colors hover:text-white"
      >
        <ArrowLeft className="size-4" /> Back
      </Link>

      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo size="md" />
          <h1 className="mt-6 font-display text-3xl font-bold tracking-tight md:text-4xl">
            {mode === 'signin' ? 'Welcome back, mogger.' : 'Step into the lobby.'}
          </h1>
          <p className="mt-2 text-sm text-ink-300">
            {mode === 'signin'
              ? 'Pick up where you left off and queue your next match.'
              : 'Create an account to start scanning and stacking MogX.'}
          </p>
        </div>

        <div className="glass-strong relative overflow-hidden rounded-2xl p-6">
          <ModeSwitcher mode={mode} setMode={setMode} />

          <form onSubmit={submit} className="mt-6 space-y-4">
            <AnimatePresence mode="wait" initial={false}>
              {mode === 'signup' && (
                <motion.div
                  key="handle"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <Field
                    icon={UserCircle2}
                    label="Handle"
                    type="text"
                    value={handle}
                    onChange={setHandle}
                    placeholder="e.g. jawmaxxer"
                    autoComplete="username"
                    maxLength={20}
                  />
                </motion.div>
              )}
            </AnimatePresence>
            <Field
              icon={Mail}
              label="Email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@domain.com"
              autoComplete="email"
              required
            />
            <Field
              icon={Lock}
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              placeholder="••••••••"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              required
              minLength={6}
            />

            <button type="submit" disabled={busy} className="btn-primary w-full">
              {busy ? (
                <Loader2 className="size-4 animate-spin" />
              ) : mode === 'signin' ? (
                <>
                  Enter the lobby <ArrowRight className="size-4" />
                </>
              ) : (
                <>
                  Create my profile <ScanFace className="size-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-ink-400">
            By continuing you agree the score is a geometric game, not a verdict on your worth.
          </div>
        </div>
      </div>
    </div>
  )
}

function ModeSwitcher({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div className="relative inline-flex w-full rounded-xl bg-ink-900 p-1 ring-1 ring-white/5">
      {(['signin', 'signup'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className="relative z-10 flex-1 rounded-lg px-3 py-2 text-sm font-medium text-ink-200 transition-colors data-[active=true]:text-white"
          data-active={mode === m}
        >
          {mode === m && (
            <motion.span
              layoutId="mode-pill"
              className="absolute inset-0 -z-10 rounded-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(16,185,129,0.25), rgba(168,85,247,0.25))',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            />
          )}
          {m === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      ))}
    </div>
  )
}

function Field({
  icon: Icon,
  label,
  type,
  value,
  onChange,
  placeholder,
  autoComplete,
  required,
  minLength,
  maxLength,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  autoComplete?: string
  required?: boolean
  minLength?: number
  maxLength?: number
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-ink-300">
        {label}
      </span>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-400" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          className="input-field pl-10"
        />
      </div>
    </label>
  )
}

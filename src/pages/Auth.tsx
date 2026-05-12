import { useEffect, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Loader2, ScanFace } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { supabase, supabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/store/auth'
import { toast } from '@/components/ui/Toast'
import { cn } from '@/lib/cn'

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
        className="absolute left-5 top-5 inline-flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-[0.16em] text-ink-300 transition-colors hover:text-mog-500"
      >
        <ArrowLeft className="size-3.5" /> back
      </Link>

      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-start">
          <Logo size="md" />
          <h1 className="mt-8 font-mono text-3xl font-extrabold uppercase leading-tight tracking-tight md:text-4xl">
            {mode === 'signin' ? <>welcome back,<br />mogger.</> : <>step into<br />the lobby.</>}
          </h1>
          <p className="mt-3 font-mono text-xs text-ink-300">
            {mode === 'signin'
              ? 'pick up where you left off and queue your next match.'
              : 'create an account to start scanning and stacking mogx.'}
          </p>
        </div>

        <div className="border border-ink-400 bg-ink-900 p-6">
          <ModeSwitcher mode={mode} setMode={setMode} />

          <form onSubmit={submit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <Field
                label="handle"
                type="text"
                value={handle}
                onChange={setHandle}
                placeholder="e.g. jawmaxxer"
                autoComplete="username"
                maxLength={20}
              />
            )}
            <Field
              label="email"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="you@domain.com"
              autoComplete="email"
              required
            />
            <Field
              label="password"
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
                  enter the lobby <ArrowRight className="size-4" />
                </>
              ) : (
                <>
                  create my profile <ScanFace className="size-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-6 border-t border-ink-500 pt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-400">
            by continuing you agree the score is a geometric game, not a verdict on your worth.
          </div>
        </div>
      </div>
    </div>
  )
}

function ModeSwitcher({ mode, setMode }: { mode: Mode; setMode: (m: Mode) => void }) {
  return (
    <div className="grid grid-cols-2 border border-ink-500">
      {(['signin', 'signup'] as const).map((m) => (
        <button
          key={m}
          type="button"
          onClick={() => setMode(m)}
          className={cn(
            'px-3 py-2.5 font-mono text-xs font-bold uppercase tracking-[0.14em] transition-colors',
            mode === m
              ? 'bg-mog-500 text-black'
              : 'bg-transparent text-ink-300 hover:text-white',
          )}
        >
          {m === 'signin' ? 'sign in' : 'create account'}
        </button>
      ))}
    </div>
  )
}

function Field({
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
      <span className="label-caps mb-1.5 block">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        maxLength={maxLength}
        className="input-field"
      />
    </label>
  )
}

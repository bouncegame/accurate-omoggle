import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { create } from 'zustand'
import { useEffect } from 'react'
import { cn } from '@/lib/cn'

export type ToastKind = 'success' | 'error' | 'info'
export type Toast = { id: string; kind: ToastKind; title: string; description?: string; duration?: number }

type ToastStore = {
  toasts: Toast[]
  push: (t: Omit<Toast, 'id'> & { id?: string }) => string
  dismiss: (id: string) => void
}

export const useToasts = create<ToastStore>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = t.id ?? Math.random().toString(36).slice(2)
    const toast: Toast = { id, kind: t.kind, title: t.title, description: t.description, duration: t.duration ?? 4200 }
    set({ toasts: [...get().toasts, toast] })
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => get().dismiss(id), toast.duration)
    }
    return id
  },
  dismiss: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}))

export function toast(input: Omit<Toast, 'id'>) {
  return useToasts.getState().push(input)
}

export function ToastHost() {
  const toasts = useToasts((s) => s.toasts)
  const dismiss = useToasts((s) => s.dismiss)
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[60] flex w-full max-w-sm flex-col gap-2">
      <AnimatePresence initial={false}>
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </AnimatePresence>
    </div>
  )
}

function ToastCard({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  useEffect(() => {
    /* lifecycle handled by store */
  }, [])
  const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? TriangleAlert : Info
  const accent =
    toast.kind === 'success'
      ? 'text-mog-300'
      : toast.kind === 'error'
        ? 'text-blood-500'
        : 'text-chad-400'
  return (
    <motion.div
      layout
      initial={{ x: 40, opacity: 0, scale: 0.95 }}
      animate={{ x: 0, opacity: 1, scale: 1 }}
      exit={{ x: 40, opacity: 0, scale: 0.95 }}
      transition={{ type: 'spring', stiffness: 320, damping: 22 }}
      className="pointer-events-auto flex items-start gap-3 rounded-xl bg-ink-800/90 p-3 pr-2 shadow-2xl ring-1 ring-white/10 backdrop-blur-xl"
    >
      <Icon className={cn('mt-0.5 size-5 shrink-0', accent)} />
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium text-ink-100">{toast.title}</div>
        {toast.description && (
          <div className="mt-0.5 text-xs text-ink-300">{toast.description}</div>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="rounded p-1 text-ink-400 transition-colors hover:bg-white/5 hover:text-ink-100"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  )
}

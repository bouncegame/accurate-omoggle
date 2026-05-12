import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'
import { create } from 'zustand'
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
  const Icon = toast.kind === 'success' ? CheckCircle2 : toast.kind === 'error' ? TriangleAlert : Info
  const accent =
    toast.kind === 'success'
      ? 'text-mog-500'
      : toast.kind === 'error'
        ? 'text-blood-500'
        : 'text-white'
  const tag =
    toast.kind === 'success'
      ? 'OK'
      : toast.kind === 'error'
        ? 'ERR'
        : 'INFO'
  return (
    <motion.div
      layout
      initial={{ x: 16, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 16, opacity: 0 }}
      transition={{ duration: 0.12, ease: 'easeOut' }}
      className="pointer-events-auto flex items-start gap-3 border border-ink-400 bg-ink-900 p-3 pr-2"
    >
      <span className={cn('mt-0.5 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.16em]', accent)}>
        <Icon className="size-3.5" />
        {tag}
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-mono text-sm font-semibold text-white">{toast.title}</div>
        {toast.description && (
          <div className="mt-0.5 font-mono text-[11px] text-ink-300">{toast.description}</div>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        className="p-1 text-ink-300 transition-colors hover:bg-ink-100 hover:text-black"
        aria-label="Dismiss"
      >
        <X className="size-4" />
      </button>
    </motion.div>
  )
}

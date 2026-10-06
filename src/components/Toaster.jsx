import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { cx } from './ui'

const ToastContext = createContext(null)

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info }
const ICON_TONES = { success: 'text-ok', error: 'text-danger', info: 'text-brand' }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timers = useRef(new Map())

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
    clearTimeout(timers.current.get(id))
    timers.current.delete(id)
  }, [])

  const toast = useCallback(
    ({ title, description, tone = 'success', action, duration = 4000 }) => {
      const id = Math.random().toString(36).slice(2)
      setToasts((list) => [...list.slice(-3), { id, title, description, tone, action }])
      timers.current.set(id, setTimeout(() => dismiss(id), duration))
      return id
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss])

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end" aria-live="polite">
          {toasts.map((t) => {
            const Icon = ICONS[t.tone] || Info
            return (
              <div
                key={t.id}
                className="pointer-events-auto flex w-full max-w-sm animate-slide-up items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-xl shadow-slate-950/10"
              >
                <Icon className={cx('mt-0.5 size-4.5 shrink-0', ICON_TONES[t.tone])} aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-fg">{t.title}</p>
                  {t.description && <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{t.description}</p>}
                </div>
                {t.action && (
                  <button
                    type="button"
                    onClick={() => {
                      t.action.onClick()
                      dismiss(t.id)
                    }}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-brand transition hover:bg-brand-soft"
                  >
                    {t.action.label}
                  </button>
                )}
                <button type="button" onClick={() => dismiss(t.id)} className="rounded-md p-1 text-fg-subtle transition hover:bg-surface-2 hover:text-fg" aria-label="Dismiss">
                  <X className="size-3.5" aria-hidden />
                </button>
              </div>
            )
          })}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}

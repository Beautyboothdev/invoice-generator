import { useEffect, useId, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cx, IconButton } from './ui'

/**
 * Accessible modal shell: Escape closes, focus moves inside on open and is
 * restored on close, Tab is kept inside the dialog, page scroll is locked.
 */
export function Modal({ open, onClose, title, ariaLabel, description, children, footer, size = 'md', initialFocus }) {
  const panelRef = useRef(null)
  const titleId = useId()
  const descId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const previous = document.activeElement
    const panel = panelRef.current
    const target =
      (initialFocus && panel?.querySelector(initialFocus)) || panel?.querySelector('input, textarea') || panel?.querySelector('button')
    target?.focus()

    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCloseRef.current?.()
      }
      if (e.key === 'Tab' && panel) {
        const items = [...panel.querySelectorAll('button, input, textarea, select, a[href], [tabindex]:not([tabindex="-1"])')].filter(
          (el) => !el.disabled && el.offsetParent !== null,
        )
        if (!items.length) return
        const first = items[0]
        const last = items[items.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      previous?.focus?.()
    }
  }, [open, initialFocus])

  if (!open) return null

  const widths = { sm: 'max-w-md', md: 'max-w-2xl', xl: 'max-w-6xl' }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="presentation">
      <div className="absolute inset-0 animate-fade-in bg-slate-950/45 backdrop-blur-[3px]" onClick={onClose} aria-hidden />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : ariaLabel}
        aria-describedby={description ? descId : undefined}
        className={cx(
          'relative flex max-h-[92dvh] w-full animate-pop-in flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-2xl shadow-slate-950/20 sm:rounded-2xl',
          widths[size],
        )}
      >
        {title && (
          <div className="flex shrink-0 items-start justify-between gap-4 border-b border-line px-5 py-4 sm:px-6">
            <div className="min-w-0">
              <h2 id={titleId} className="text-base font-bold tracking-tight text-fg">
                {title}
              </h2>
              {description && (
                <p id={descId} className="mt-0.5 text-xs text-fg-muted">
                  {description}
                </p>
              )}
            </div>
            <IconButton icon={X} label="Close" onClick={onClose} className="-mt-1 -mr-2" />
          </div>
        )}
        <div className="scroll-area min-h-0 flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 border-t border-line bg-surface-2/60 px-5 py-3.5 sm:px-6">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

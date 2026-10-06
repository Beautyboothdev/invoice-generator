import { forwardRef } from 'react'
import { LoaderCircle } from 'lucide-react'

export const cx = (...parts) => parts.filter(Boolean).join(' ')

const VARIANTS = {
  primary: 'bg-brand text-brand-fg shadow-sm shadow-brand/20 hover:bg-brand-hover',
  secondary: 'border border-line bg-surface text-fg shadow-[0_1px_0_rgb(0_0_0/0.03)] hover:border-line-strong hover:bg-surface-2',
  ghost: 'text-fg-muted hover:bg-surface-2 hover:text-fg',
  danger: 'bg-danger text-white shadow-sm hover:bg-danger-hover',
  success: 'bg-ok text-white shadow-sm hover:bg-ok-hover',
}

const SIZES = {
  xs: 'h-7 gap-1 rounded-md px-2.5 text-xs',
  sm: 'h-8 gap-1.5 rounded-lg px-3 text-xs',
  md: 'h-9 gap-2 rounded-lg px-3.5 text-sm',
  lg: 'h-11 gap-2 rounded-xl px-5 text-sm',
}

export const Button = forwardRef(function Button(
  { variant = 'secondary', size = 'md', loading = false, icon: Icon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      disabled={disabled || loading}
      className={cx(
        'inline-flex shrink-0 items-center justify-center font-semibold whitespace-nowrap transition select-none disabled:pointer-events-none disabled:opacity-50',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...props}
    >
      {loading ? (
        <LoaderCircle className="size-4 animate-spin" aria-hidden />
      ) : (
        Icon && <Icon className={size === 'xs' ? 'size-3.5' : 'size-4'} aria-hidden />
      )}
      {children}
    </button>
  )
})

export function IconButton({ icon: Icon, label, className, size = 'md', tone = 'default', ...props }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-lg transition disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' ? 'size-7' : 'size-9',
        tone === 'danger'
          ? 'text-fg-subtle hover:bg-danger-soft hover:text-danger-fg'
          : 'text-fg-muted hover:bg-surface-2 hover:text-fg',
        className,
      )}
      {...props}
    >
      <Icon className={size === 'sm' ? 'size-3.5' : 'size-4'} aria-hidden />
    </button>
  )
}

export function Kbd({ children, className }) {
  return (
    <kbd
      className={cx(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-line bg-surface-2 px-1 font-mono text-[10px] font-medium text-fg-subtle',
        className,
      )}
    >
      {children}
    </kbd>
  )
}

export function Banner({ tone = 'info', icon: Icon, children, action }) {
  const tones = {
    info: 'border-brand/25 bg-brand-soft text-brand-soft-fg',
    warn: 'border-warn-line bg-warn-soft text-warn-fg',
    danger: 'border-danger-line bg-danger-soft text-danger-fg',
  }
  return (
    <div className={cx('flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border px-3.5 py-2.5 text-xs', tones[tone])} role="status">
      {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
      <div className="min-w-0 flex-1 leading-relaxed">{children}</div>
      {action && <div className="flex items-center gap-2">{action}</div>}
    </div>
  )
}

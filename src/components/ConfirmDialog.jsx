import { CircleAlert, TriangleAlert } from 'lucide-react'
import { Modal } from './Modal'
import { Button, cx } from './ui'

export function ConfirmDialog({ open, title = 'Confirm', message = 'Are you sure?', confirmText = 'Delete', cancelText = 'Cancel', danger = true, onConfirm, onClose }) {
  const Icon = danger ? TriangleAlert : CircleAlert
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      ariaLabel={title}
      initialFocus="[data-confirm]"
      footer={
        <>
          <Button onClick={onClose}>{cancelText}</Button>
          <Button
            data-confirm
            variant={danger ? 'danger' : 'primary'}
            onClick={() => {
              onConfirm?.()
              onClose?.()
            }}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex items-start gap-4 p-6">
        <div className={cx('flex size-10 shrink-0 items-center justify-center rounded-full', danger ? 'bg-danger-soft text-danger-fg' : 'bg-brand-soft text-brand-soft-fg')}>
          <Icon className="size-5" aria-hidden />
        </div>
        <div className="pt-0.5">
          <h2 className="text-base font-bold tracking-tight text-fg">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-fg-muted">{message}</p>
        </div>
      </div>
    </Modal>
  )
}

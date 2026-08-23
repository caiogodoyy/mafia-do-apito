'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'

type Props = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',
  pending = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    if (!open) return

    const handler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onCancel()
    }

    document.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onCancel])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 animate-fade-in sm:items-center">
      <button aria-label="Fechar" className="absolute inset-0 cursor-default" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        className="card relative w-full max-w-sm animate-pop-in bg-pitch-900 p-5 shadow-2xl"
      >
        <button
          onClick={onCancel}
          aria-label="Fechar"
          className="absolute right-4 top-4 text-slate-500 transition hover:text-slate-200"
        >
          <X size={18} />
        </button>

        <h2 className="pr-8 text-lg font-bold text-slate-50">{title}</h2>
        {description ? <p className="mt-2 text-sm text-slate-400">{description}</p> : null}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button className="btn-ghost" onClick={onCancel} disabled={pending}>
            {cancelLabel}
          </button>
          <button
            className={tone === 'danger' ? 'btn-danger' : 'btn-primary'}
            onClick={onConfirm}
            disabled={pending}
          >
            {pending ? 'Aguarde...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

'use client'

import { Minus, Plus } from 'lucide-react'

type Props = {
  label: string
  value: number
  disabled?: boolean
  onDecrease: () => void
  onIncrease: () => void
}

export default function StatStepper({ label, value, disabled, onDecrease, onIncrease }: Props) {
  return (
    <div className="flex flex-1 items-center justify-between gap-1 rounded-2xl border border-white/10 bg-black/25 px-1.5 py-1.5">
      <button
        type="button"
        className="stepper h-8 w-8"
        aria-label={`Diminuir ${label}`}
        onClick={onDecrease}
        disabled={disabled || value === 0}
      >
        <Minus size={14} strokeWidth={3} />
      </button>

      <span className="flex flex-col items-center leading-none">
        <span className="text-base font-black tabular-nums text-slate-50">{value}</span>
        <span className="mt-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
      </span>

      <button
        type="button"
        className="stepper h-8 w-8"
        aria-label={`Aumentar ${label}`}
        onClick={onIncrease}
        disabled={disabled}
      >
        <Plus size={14} strokeWidth={3} />
      </button>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Minus, Plus, X } from 'lucide-react'
import StarRating, {
  MAX_RATING,
  MIN_RATING,
  RATING_STEP,
  clampRating,
} from '@/components/StarRating'
import { formatRating } from '@/lib/format'
import type { PlayerRow } from '@/lib/types'

type Props = {
  player: PlayerRow | null
  pending: boolean
  error: string | null
  onSubmit: (values: { name: string; rating: number }) => void
  onClose: () => void
}

export default function PlayerFormSheet({ player, pending, error, onSubmit, onClose }: Props) {
  const [name, setName] = useState(player?.name ?? '')
  const [rating, setRating] = useState(player?.rating ?? 3)

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 animate-fade-in sm:items-center">
      <button aria-label="Fechar" className="absolute inset-0 cursor-default" onClick={onClose} />

      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit({ name, rating })
        }}
        className="card relative w-full max-w-sm animate-pop-in bg-pitch-900 p-5"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute right-4 top-4 text-slate-500 transition hover:text-slate-200"
        >
          <X size={18} />
        </button>

        <h2 className="pr-8 text-lg font-bold text-slate-50">
          {player ? 'Editar jogador' : 'Novo jogador'}
        </h2>

        <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-slate-500">
          Nome
        </label>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Nome do craque"
          className="field mt-2"
          maxLength={40}
          autoFocus
        />

        <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Estrelas (nível)
        </p>

        <div className="mt-2 flex items-center gap-2 rounded-2xl border border-white/10 bg-black/25 p-2">
          <button
            type="button"
            aria-label="Diminuir meia estrela"
            className="stepper"
            onClick={() => setRating(clampRating(rating - RATING_STEP))}
            disabled={rating <= MIN_RATING}
          >
            <Minus size={14} strokeWidth={3} />
          </button>

          <span className="flex flex-1 justify-center">
            <StarRating value={rating} onChange={(next) => setRating(clampRating(next))} size={28} />
          </span>

          <button
            type="button"
            aria-label="Aumentar meia estrela"
            className="stepper"
            onClick={() => setRating(clampRating(rating + RATING_STEP))}
            disabled={rating >= MAX_RATING}
          >
            <Plus size={14} strokeWidth={3} />
          </button>
        </div>

        <p className="mt-1.5 text-center text-xs font-bold text-amber-300">
          {formatRating(rating)} de {MAX_RATING} estrelas
        </p>

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid grid-cols-2 gap-3">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={pending}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={pending}>
            {pending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}

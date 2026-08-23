'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { formatRating } from '@/lib/format'

export const MIN_RATING = 0.5
export const MAX_RATING = 5
export const RATING_STEP = 0.5

const STARS = [1, 2, 3, 4, 5]

export function clampRating(value: number) {
  const rounded = Math.round(value * 2) / 2
  return Math.min(MAX_RATING, Math.max(MIN_RATING, rounded))
}

type Props = {
  value: number
  onChange?: (value: number) => void
  size?: number
}

export default function StarRating({ value, onChange, size = 20 }: Props) {
  const [preview, setPreview] = useState<number | null>(null)
  const shown = preview ?? value

  return (
    <span
      className="inline-flex items-center"
      onMouseLeave={onChange ? () => setPreview(null) : undefined}
    >
      {STARS.map((star) => {
        const fill = shown >= star ? 1 : shown >= star - 0.5 ? 0.5 : 0
        const half = star - 0.5

        return (
          <span key={star} className={`relative inline-block ${onChange ? 'px-1 py-1.5' : ''}`}>
            <span className="relative block leading-none">
              <Star size={size} className="block text-slate-700" />

              {fill > 0 ? (
                <span
                  className="pointer-events-none absolute left-0 top-0 overflow-hidden"
                  style={{ width: fill === 1 ? '100%' : '50%' }}
                >
                  <Star size={size} className="block fill-amber-400 text-amber-400" />
                </span>
              ) : null}
            </span>

            {onChange ? (
              <>
                <button
                  type="button"
                  aria-label={`${formatRating(half)} estrelas`}
                  onClick={() => onChange(half)}
                  onMouseEnter={() => setPreview(half)}
                  className="absolute left-0 top-0 h-full w-1/2"
                />
                <button
                  type="button"
                  aria-label={`${formatRating(star)} estrelas`}
                  onClick={() => onChange(star)}
                  onMouseEnter={() => setPreview(star)}
                  className="absolute right-0 top-0 h-full w-1/2"
                />
              </>
            ) : null}
          </span>
        )
      })}
    </span>
  )
}

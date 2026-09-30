'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, RotateCcw } from 'lucide-react'

const DURATION_MS = 8 * 60 * 1000

function format(ms: number) {
  const totalSeconds = Math.ceil(ms / 1000)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function MatchTimer() {
  const [remaining, setRemaining] = useState(DURATION_MS)
  const [running, setRunning] = useState(false)
  const endsAt = useRef(0)

  useEffect(() => {
    if (!running) return

    const id = setInterval(() => {
      const left = endsAt.current - Date.now()
      if (left <= 0) {
        setRemaining(0)
        setRunning(false)
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
          navigator.vibrate([300, 150, 300])
        }
        return
      }
      setRemaining(left)
    }, 250)

    return () => clearInterval(id)
  }, [running])

  function toggle() {
    if (running) {
      setRunning(false)
      return
    }
    const base = remaining <= 0 ? DURATION_MS : remaining
    endsAt.current = Date.now() + base
    setRemaining(base)
    setRunning(true)
  }

  function reset() {
    setRunning(false)
    setRemaining(DURATION_MS)
  }

  const finished = remaining <= 0
  const untouched = !running && remaining === DURATION_MS

  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/5 bg-white/[0.03] px-4 py-2.5">
      <span
        className={`text-2xl font-black tabular-nums tracking-tight ${
          finished ? 'text-red-400' : running ? 'text-brand-300' : 'text-slate-200'
        }`}
        aria-live="off"
      >
        {format(remaining)}
      </span>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="stepper"
          onClick={reset}
          disabled={untouched}
          aria-label="Zerar cronômetro"
        >
          <RotateCcw size={16} />
        </button>
        <button
          type="button"
          className="stepper"
          onClick={toggle}
          aria-label={running ? 'Pausar cronômetro' : 'Iniciar cronômetro'}
        >
          {running ? <Pause size={16} /> : <Play size={16} />}
        </button>
      </div>
    </div>
  )
}

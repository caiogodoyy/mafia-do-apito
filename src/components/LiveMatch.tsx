'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AlertCircle, ChevronLeft, Lock, LockOpen, Radio, X } from 'lucide-react'
import ChampionBox from '@/components/ChampionBox'
import ConfirmDialog from '@/components/ConfirmDialog'
import TeamCard from '@/components/TeamCard'
import { useLiveMatch } from '@/components/PusherProvider'
import { closeMatch, reopenMatch } from '@/actions/matches'
import { formatLongDate } from '@/lib/format'

export default function LiveMatch() {
  const { state, isAdmin, connected, busy, error, clearError, mutate } = useLiveMatch()
  const [confirming, setConfirming] = useState<'close' | 'reopen' | null>(null)
  const closed = state.status === 'CLOSED'

  function handleConfirm() {
    const target = confirming
    setConfirming(null)
    if (!target) return

    mutate({
      action: () => (target === 'close' ? closeMatch(state.id) : reopenMatch(state.id)),
    })
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pt-6">
      <header className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Link href="/" className="stepper mt-0.5" aria-label="Voltar">
            <ChevronLeft size={16} />
          </Link>
          <div>
            <h1 className="text-lg font-black leading-tight tracking-tight text-slate-50">Pelada</h1>
            <p className="text-xs text-slate-500">{formatLongDate(state.date)}</p>
          </div>
        </div>

        <span
          className={`badge ${
            closed ? 'bg-white/5 text-slate-400' : 'bg-lime-400/15 text-lime-300'
          }`}
        >
          {closed ? (
            <>
              <Lock size={11} />
              Encerrada
            </>
          ) : (
            <>
              <Radio size={11} className={connected ? 'animate-pulse-soft' : ''} />
              Ao vivo
            </>
          )}
        </span>
      </header>

      <div className="sticky top-0 z-30 -mx-4 mt-4 bg-pitch-950/80 px-4 py-3 backdrop-blur-md">
        <ChampionBox />
      </div>

      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <button onClick={clearError} aria-label="Fechar aviso">
            <X size={16} />
          </button>
        </div>
      ) : null}

      <main className="mt-3 grid gap-4">
        {state.teams.map((team, index) => (
          <TeamCard key={team.id} team={team} index={index} />
        ))}
      </main>

      {isAdmin ? (
        <div className="safe-bottom mt-6">
          <button
            className={closed ? 'btn-ghost w-full' : 'btn-danger w-full'}
            onClick={() => setConfirming(closed ? 'reopen' : 'close')}
            disabled={busy}
          >
            {closed ? <LockOpen size={16} /> : <Lock size={16} />}
            {closed ? 'Reabrir Pelada' : 'Encerrar Pelada'}
          </button>
        </div>
      ) : (
        <div className="safe-bottom mt-6 text-center text-[11px] text-slate-600">
          Todo mundo pode marcar gols e resultados. Só o admin encerra a pelada.
        </div>
      )}

      <ConfirmDialog
        open={confirming !== null}
        title={confirming === 'reopen' ? 'Reabrir a pelada?' : 'Encerrar a pelada?'}
        description={
          confirming === 'reopen'
            ? 'As estatísticas desta pelada serão removidas do histórico global até você encerrar de novo.'
            : 'Gols, assistências, artilheiro, garçom e o campeão do dia serão somados ao histórico global.'
        }
        confirmLabel={confirming === 'reopen' ? 'Reabrir' : 'Encerrar'}
        tone={confirming === 'reopen' ? 'primary' : 'danger'}
        pending={busy}
        onConfirm={handleConfirm}
        onCancel={() => setConfirming(null)}
      />
    </div>
  )
}

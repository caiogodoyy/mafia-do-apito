'use client'

import { useState } from 'react'
import { Hourglass } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import { useLiveMatch } from '@/components/PusherProvider'
import { setPenaltyWinner } from '@/actions/live'
import { resolveChampion, teamPoints } from '@/lib/champion'
import type { LiveTeam } from '@/lib/types'

const REASON_LABEL: Record<string, string> = {
  POINTS: 'Mais pontos na pelada',
  PENALTY: 'Decidido nos pênaltis',
  DEFINED: 'Pelada encerrada',
}

export default function ChampionBox() {
  const { state, busy, mutate } = useLiveMatch()
  const [candidate, setCandidate] = useState<LiveTeam | null>(null)
  const champion = resolveChampion(state)

  function confirmPenalty() {
    if (!candidate) return

    mutate({
      preview: (current) => ({ ...current, penaltyWinnerTeamId: candidate.id }),
      action: () => setPenaltyWinner(state.id, candidate.id),
    })

    setCandidate(null)
  }

  if (champion.kind === 'PENDING') {
    return (
      <div className="card flex items-center gap-3 px-4 py-4">
        <Hourglass size={20} className="text-slate-500" />
        <div>
          <p className="text-sm font-bold text-slate-200">Campeão do Dia indefinido</p>
          <p className="text-[11px] text-slate-500">
            Registre as vitórias e empates dos times. Vitória vale 3 pontos e empate 1.
          </p>
        </div>
      </div>
    )
  }

  if (champion.kind === 'CHAMPION') {
    return (
      <div className="rounded-3xl border border-amber-400/40 bg-gradient-to-br from-amber-400/20 to-amber-400/5 px-4 py-4">
        <p className="text-lg font-black leading-tight text-amber-200">
          🏆 {champion.team.name} é o Campeão!
        </p>
        <p className="mt-1 text-[11px] font-medium text-amber-200/60">
          {REASON_LABEL[champion.reason]}
          {champion.reason === 'POINTS' ? ` · ${teamPoints(champion.team)} pts` : ''}
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-3xl border border-orange-400/40 bg-gradient-to-br from-orange-400/20 to-orange-400/5 px-4 py-4">
        <p className="text-sm font-black text-orange-200">⚠️ Pênaltis</p>
        <p className="mt-1 text-[11px] font-medium text-orange-200/70">
          Empate em pontos. Toque no time que venceu a disputa.
        </p>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {champion.teams.map((team, index) => (
            <span key={team.id} className="flex items-center gap-2">
              {index > 0 ? <span className="text-xs font-bold text-orange-200/50">vs</span> : null}
              <button
                onClick={() => setCandidate(team)}
                disabled={state.status === 'CLOSED'}
                className="rounded-2xl border border-orange-300/40 bg-orange-400/15 px-4 py-2 text-sm font-bold text-orange-100 transition active:scale-95 disabled:opacity-50"
              >
                {team.name}
              </button>
            </span>
          ))}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(candidate)}
        title={`${candidate?.name ?? ''} venceu os pênaltis?`}
        description="O time será consagrado Campeão do Dia e receberá a vitória no histórico ao encerrar a pelada."
        confirmLabel="Consagrar campeão"
        pending={busy}
        onConfirm={confirmPenalty}
        onCancel={() => setCandidate(null)}
      />
    </>
  )
}

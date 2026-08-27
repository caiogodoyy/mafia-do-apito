'use client'

import { Trophy } from 'lucide-react'
import StatStepper from '@/components/StatStepper'
import { useLiveMatch } from '@/components/PusherProvider'
import type { PlayerStat, TeamStat } from '@/lib/optimistic'
import type { LiveTeam } from '@/lib/types'

const TEAM_TONES = [
  { bar: 'bg-brand-400', text: 'text-brand-300', ring: 'border-brand-400/30' },
  { bar: 'bg-sky-400', text: 'text-sky-300', ring: 'border-sky-400/30' },
  { bar: 'bg-fuchsia-400', text: 'text-fuchsia-300', ring: 'border-fuchsia-400/30' },
]

export default function TeamCard({ team, index }: { team: LiveTeam; index: number }) {
  const { state, adjust } = useLiveMatch()
  const tone = TEAM_TONES[index % TEAM_TONES.length]
  const locked = state.status === 'CLOSED'
  const isChampion = state.championTeamId === team.id

  function changeTeam(stat: TeamStat, delta: number) {
    adjust({ scope: 'team', id: team.id, stat, delta })
  }

  function changePlayer(matchPlayerId: string, stat: PlayerStat, delta: number) {
    adjust({ scope: 'player', id: matchPlayerId, stat, delta })
  }

  return (
    <section className={`card overflow-hidden ${isChampion ? 'border-amber-400/40' : ''}`}>
      <header className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
        <span className={`h-8 w-1.5 rounded-full ${tone.bar}`} />
        <div className="flex-1">
          <h2 className={`text-base font-black tracking-tight ${tone.text}`}>{team.name}</h2>
          <p className="text-[11px] text-slate-500">{team.players.length} jogadores</p>
        </div>
        {isChampion ? <Trophy size={18} className="text-amber-400" /> : null}
      </header>

      <div className="flex gap-2 border-b border-white/5 px-3 py-3">
        <StatStepper
          label="Vitórias"
          value={team.wins}
          disabled={locked}
          onDecrease={() => changeTeam('wins', -1)}
          onIncrease={() => changeTeam('wins', 1)}
        />
        <StatStepper
          label="Empates"
          value={team.draws}
          disabled={locked}
          onDecrease={() => changeTeam('draws', -1)}
          onIncrease={() => changeTeam('draws', 1)}
        />
      </div>

      <ul className="divide-y divide-white/5">
        {team.players.map((player) => (
          <li key={player.id} className="px-4 py-3">
            <div className="flex items-baseline justify-between gap-3">
              <p className="truncate text-sm font-semibold text-slate-100">{player.name}</p>
              <span className="shrink-0 text-[11px] font-medium text-slate-500">
                {player.goals + player.assists} part.
              </span>
            </div>

            <div className="mt-2 flex gap-2">
              <StatStepper
                label="Gols"
                value={player.goals}
                disabled={locked}
                onDecrease={() => changePlayer(player.id, 'goals', -1)}
                onIncrease={() => changePlayer(player.id, 'goals', 1)}
              />
              <StatStepper
                label="Assist."
                value={player.assists}
                disabled={locked}
                onDecrease={() => changePlayer(player.id, 'assists', -1)}
                onIncrease={() => changePlayer(player.id, 'assists', 1)}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

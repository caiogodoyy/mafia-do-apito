import { teamPoints } from '@/lib/champion'
import type { MatchState } from '@/lib/types'

export type SheetValue = string | number

export const MATCH_ID_COLUMN = 'B'

export const BACKUP_COLUMNS: SheetValue[] = [
  'Data',
  'Pelada',
  'Time',
  'Vitórias',
  'Empates',
  'Pontos',
  'Campeão',
  'Jogador',
  'Gols',
  'Assistências',
  'Artilheiro',
  'Garçom',
  'Registrado em',
]

function flag(value: boolean): SheetValue {
  return value ? 'Sim' : 'Não'
}

export function matchBackupRows(state: MatchState): SheetValue[][] {
  const participants = state.teams.flatMap((team) => team.players)
  const maxGoals = Math.max(0, ...participants.map((player) => player.goals))
  const maxAssists = Math.max(0, ...participants.map((player) => player.assists))
  const date = state.date.slice(0, 10)
  const registeredAt = new Date().toISOString()

  return state.teams.flatMap((team) =>
    team.players.map((player) => [
      date,
      state.id,
      team.name,
      team.wins,
      team.draws,
      teamPoints(team),
      flag(team.id === state.championTeamId),
      player.name,
      player.goals,
      player.assists,
      flag(maxGoals > 0 && player.goals === maxGoals),
      flag(maxAssists > 0 && player.assists === maxAssists),
      registeredAt,
    ]),
  )
}

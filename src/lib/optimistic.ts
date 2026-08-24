import type { MatchState } from '@/lib/types'

export const MAX_STAT_DELTA = 50

export type PlayerStat = 'goals' | 'assists'
export type TeamStat = 'wins' | 'draws'

export type Adjustment =
  | { scope: 'player'; id: string; stat: PlayerStat; delta: number }
  | { scope: 'team'; id: string; stat: TeamStat; delta: number }

export function adjustmentKey(adjustment: Adjustment) {
  return `${adjustment.scope}:${adjustment.id}:${adjustment.stat}`
}

export function isValidDelta(delta: number) {
  return Number.isInteger(delta) && delta !== 0 && Math.abs(delta) <= MAX_STAT_DELTA
}

export function applyAdjustments(state: MatchState, adjustments: Adjustment[]): MatchState {
  if (adjustments.length === 0) return state

  const deltas = new Map<string, number>()
  let touchedTeam = false

  for (const adjustment of adjustments) {
    const key = adjustmentKey(adjustment)
    deltas.set(key, (deltas.get(key) ?? 0) + adjustment.delta)
    if (adjustment.scope === 'team') touchedTeam = true
  }

  const shift = (scope: 'player' | 'team', id: string, stat: string, value: number) => {
    const delta = deltas.get(`${scope}:${id}:${stat}`)
    return delta === undefined ? value : Math.max(0, value + delta)
  }

  return {
    ...state,
    penaltyWinnerTeamId: touchedTeam ? null : state.penaltyWinnerTeamId,
    teams: state.teams.map((team) => ({
      ...team,
      wins: shift('team', team.id, 'wins', team.wins),
      draws: shift('team', team.id, 'draws', team.draws),
      players: team.players.map((player) => ({
        ...player,
        goals: shift('player', player.id, 'goals', player.goals),
        assists: shift('player', player.id, 'assists', player.assists),
      })),
    })),
  }
}

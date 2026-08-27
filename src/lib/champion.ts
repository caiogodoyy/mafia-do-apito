import type { LiveTeam, MatchState } from '@/lib/types'

export const WIN_POINTS = 3
export const DRAW_POINTS = 1

export type ChampionReason = 'POINTS' | 'PENALTY' | 'DEFINED'

export type ChampionState =
  | { kind: 'PENDING' }
  | { kind: 'CHAMPION'; team: LiveTeam; reason: ChampionReason }
  | { kind: 'PENALTY'; teams: LiveTeam[] }

export function teamPoints(team: Pick<LiveTeam, 'wins' | 'draws'>): number {
  return team.wins * WIN_POINTS + team.draws * DRAW_POINTS
}

export function resolveChampion(match: MatchState): ChampionState {
  const teams = match.teams

  if (teams.length === 0) return { kind: 'PENDING' }

  if (match.championTeamId) {
    const defined = teams.find((team) => team.id === match.championTeamId)
    if (defined) return { kind: 'CHAMPION', team: defined, reason: 'DEFINED' }
  }

  const hasResults = teams.some((team) => teamPoints(team) > 0)
  if (!hasResults) return { kind: 'PENDING' }

  const maxPoints = Math.max(...teams.map(teamPoints))
  const contenders = teams.filter((team) => teamPoints(team) === maxPoints)
  if (contenders.length === 1) {
    return { kind: 'CHAMPION', team: contenders[0], reason: 'POINTS' }
  }

  if (match.penaltyWinnerTeamId) {
    const byPenalty = contenders.find((team) => team.id === match.penaltyWinnerTeamId)
    if (byPenalty) return { kind: 'CHAMPION', team: byPenalty, reason: 'PENALTY' }
  }

  return { kind: 'PENALTY', teams: contenders }
}

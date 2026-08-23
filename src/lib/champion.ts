import type { LiveTeam, MatchState } from '@/lib/types'

export type ChampionReason = 'WINS' | 'DRAWS' | 'PENALTY' | 'DEFINED'

export type ChampionState =
  | { kind: 'PENDING' }
  | { kind: 'CHAMPION'; team: LiveTeam; reason: ChampionReason }
  | { kind: 'PENALTY'; teams: LiveTeam[] }

export function resolveChampion(match: MatchState): ChampionState {
  const teams = match.teams

  if (teams.length === 0) return { kind: 'PENDING' }

  if (match.championTeamId) {
    const defined = teams.find((team) => team.id === match.championTeamId)
    if (defined) return { kind: 'CHAMPION', team: defined, reason: 'DEFINED' }
  }

  const hasResults = teams.some((team) => team.wins > 0 || team.draws > 0)
  if (!hasResults) return { kind: 'PENDING' }

  const maxWins = Math.max(...teams.map((team) => team.wins))
  let contenders = teams.filter((team) => team.wins === maxWins)
  if (contenders.length === 1) {
    return { kind: 'CHAMPION', team: contenders[0], reason: 'WINS' }
  }

  const maxDraws = Math.max(...contenders.map((team) => team.draws))
  contenders = contenders.filter((team) => team.draws === maxDraws)
  if (contenders.length === 1) {
    return { kind: 'CHAMPION', team: contenders[0], reason: 'DRAWS' }
  }

  if (match.penaltyWinnerTeamId) {
    const byPenalty = contenders.find((team) => team.id === match.penaltyWinnerTeamId)
    if (byPenalty) return { kind: 'CHAMPION', team: byPenalty, reason: 'PENALTY' }
  }

  return { kind: 'PENALTY', teams: contenders }
}

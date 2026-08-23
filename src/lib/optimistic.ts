import type { MatchState } from '@/lib/types'

export function withPlayerStat(
  state: MatchState,
  matchPlayerId: string,
  stat: 'goals' | 'assists',
  delta: number,
): MatchState {
  return {
    ...state,
    teams: state.teams.map((team) => ({
      ...team,
      players: team.players.map((player) => {
        if (player.id !== matchPlayerId) return player

        return stat === 'goals'
          ? { ...player, goals: Math.max(0, player.goals + delta) }
          : { ...player, assists: Math.max(0, player.assists + delta) }
      }),
    })),
  }
}

export function withTeamStat(
  state: MatchState,
  matchTeamId: string,
  stat: 'wins' | 'draws',
  delta: number,
): MatchState {
  return {
    ...state,
    penaltyWinnerTeamId: null,
    teams: state.teams.map((team) => {
      if (team.id !== matchTeamId) return team

      return stat === 'wins'
        ? { ...team, wins: Math.max(0, team.wins + delta) }
        : { ...team, draws: Math.max(0, team.draws + delta) }
    }),
  }
}

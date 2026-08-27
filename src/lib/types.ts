export type MatchStatusValue = 'OPEN' | 'CLOSED'

export type LivePlayer = {
  id: string
  playerId: string
  name: string
  rating: number
  goals: number
  assists: number
  teamId: string
}

export type LiveTeam = {
  id: string
  name: string
  position: number
  wins: number
  draws: number
  players: LivePlayer[]
}

export type MatchState = {
  id: string
  date: string
  status: MatchStatusValue
  penaltyWinnerTeamId: string | null
  championTeamId: string | null
  version: number
  teams: LiveTeam[]
}

export type MatchSummary = {
  id: string
  date: string
  status: MatchStatusValue
  playerCount: number
  teamCount: number
  championName: string | null
}

export type PlayerRow = {
  id: string
  name: string
  rating: number
  totalWins: number
  totalGoals: number
  totalAssists: number
  topScorerCount: number
  topAssisterCount: number
  matchesPlayed: number
}

export type RatingImportSummary = {
  updated: number
  unchanged: number
  notFound: string[]
  invalid: string[]
}

export type PlayerStatRow = {
  id: string
  name: string
  matchesPlayed: number
  totalWins: number
  topScorerCount: number
  topAssisterCount: number
  totalGoals: number
  totalAssists: number
  average: number
}

export type ActionResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string }

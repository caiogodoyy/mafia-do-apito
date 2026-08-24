import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import type { MatchState } from '@/lib/types'

export const matchInclude = Prisma.validator<Prisma.MatchInclude>()({
  teams: {
    orderBy: { position: 'asc' },
    include: {
      players: {
        include: { player: true },
      },
    },
  },
})

export type MatchWithRelations = Prisma.MatchGetPayload<{ include: typeof matchInclude }>

export function serializeMatch(match: MatchWithRelations): MatchState {
  return {
    id: match.id,
    date: match.date.toISOString(),
    status: match.status,
    penaltyWinnerTeamId: match.penaltyWinnerTeamId,
    championTeamId: match.championTeamId,
    version: match.version,
    teams: match.teams.map((team) => ({
      id: team.id,
      name: team.name,
      position: team.position,
      wins: team.wins,
      draws: team.draws,
      players: [...team.players]
        .sort((a, b) => a.player.name.localeCompare(b.player.name, 'pt-BR'))
        .map((entry) => ({
          id: entry.id,
          playerId: entry.playerId,
          name: entry.player.name,
          rating: entry.player.rating,
          goals: entry.goals,
          assists: entry.assists,
          teamId: entry.matchTeamId,
        })),
    })),
  }
}

export async function loadMatchState(matchId: string): Promise<MatchState | null> {
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    include: matchInclude,
  })

  if (!match) return null

  return serializeMatch(match)
}

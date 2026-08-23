import { prisma } from '@/lib/prisma'
import type { RankingEntry } from '@/lib/types'

export type Rankings = {
  scorers: RankingEntry[]
  winners: RankingEntry[]
  assisters: RankingEntry[]
  participations: RankingEntry[]
  totalPlayers: number
}

function topFive<T extends { id: string; name: string }>(
  players: T[],
  value: (player: T) => number,
): RankingEntry[] {
  return players
    .map((player) => ({ id: player.id, name: player.name, value: value(player) }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'pt-BR'))
    .slice(0, 5)
}

export async function getRankings(): Promise<Rankings> {
  const players = await prisma.player.findMany({
    select: {
      id: true,
      name: true,
      totalWins: true,
      totalGoals: true,
      totalAssists: true,
      topScorerCount: true,
      topAssisterCount: true,
    },
  })

  return {
    scorers: topFive(players, (player) => player.topScorerCount),
    winners: topFive(players, (player) => player.totalWins),
    assisters: topFive(players, (player) => player.topAssisterCount),
    participations: topFive(players, (player) => player.totalGoals + player.totalAssists),
    totalPlayers: players.length,
  }
}

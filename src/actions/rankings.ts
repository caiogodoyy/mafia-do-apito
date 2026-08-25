import { prisma } from '@/lib/prisma'
import { periodRange, type PeriodKey, type PeriodRange } from '@/lib/period'
import type { RankingEntry } from '@/lib/types'

export type Rankings = {
  scorers: RankingEntry[]
  winners: RankingEntry[]
  assisters: RankingEntry[]
  participations: RankingEntry[]
  totalPlayers: number
}

type PlayerTotals = {
  id: string
  name: string
  totalWins: number
  totalGoals: number
  totalAssists: number
  topScorerCount: number
  topAssisterCount: number
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

function buildRankings(players: PlayerTotals[], totalPlayers: number): Rankings {
  return {
    scorers: topFive(players, (player) => player.topScorerCount),
    winners: topFive(players, (player) => player.totalWins),
    assisters: topFive(players, (player) => player.topAssisterCount),
    participations: topFive(players, (player) => player.totalGoals + player.totalAssists),
    totalPlayers,
  }
}

async function allTimeRankings(): Promise<Rankings> {
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

  return buildRankings(players, players.length)
}

async function rangeRankings({ start, end }: PeriodRange): Promise<Rankings> {
  const [totalPlayers, matches] = await Promise.all([
    prisma.player.count(),
    prisma.match.findMany({
      where: { status: 'CLOSED', date: { gte: start, lt: end } },
      select: {
        championTeamId: true,
        players: {
          select: {
            goals: true,
            assists: true,
            matchTeamId: true,
            player: { select: { id: true, name: true } },
          },
        },
      },
    }),
  ])

  const totals = new Map<string, PlayerTotals>()

  for (const match of matches) {
    const maxGoals = Math.max(0, ...match.players.map((entry) => entry.goals))
    const maxAssists = Math.max(0, ...match.players.map((entry) => entry.assists))

    for (const entry of match.players) {
      const current = totals.get(entry.player.id) ?? {
        id: entry.player.id,
        name: entry.player.name,
        totalWins: 0,
        totalGoals: 0,
        totalAssists: 0,
        topScorerCount: 0,
        topAssisterCount: 0,
      }

      current.totalGoals += entry.goals
      current.totalAssists += entry.assists
      if (maxGoals > 0 && entry.goals === maxGoals) current.topScorerCount += 1
      if (maxAssists > 0 && entry.assists === maxAssists) current.topAssisterCount += 1
      if (match.championTeamId && entry.matchTeamId === match.championTeamId) current.totalWins += 1

      totals.set(current.id, current)
    }
  }

  return buildRankings([...totals.values()], totalPlayers)
}

export async function getRankings(period: PeriodKey = 'tudo'): Promise<Rankings> {
  const range = periodRange(period)

  return range ? rangeRankings(range) : allTimeRankings()
}

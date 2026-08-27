import { prisma } from '@/lib/prisma'
import { periodRange, type PeriodKey, type PeriodRange } from '@/lib/period'
import type { PlayerStatRow } from '@/lib/types'

export type PlayerStats = {
  players: PlayerStatRow[]
  totalPlayers: number
}

type PlayerTotals = Omit<PlayerStatRow, 'average'>

function withAverage(totals: PlayerTotals[]): PlayerStatRow[] {
  return totals
    .filter((player) => player.matchesPlayed > 0)
    .map((player) => ({
      ...player,
      average:
        player.matchesPlayed > 0
          ? (player.totalGoals + player.totalAssists) / player.matchesPlayed
          : 0,
    }))
}

async function allTimeStats(): Promise<PlayerStats> {
  const players = await prisma.player.findMany({
    select: {
      id: true,
      name: true,
      matchesPlayed: true,
      topScorerCount: true,
      topAssisterCount: true,
      totalGoals: true,
      totalAssists: true,
    },
  })

  return { players: withAverage(players), totalPlayers: players.length }
}

async function rangeStats({ start, end }: PeriodRange): Promise<PlayerStats> {
  const [totalPlayers, matches] = await Promise.all([
    prisma.player.count(),
    prisma.match.findMany({
      where: { status: 'CLOSED', date: { gte: start, lt: end } },
      select: {
        players: {
          select: {
            goals: true,
            assists: true,
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
        matchesPlayed: 0,
        topScorerCount: 0,
        topAssisterCount: 0,
        totalGoals: 0,
        totalAssists: 0,
      }

      current.matchesPlayed += 1
      current.totalGoals += entry.goals
      current.totalAssists += entry.assists
      if (maxGoals > 0 && entry.goals === maxGoals) current.topScorerCount += 1
      if (maxAssists > 0 && entry.assists === maxAssists) current.topAssisterCount += 1

      totals.set(current.id, current)
    }
  }

  return { players: withAverage([...totals.values()]), totalPlayers }
}

export async function getPlayerStats(period: PeriodKey = 'tudo'): Promise<PlayerStats> {
  const range = periodRange(period)

  return range ? rangeStats(range) : allTimeStats()
}

import { formatDate, parseDateInput } from '@/lib/format'

export const TEAM_COUNT = 3

type LineupPlayer = { id: string; name: string }

export function sortByTeam<T extends LineupPlayer>(players: T[], assignment: Record<string, number>) {
  const rank = (player: T) => assignment[player.id] ?? Number.POSITIVE_INFINITY
  return [...players].sort((a, b) => rank(a) - rank(b))
}

export function formatTeamsExport<T extends LineupPlayer>(input: {
  date: string
  players: T[]
  assignment: Record<string, number>
  teamCount?: number
}) {
  const teamCount = input.teamCount ?? TEAM_COUNT
  const lines = [input.date ? `⚽ *Pelada ${formatDate(parseDateInput(input.date))}*` : '⚽ *Pelada*']

  for (let index = 0; index < teamCount; index += 1) {
    const team = input.players.filter((player) => input.assignment[player.id] === index)
    if (team.length === 0) continue

    lines.push('', `*Time ${index + 1}*`)
    team.forEach((player, position) => lines.push(`${position + 1}. ${player.name}`))
  }

  const unassigned = input.players.filter((player) => input.assignment[player.id] === undefined)
  if (unassigned.length > 0) {
    lines.push('', '*Sem time*')
    unassigned.forEach((player) => lines.push(`- ${player.name}`))
  }

  return lines.join('\n')
}

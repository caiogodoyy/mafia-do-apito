import { formatDate, formatRating, parseDateInput } from '@/lib/format'

export const TEAM_COUNT = 3

type LineupPlayer = { id: string; name: string }

type ExportPlayer = LineupPlayer & { rating: number }

export function sortByTeam<T extends LineupPlayer>(players: T[], assignment: Record<string, number>) {
  const rank = (player: T) => assignment[player.id] ?? Number.POSITIVE_INFINITY
  return [...players].sort((a, b) => rank(a) - rank(b))
}

export function formatTeamsExport<T extends ExportPlayer>(input: {
  date: string
  players: T[]
  assignment: Record<string, number>
  teamCount?: number
  withRatings?: boolean
}) {
  const teamCount = input.teamCount ?? TEAM_COUNT
  const label = (player: T) =>
    input.withRatings ? `${player.name} (⭐ ${formatRating(player.rating)})` : player.name
  const lines = [input.date ? `⚽ *Pelada ${formatDate(parseDateInput(input.date))}*` : '⚽ *Pelada*']

  for (let index = 0; index < teamCount; index += 1) {
    const team = input.players.filter((player) => input.assignment[player.id] === index)
    if (team.length === 0) continue

    const stars = team.reduce((total, player) => total + player.rating, 0)
    const header = input.withRatings
      ? `*Time ${index + 1}* (⭐ ${formatRating(stars)})`
      : `*Time ${index + 1}*`

    lines.push('', header)
    team.forEach((player, position) => lines.push(`${position + 1}. ${label(player)}`))
  }

  const unassigned = input.players.filter((player) => input.assignment[player.id] === undefined)
  if (unassigned.length > 0) {
    lines.push('', '*Sem time*')
    unassigned.forEach((player) => lines.push(`- ${label(player)}`))
  }

  return lines.join('\n')
}

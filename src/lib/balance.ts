export const MAX_PLAYERS_PER_TEAM = 6
export const MAX_PLAYERS_PER_MATCH = 18

type Balanceable = { id: string; rating: number }

function spread(totals: number[]) {
  return Math.max(...totals) - Math.min(...totals)
}

export function balanceTeams<T extends Balanceable>(players: T[], teamCount: number): string[][] {
  const teams: string[][] = Array.from({ length: teamCount }, () => [])
  if (players.length === 0) return teams

  const capacity = Math.ceil(players.length / teamCount)
  const ordered = [...players].sort((a, b) => b.rating - a.rating || a.id.localeCompare(b.id))
  const totals = new Array(teamCount).fill(0)
  const ratings = new Map(players.map((player) => [player.id, player.rating]))

  for (const player of ordered) {
    let target = -1
    for (let index = 0; index < teamCount; index += 1) {
      if (teams[index].length >= Math.min(capacity, MAX_PLAYERS_PER_TEAM)) continue
      if (target === -1 || totals[index] < totals[target]) target = index
    }
    if (target === -1) target = teams.findIndex((team) => team.length < MAX_PLAYERS_PER_TEAM)
    if (target === -1) break
    teams[target].push(player.id)
    totals[target] += player.rating
  }

  for (let round = 0; round < 200; round += 1) {
    let best: { a: number; b: number; indexA: number; indexB: number; totals: number[] } | null = null

    for (let a = 0; a < teamCount; a += 1) {
      for (let b = a + 1; b < teamCount; b += 1) {
        for (let indexA = 0; indexA < teams[a].length; indexA += 1) {
          for (let indexB = 0; indexB < teams[b].length; indexB += 1) {
            const ratingA = ratings.get(teams[a][indexA]) ?? 0
            const ratingB = ratings.get(teams[b][indexB]) ?? 0
            if (ratingA === ratingB) continue

            const candidate = [...totals]
            candidate[a] = candidate[a] - ratingA + ratingB
            candidate[b] = candidate[b] - ratingB + ratingA

            const reference = best ? best.totals : totals
            if (spread(candidate) < spread(reference)) {
              best = { a, b, indexA, indexB, totals: candidate }
            }
          }
        }
      }
    }

    if (!best) break

    const playerA = teams[best.a][best.indexA]
    teams[best.a][best.indexA] = teams[best.b][best.indexB]
    teams[best.b][best.indexB] = playerA
    totals[best.a] = best.totals[best.a]
    totals[best.b] = best.totals[best.b]
  }

  return teams
}

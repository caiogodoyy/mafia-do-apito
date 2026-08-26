export const MAX_PLAYERS_PER_TEAM = 6
export const MAX_PLAYERS_PER_MATCH = 18

const CANDIDATES = 24
const REPEAT_PENALTY = 0.5
const IMPROVE_ROUNDS = 200
const DIVERSIFY_ROUNDS = 60

type Balanceable = { id: string; rating: number }

type BalanceOptions = {
  seed?: number
  avoid?: string | null
}

function spread(totals: number[]) {
  return Math.max(...totals) - Math.min(...totals)
}

function createRandom(seed: number) {
  let state = seed >>> 0 || 0x9e3779b9

  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let value = state
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}

function shuffle<T>(items: T[], random: () => number) {
  const result = [...items]
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1))
    ;[result[index], result[swap]] = [result[swap], result[index]]
  }
  return result
}

export function teamsSignature(teams: string[][]) {
  return teams
    .map((team) => [...team].sort().join('-'))
    .sort()
    .join('|')
}

function buildTeams<T extends Balanceable>(
  players: T[],
  teamCount: number,
  random: () => number,
): string[][] {
  const teams: string[][] = Array.from({ length: teamCount }, () => [])
  const capacity = Math.min(Math.ceil(players.length / teamCount), MAX_PLAYERS_PER_TEAM)
  const ordered = shuffle(players, random).sort((a, b) => b.rating - a.rating)
  const totals = new Array(teamCount).fill(0)
  const ratings = new Map(players.map((player) => [player.id, player.rating]))

  const slots = Array.from({ length: teamCount }, (_, index) => index)

  for (const player of ordered) {
    const open = slots.filter((index) => teams[index].length < capacity)
    const fallback = slots.filter((index) => teams[index].length < MAX_PLAYERS_PER_TEAM)
    const pool = open.length > 0 ? open : fallback
    if (pool.length === 0) break

    const lowest = Math.min(...pool.map((index) => totals[index]))
    const tied = pool.filter((index) => totals[index] === lowest)
    const target = tied[Math.floor(random() * tied.length)]

    teams[target].push(player.id)
    totals[target] += player.rating
  }

  for (let round = 0; round < IMPROVE_ROUNDS; round += 1) {
    let bestSpread = spread(totals)
    let moves: { a: number; b: number; indexA: number; indexB: number; totals: number[] }[] = []

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
            const candidateSpread = spread(candidate)

            if (candidateSpread < bestSpread) {
              bestSpread = candidateSpread
              moves = [{ a, b, indexA, indexB, totals: candidate }]
            } else if (candidateSpread === bestSpread && moves.length > 0) {
              moves.push({ a, b, indexA, indexB, totals: candidate })
            }
          }
        }
      }
    }

    if (moves.length === 0) break

    const move = moves[Math.floor(random() * moves.length)]
    const playerA = teams[move.a][move.indexA]
    teams[move.a][move.indexA] = teams[move.b][move.indexB]
    teams[move.b][move.indexB] = playerA
    totals[move.a] = move.totals[move.a]
    totals[move.b] = move.totals[move.b]
  }

  for (let round = 0; round < DIVERSIFY_ROUNDS && teamCount > 1; round += 1) {
    const a = Math.floor(random() * teamCount)
    let b = Math.floor(random() * (teamCount - 1))
    if (b >= a) b += 1

    if (teams[a].length === 0 || teams[b].length === 0) continue

    const indexA = Math.floor(random() * teams[a].length)
    const indexB = Math.floor(random() * teams[b].length)
    const ratingA = ratings.get(teams[a][indexA]) ?? 0
    const ratingB = ratings.get(teams[b][indexB]) ?? 0

    const candidate = [...totals]
    candidate[a] = candidate[a] - ratingA + ratingB
    candidate[b] = candidate[b] - ratingB + ratingA
    if (spread(candidate) > spread(totals)) continue

    const playerA = teams[a][indexA]
    teams[a][indexA] = teams[b][indexB]
    teams[b][indexB] = playerA
    totals[a] = candidate[a]
    totals[b] = candidate[b]
  }

  return shuffle(teams, random)
    .sort((a, b) => b.length - a.length)
    .map((team) => shuffle(team, random))
}

export function balanceTeams<T extends Balanceable>(
  players: T[],
  teamCount: number,
  options: BalanceOptions = {},
): string[][] {
  const teams: string[][] = Array.from({ length: teamCount }, () => [])
  if (players.length === 0 || teamCount < 1) return teams

  const seed = options.seed ?? Math.floor(Math.random() * 0xffffffff)
  const random = createRandom(seed)
  const ratings = new Map(players.map((player) => [player.id, player.rating]))

  let best: { teams: string[][]; score: number } | null = null

  for (let attempt = 0; attempt < CANDIDATES; attempt += 1) {
    const candidate = buildTeams(players, teamCount, random)
    const totals = candidate.map((team) =>
      team.reduce((total, playerId) => total + (ratings.get(playerId) ?? 0), 0),
    )
    const repeated = teamsSignature(candidate) === options.avoid
    const score = spread(totals) + (repeated ? REPEAT_PENALTY : 0)

    if (!best || score < best.score) best = { teams: candidate, score }
    if (best.score === 0) break
  }

  return best ? best.teams : teams
}

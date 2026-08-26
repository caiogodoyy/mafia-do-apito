export const MAX_IMPORT_FILE_SIZE = 200 * 1024

export type RatingEntry = {
  name: string
  rating: number
}

export type RatingListResult = {
  entries: RatingEntry[]
  invalid: string[]
  duplicated: string[]
}

const INVISIBLE_CHARS = /[\u00ad\u200b-\u200f\u2028\u2029\u2060-\u2064\ufeff]/g
const EXOTIC_SPACES = /[\u00a0\u2007\u202f]/g

export function stripInvisible(value: string) {
  return value.replace(INVISIBLE_CHARS, '').replace(EXOTIC_SPACES, ' ')
}

export function normalizeName(value: string) {
  return stripInvisible(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
}

function cleanLine(line: string) {
  return stripInvisible(line)
    .replace(/^\s*\d+\s*[-.)\]]\s*/, '')
    .trim()
    .replace(/\s+/g, ' ')
}

function usableLines(content: string) {
  return content
    .split(/\r?\n/)
    .map(cleanLine)
    .filter((line) => line.length > 0 && !line.startsWith('#'))
}

function parseRating(value: string) {
  const rating = Number(value.replace(',', '.'))
  if (!Number.isFinite(rating)) return null

  const rounded = Math.round(rating * 2) / 2
  if (rounded !== rating || rounded < 0.5 || rounded > 5) return null

  return rounded
}

export function parseRatingList(content: string): RatingListResult {
  const entries: RatingEntry[] = []
  const invalid: string[] = []
  const duplicated: string[] = []
  const seen = new Set<string>()

  for (const line of usableLines(content)) {
    const match = line.match(/^(.+?)\s*[-;:|=]\s*([0-9]+(?:[.,][0-9]+)?)\s*(?:estrelas?)?$/i)

    if (!match) {
      invalid.push(line)
      continue
    }

    const name = match[1].trim().replace(/\s+/g, ' ')
    const rating = parseRating(match[2])
    const key = normalizeName(name)

    if (!key || rating === null) {
      invalid.push(line)
      continue
    }

    if (seen.has(key)) {
      duplicated.push(line)
      continue
    }

    seen.add(key)
    entries.push({ name, rating })
  }

  return { entries, invalid, duplicated }
}

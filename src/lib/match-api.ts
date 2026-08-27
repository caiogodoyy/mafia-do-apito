import type { ActionResult, MatchState } from '@/lib/types'

export function matchStatePath(matchId: string) {
  return `/api/pelada/${matchId}/state`
}

export async function fetchMatchState(matchId: string): Promise<ActionResult<MatchState>> {
  try {
    const response = await fetch(matchStatePath(matchId), { cache: 'no-store' })
    return (await response.json()) as ActionResult<MatchState>
  } catch {
    return { ok: false, error: 'Falha ao sincronizar a pelada.' }
  }
}

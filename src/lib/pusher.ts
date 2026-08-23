import Pusher from 'pusher'
import type { MatchState } from '@/lib/types'

export const MATCH_EVENT = 'match:update'

export function matchChannel(matchId: string) {
  return `pelada-${matchId}`
}

let instance: Pusher | null = null

function getPusherServer() {
  const appId = process.env.PUSHER_APP_ID
  const key = process.env.PUSHER_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.PUSHER_CLUSTER

  if (!appId || !key || !secret || !cluster) return null

  if (!instance) {
    instance = new Pusher({ appId, key, secret, cluster, useTLS: true })
  }

  return instance
}

export async function broadcastMatch(state: MatchState) {
  const pusher = getPusherServer()
  if (!pusher) return

  try {
    await pusher.trigger(matchChannel(state.id), MATCH_EVENT, state)
  } catch (error) {
    console.error('Falha ao emitir evento no Pusher', error)
  }
}

import PusherClient from 'pusher-js'

export const MATCH_EVENT = 'match:update'

export function matchChannel(matchId: string) {
  return `pelada-${matchId}`
}

let client: PusherClient | null = null

export function getPusherClient() {
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER

  if (!key || !cluster) return null

  if (!client) {
    client = new PusherClient(key, { cluster, forceTLS: true })
  }

  return client
}

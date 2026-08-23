'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getMatchState } from '@/actions/live'
import { MATCH_EVENT, getPusherClient, matchChannel } from '@/lib/pusher-client'
import type { ActionResult, MatchState } from '@/lib/types'

type Mutation = {
  optimistic?: (state: MatchState) => MatchState
  action: () => Promise<ActionResult<MatchState>>
}

type LiveMatchContextValue = {
  state: MatchState
  isAdmin: boolean
  connected: boolean
  busy: boolean
  error: string | null
  clearError: () => void
  mutate: (mutation: Mutation) => void
}

const LiveMatchContext = createContext<LiveMatchContextValue | null>(null)

export function useLiveMatch() {
  const context = useContext(LiveMatchContext)
  if (!context) throw new Error('useLiveMatch precisa estar dentro de PusherProvider.')
  return context
}

type Props = {
  initialState: MatchState
  isAdmin: boolean
  children: React.ReactNode
}

export default function PusherProvider({ initialState, isAdmin, children }: Props) {
  const [state, setLocalState] = useState(initialState)
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const stateRef = useRef(initialState)
  const inFlight = useRef(0)

  const setState = useCallback((next: MatchState) => {
    stateRef.current = next
    setLocalState(next)
  }, [])

  const applyRemote = useCallback(
    (incoming: MatchState) => {
      if (inFlight.current > 0) return
      setState(incoming)
    },
    [setState],
  )

  useEffect(() => {
    const client = getPusherClient()
    if (!client) return

    const channelName = matchChannel(initialState.id)
    const channel = client.subscribe(channelName)

    const onUpdate = (payload: MatchState) => applyRemote(payload)
    const onSubscribed = () => setConnected(true)
    const onError = () => setConnected(false)

    channel.bind(MATCH_EVENT, onUpdate)
    channel.bind('pusher:subscription_succeeded', onSubscribed)
    channel.bind('pusher:subscription_error', onError)

    return () => {
      channel.unbind(MATCH_EVENT, onUpdate)
      channel.unbind('pusher:subscription_succeeded', onSubscribed)
      channel.unbind('pusher:subscription_error', onError)
      client.unsubscribe(channelName)
      setConnected(false)
    }
  }, [initialState.id, applyRemote])

  useEffect(() => {
    const sync = async () => {
      if (document.visibilityState !== 'visible' || inFlight.current > 0) return
      const result = await getMatchState(initialState.id)
      if (result.ok && result.data) applyRemote(result.data)
    }

    document.addEventListener('visibilitychange', sync)
    window.addEventListener('focus', sync)

    return () => {
      document.removeEventListener('visibilitychange', sync)
      window.removeEventListener('focus', sync)
    }
  }, [initialState.id, applyRemote])

  const mutate = useCallback(
    ({ optimistic, action }: Mutation) => {
      setError(null)

      if (optimistic) setState(optimistic(stateRef.current))

      inFlight.current += 1
      setBusy(true)

      action()
        .then(async (result) => {
          if (result.ok) {
            if (result.data) setState(result.data)
            return
          }

          setError(result.error)

          const fresh = await getMatchState(initialState.id)
          if (fresh.ok && fresh.data) setState(fresh.data)
        })
        .catch(() => {
          setError('Falha de conexão. Tente novamente.')
        })
        .finally(() => {
          inFlight.current = Math.max(0, inFlight.current - 1)
          if (inFlight.current === 0) setBusy(false)
        })
    },
    [initialState.id, setState],
  )

  const clearError = useCallback(() => setError(null), [])

  return (
    <LiveMatchContext.Provider
      value={{ state, isAdmin, connected, busy, error, clearError, mutate }}
    >
      {children}
    </LiveMatchContext.Provider>
  )
}

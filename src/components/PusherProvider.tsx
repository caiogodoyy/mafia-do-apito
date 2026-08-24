'use client'

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { getMatchState, updatePlayerStat, updateTeamStat } from '@/actions/live'
import { MATCH_EVENT, getPusherClient, matchChannel } from '@/lib/pusher-client'
import { MAX_STAT_DELTA, adjustmentKey, applyAdjustments } from '@/lib/optimistic'
import type { Adjustment } from '@/lib/optimistic'
import type { ActionResult, MatchState } from '@/lib/types'

const FLUSH_DELAY = 350

type Mutation = {
  preview?: (state: MatchState) => MatchState
  action: () => Promise<ActionResult<MatchState>>
}

type LiveMatchContextValue = {
  state: MatchState
  isAdmin: boolean
  connected: boolean
  busy: boolean
  error: string | null
  clearError: () => void
  adjust: (adjustment: Adjustment) => void
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

function send(adjustment: Adjustment) {
  return adjustment.scope === 'player'
    ? updatePlayerStat(adjustment.id, adjustment.stat, adjustment.delta)
    : updateTeamStat(adjustment.id, adjustment.stat, adjustment.delta)
}

export default function PusherProvider({ initialState, isAdmin, children }: Props) {
  const [state, setLocalState] = useState(initialState)
  const [connected, setConnected] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const matchId = initialState.id
  const base = useRef(initialState)
  const queued = useRef(new Map<string, Adjustment>())
  const sent = useRef(new Map<number, Adjustment[]>())
  const previews = useRef(new Map<number, (state: MatchState) => MatchState>())
  const deferred = useRef<MatchState | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ticket = useRef(0)
  const inFlight = useRef(0)

  const render = useCallback(() => {
    const overlay: Adjustment[] = []
    for (const batch of sent.current.values()) overlay.push(...batch)
    overlay.push(...queued.current.values())

    let next = applyAdjustments(base.current, overlay)
    for (const preview of previews.current.values()) next = preview(next)

    setLocalState(next)
  }, [])

  const accept = useCallback((incoming: MatchState | null | undefined) => {
    if (!incoming) return
    if (incoming.version <= base.current.version) return
    base.current = incoming
  }, [])

  const applyRemote = useCallback(
    (incoming: MatchState) => {
      if (inFlight.current > 0) {
        if (!deferred.current || incoming.version > deferred.current.version) {
          deferred.current = incoming
        }
        return
      }

      accept(incoming)
      render()
    },
    [accept, render],
  )

  const settle = useCallback(() => {
    if (inFlight.current > 0) {
      render()
      return
    }

    const pending = deferred.current
    deferred.current = null
    accept(pending)

    setBusy(false)
    render()
  }, [accept, render])

  const reload = useCallback(async () => {
    const fresh = await getMatchState(matchId)
    if (fresh.ok) accept(fresh.data)
  }, [accept, matchId])

  const flush = useCallback((): Promise<void> => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }

    if (queued.current.size === 0) return Promise.resolve()

    const batch = [...queued.current.values()]
    queued.current.clear()

    const id = ticket.current
    ticket.current += 1
    sent.current.set(id, batch)
    inFlight.current += 1
    setBusy(true)

    return Promise.all(batch.map(send))
      .then(async (results) => {
        for (const result of results) {
          if (result.ok) accept(result.data)
        }

        const failed = results.find((result) => !result.ok)
        if (failed && !failed.ok) {
          setError(failed.error)
          await reload()
        }
      })
      .catch(async () => {
        setError('Falha de conexão. Tente novamente.')
        await reload()
      })
      .finally(() => {
        sent.current.delete(id)
        inFlight.current -= 1
        settle()
      })
  }, [accept, reload, settle])

  const adjust = useCallback(
    (adjustment: Adjustment) => {
      setError(null)

      const key = adjustmentKey(adjustment)
      const current = queued.current.get(key)
      const delta = (current?.delta ?? 0) + adjustment.delta

      if (delta === 0) queued.current.delete(key)
      else queued.current.set(key, { ...adjustment, delta } as Adjustment)

      render()

      if (timer.current) clearTimeout(timer.current)

      if (Math.abs(delta) >= MAX_STAT_DELTA) {
        void flush()
        return
      }

      timer.current = setTimeout(() => void flush(), FLUSH_DELAY)
    },
    [flush, render],
  )

  const mutate = useCallback(
    ({ preview, action }: Mutation) => {
      setError(null)

      const id = ticket.current
      ticket.current += 1
      if (preview) previews.current.set(id, preview)

      inFlight.current += 1
      setBusy(true)
      render()

      flush()
        .then(action)
        .then(async (result) => {
          if (result.ok) {
            accept(result.data)
            return
          }

          setError(result.error)
          await reload()
        })
        .catch(async () => {
          setError('Falha de conexão. Tente novamente.')
          await reload()
        })
        .finally(() => {
          previews.current.delete(id)
          inFlight.current -= 1
          settle()
        })
    },
    [accept, flush, reload, render, settle],
  )

  useEffect(() => {
    const client = getPusherClient()
    if (!client) return

    const channelName = matchChannel(matchId)
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
  }, [matchId, applyRemote])

  useEffect(() => {
    const sync = async () => {
      if (inFlight.current > 0 || queued.current.size > 0) return
      const result = await getMatchState(matchId)
      if (result.ok && result.data) applyRemote(result.data)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') void flush()
      else void sync()
    }

    const onHide = () => void flush()

    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('pagehide', onHide)
    window.addEventListener('focus', sync)

    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pagehide', onHide)
      window.removeEventListener('focus', sync)
    }
  }, [matchId, applyRemote, flush])

  useEffect(() => {
    return () => {
      void flush()
    }
  }, [flush])

  const clearError = useCallback(() => setError(null), [])

  return (
    <LiveMatchContext.Provider
      value={{ state, isAdmin, connected, busy, error, clearError, adjust, mutate }}
    >
      {children}
    </LiveMatchContext.Provider>
  )
}

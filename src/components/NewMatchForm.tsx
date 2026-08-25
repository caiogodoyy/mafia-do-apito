'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Search, Shuffle, Sparkles, Star, Users } from 'lucide-react'
import { createMatch } from '@/actions/matches'
import { MAX_PLAYERS_PER_MATCH, MAX_PLAYERS_PER_TEAM, balanceTeams } from '@/lib/balance'
import { formatRating } from '@/lib/format'
import type { PlayerRow } from '@/lib/types'

const TEAM_COLORS = [
  'border-lime-400/40 bg-lime-400/10 text-lime-300',
  'border-sky-400/40 bg-sky-400/10 text-sky-300',
  'border-fuchsia-400/40 bg-fuchsia-400/10 text-fuchsia-300',
]

const TEAM_ACTIVE = [
  'bg-lime-400 text-pitch-950',
  'bg-sky-400 text-pitch-950',
  'bg-fuchsia-400 text-pitch-950',
]

type Props = {
  players: PlayerRow[]
  defaultDate: string
}

export default function NewMatchForm({ players, defaultDate }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [date, setDate] = useState(defaultDate)
  const [teamCount, setTeamCount] = useState(3)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [query, setQuery] = useState('')
  const [assignment, setAssignment] = useState<Record<string, number>>({})
  const [error, setError] = useState<string | null>(null)

  const maxSelectable = Math.min(MAX_PLAYERS_PER_MATCH, teamCount * MAX_PLAYERS_PER_TEAM)

  const selectedPlayers = useMemo(
    () => players.filter((player) => selectedIds.includes(player.id)),
    [players, selectedIds],
  )

  const filteredPlayers = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return players
    return players.filter((player) => player.name.toLowerCase().includes(term))
  }, [players, query])

  const teams = useMemo(() => {
    return Array.from({ length: teamCount }, (_, index) =>
      selectedPlayers.filter((player) => assignment[player.id] === index),
    )
  }, [teamCount, selectedPlayers, assignment])

  const unassigned = selectedPlayers.filter((player) => assignment[player.id] === undefined)

  function toggleSelection(player: PlayerRow) {
    setError(null)

    if (selectedIds.includes(player.id)) {
      setSelectedIds(selectedIds.filter((id) => id !== player.id))
      const next = { ...assignment }
      delete next[player.id]
      setAssignment(next)
      return
    }

    if (selectedIds.length >= maxSelectable) {
      setError(`Limite de ${maxSelectable} jogadores para ${teamCount} times.`)
      return
    }

    setSelectedIds([...selectedIds, player.id])
  }

  function changeTeamCount(count: number) {
    const limit = Math.min(MAX_PLAYERS_PER_MATCH, count * MAX_PLAYERS_PER_TEAM)

    setError(
      selectedIds.length > limit
        ? `Com ${count} times o limite é ${limit} jogadores. Tire ${selectedIds.length - limit} da convocação.`
        : null,
    )
    setTeamCount(count)

    const next: Record<string, number> = {}
    for (const [playerId, team] of Object.entries(assignment)) {
      if (team < count) next[playerId] = team
    }
    setAssignment(next)
  }

  function assign(playerId: string, teamIndex: number) {
    setError(null)

    if (assignment[playerId] === teamIndex) {
      const next = { ...assignment }
      delete next[playerId]
      setAssignment(next)
      return
    }

    const size = selectedPlayers.filter(
      (player) => player.id !== playerId && assignment[player.id] === teamIndex,
    ).length

    if (size >= MAX_PLAYERS_PER_TEAM) {
      setError(`Time ${teamIndex + 1} já tem ${MAX_PLAYERS_PER_TEAM} jogadores.`)
      return
    }

    setAssignment({ ...assignment, [playerId]: teamIndex })
  }

  function generateTeams() {
    setError(null)

    if (selectedPlayers.length < 2) {
      setError('Selecione os jogadores antes de gerar os times.')
      return
    }

    const distribution = balanceTeams(selectedPlayers, teamCount)
    const next: Record<string, number> = {}

    distribution.forEach((teamPlayers, index) => {
      teamPlayers.forEach((playerId) => {
        next[playerId] = index
      })
    })

    setAssignment(next)
  }

  function submit() {
    setError(null)

    if (!date) {
      setError('Escolha a data da pelada.')
      return
    }

    if (unassigned.length > 0) {
      setError(`${unassigned.length} jogador(es) ainda sem time.`)
      return
    }

    const filled = teams.filter((team) => team.length > 0)
    if (filled.length < 2) {
      setError('Monte pelo menos 2 times com jogadores.')
      return
    }

    const payload = teams
      .map((team, index) => ({
        name: `Time ${index + 1}`,
        playerIds: team.map((player) => player.id),
      }))
      .filter((team) => team.playerIds.length > 0)

    startTransition(async () => {
      const result = await createMatch({ date, teams: payload })

      if (!result.ok) {
        setError(result.error)
        return
      }

      router.push(`/pelada/${result.data?.id}`)
    })
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-black tracking-tight text-slate-50">Nova Pelada</h1>
        <p className="text-xs text-slate-500">Convoque a galera e monte os times</p>
      </div>

      <section className="card p-4">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Data</label>
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="field mt-2"
        />

        <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Quantidade de times
        </p>
        <div className="mt-2 flex gap-2">
          {[2, 3].map((count) => (
            <button
              key={count}
              onClick={() => changeTeamCount(count)}
              className={`flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition ${
                teamCount === count
                  ? 'border-lime-400 bg-lime-400/15 text-lime-300'
                  : 'border-white/10 bg-white/5 text-slate-400'
              }`}
            >
              {count} times
            </button>
          ))}
        </div>
      </section>

      <section className="card overflow-hidden">
        <header className="flex items-center justify-between border-b border-white/5 px-4 py-3">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-100">Convocados</h2>
          </div>
          <span className="text-xs font-bold tabular-nums text-slate-400">
            {selectedIds.length}/{maxSelectable}
          </span>
        </header>

        {players.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-500">
            Cadastre jogadores antes de criar uma pelada.
          </p>
        ) : (
          <>
            <div className="relative border-b border-white/5 px-4 py-3">
              <Search
                size={16}
                className="absolute left-8 top-1/2 -translate-y-1/2 text-slate-500"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Buscar jogador"
                className="field pl-11"
              />
            </div>

            {filteredPlayers.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">
                Nenhum jogador encontrado.
              </p>
            ) : (
              <ul className="max-h-80 divide-y divide-white/5 overflow-y-auto">
                {filteredPlayers.map((player) => {
                  const checked = selectedIds.includes(player.id)

                  return (
                    <li key={player.id}>
                      <button
                        onClick={() => toggleSelection(player)}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition active:bg-white/5"
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border transition ${
                            checked
                              ? 'border-lime-400 bg-lime-400 text-pitch-950'
                              : 'border-white/15 bg-black/30'
                          }`}
                        >
                          {checked ? <Check size={14} strokeWidth={3} /> : null}
                        </span>

                        <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">
                          {player.name}
                        </span>

                        <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-300">
                          <Star size={12} className="fill-amber-400 text-amber-400" />
                          {formatRating(player.rating)}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}
      </section>

      {selectedPlayers.length > 0 ? (
        <section className="card p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-slate-100">Times</h2>
            <button className="btn-ghost px-3 py-2" onClick={generateTeams}>
              <Shuffle size={14} />
              Gerar Times
            </button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {teams.map((team, index) => {
              const stars = team.reduce((total, player) => total + player.rating, 0)

              return (
                <div key={index} className={`rounded-2xl border px-3 py-2 ${TEAM_COLORS[index]}`}>
                  <p className="text-xs font-bold">Time {index + 1}</p>
                  <p className="mt-0.5 text-[11px] opacity-80">
                    {team.length}/{MAX_PLAYERS_PER_TEAM} · {formatRating(stars)} ⭐
                  </p>
                </div>
              )
            })}
          </div>

          <ul className="mt-4 space-y-2">
            {selectedPlayers.map((player) => (
              <li key={player.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm text-slate-200">{player.name}</span>

                <span className="flex gap-1">
                  {Array.from({ length: teamCount }, (_, index) => {
                    const active = assignment[player.id] === index

                    return (
                      <button
                        key={index}
                        onClick={() => assign(player.id, index)}
                        aria-label={`${player.name} no time ${index + 1}`}
                        className={`h-8 w-8 rounded-xl border text-xs font-bold transition active:scale-90 ${
                          active
                            ? `border-transparent ${TEAM_ACTIVE[index]}`
                            : 'border-white/10 bg-white/5 text-slate-500'
                        }`}
                      >
                        {index + 1}
                      </button>
                    )
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {error ? (
        <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <button className="btn-primary w-full" onClick={submit} disabled={pending}>
        <Sparkles size={16} />
        {pending ? 'Criando...' : 'Criar Pelada'}
      </button>
    </div>
  )
}

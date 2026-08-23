'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Search, Trash2, UserRound } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import PlayerFormSheet from '@/components/PlayerFormSheet'
import StarRating from '@/components/StarRating'
import { createPlayer, deletePlayer, updatePlayer } from '@/actions/players'
import type { PlayerRow } from '@/lib/types'

export default function PlayersManager({ players }: { players: PlayerRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState('')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<PlayerRow | null>(null)
  const [removing, setRemoving] = useState<PlayerRow | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [listError, setListError] = useState<string | null>(null)

  const filtered = players.filter((player) =>
    player.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  function openCreate() {
    setEditing(null)
    setFormError(null)
    setSheetOpen(true)
  }

  function openEdit(player: PlayerRow) {
    setEditing(player)
    setFormError(null)
    setSheetOpen(true)
  }

  function handleSubmit(values: { name: string; rating: number }) {
    setFormError(null)

    startTransition(async () => {
      const result = editing
        ? await updatePlayer({ id: editing.id, ...values })
        : await createPlayer(values)

      if (!result.ok) {
        setFormError(result.error)
        return
      }

      setSheetOpen(false)
      setEditing(null)
      router.refresh()
    })
  }

  function handleDelete() {
    if (!removing) return
    setListError(null)

    startTransition(async () => {
      const result = await deletePlayer(removing.id)

      if (!result.ok) {
        setListError(result.error)
        setRemoving(null)
        return
      }

      setRemoving(null)
      router.refresh()
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-50">Jogadores</h1>
          <p className="text-xs text-slate-500">{players.length} cadastrados</p>
        </div>

        <button className="btn-primary" onClick={openCreate}>
          <Plus size={16} />
          Novo
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar jogador"
          className="field pl-11"
        />
      </div>

      {listError ? (
        <p className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {listError}
        </p>
      ) : null}

      {filtered.length === 0 ? (
        <div className="card flex flex-col items-center gap-2 px-5 py-10 text-center">
          <UserRound size={28} className="text-slate-600" />
          <p className="text-sm text-slate-500">
            {players.length === 0 ? 'Nenhum jogador cadastrado ainda.' : 'Nenhum jogador encontrado.'}
          </p>
        </div>
      ) : (
        <ul className="card divide-y divide-white/5 overflow-hidden">
          {filtered.map((player) => (
            <li key={player.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-100">{player.name}</p>
                <div className="mt-1 flex items-center gap-2">
                  <StarRating value={player.rating} size={13} />
                  <span className="text-[11px] text-slate-500">
                    {player.matchesPlayed} peladas · {player.totalGoals}G {player.totalAssists}A
                  </span>
                </div>
              </div>

              <button
                onClick={() => openEdit(player)}
                aria-label={`Editar ${player.name}`}
                className="stepper"
              >
                <Pencil size={15} />
              </button>
              <button
                onClick={() => setRemoving(player)}
                aria-label={`Excluir ${player.name}`}
                className="stepper text-red-400"
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {sheetOpen ? (
        <PlayerFormSheet
          key={editing?.id ?? 'novo'}
          player={editing}
          pending={pending}
          error={formError}
          onSubmit={handleSubmit}
          onClose={() => setSheetOpen(false)}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(removing)}
        title={`Excluir ${removing?.name ?? ''}?`}
        description="Todo o histórico do jogador nas peladas será removido junto. Esta ação não pode ser desfeita."
        confirmLabel="Excluir"
        tone="danger"
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setRemoving(null)}
      />
    </div>
  )
}

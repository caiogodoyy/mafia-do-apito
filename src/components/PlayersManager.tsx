'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pencil, Plus, Search, Trash2, UserRound } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import PlayerFormSheet from '@/components/PlayerFormSheet'
import StarRating from '@/components/StarRating'
import TxtImportButton from '@/components/TxtImportButton'
import { bulkUpdateRatings, createPlayer, deletePlayer, updatePlayer } from '@/actions/players'
import { parseRatingList } from '@/lib/import-txt'
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
  const [importNotice, setImportNotice] = useState<string | null>(null)

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

  function importRatings(content: string) {
    setListError(null)
    setImportNotice(null)

    const { entries, invalid, duplicated } = parseRatingList(content)

    if (entries.length === 0) {
      setListError('Nenhuma linha válida no arquivo. Use o formato "Nome - 4,5".')
      return
    }

    startTransition(async () => {
      const result = await bulkUpdateRatings(entries)

      if (!result.ok) {
        setListError(result.error)
        return
      }

      const summary = result.data
      const parts = [`${summary?.updated ?? 0} jogador(es) com estrelas atualizadas`]

      if (summary && summary.unchanged > 0) {
        parts.push(`${summary.unchanged} sem alteração (estrelas já iguais)`)
      }
      if (summary && summary.notFound.length > 0) {
        parts.push(
          `${summary.notFound.length} não encontrado(s) no cadastro: ${summary.notFound.join(', ')}`,
        )
      }
      if (summary && summary.invalid.length > 0) {
        parts.push(`${summary.invalid.length} com estrelas inválidas: ${summary.invalid.join(', ')}`)
      }
      if (invalid.length > 0) {
        parts.push(`${invalid.length} linha(s) fora do formato: ${invalid.join(' | ')}`)
      }
      if (duplicated.length > 0) {
        parts.push(`${duplicated.length} repetido(s) no arquivo: ${duplicated.join(', ')}`)
      }

      setImportNotice(parts.join(' · '))
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

        <div className="flex items-center gap-2">
          <TxtImportButton
            label="Importar .txt"
            className="btn-ghost px-3 py-2.5"
            disabled={pending || players.length === 0}
            onLoad={importRatings}
            onError={(message) => {
              setImportNotice(null)
              setListError(message)
            }}
          />

          <button className="btn-primary" onClick={openCreate}>
            <Plus size={16} />
            Novo
          </button>
        </div>
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

      {importNotice ? (
        <p className="rounded-2xl border border-lime-400/20 bg-lime-400/10 px-4 py-3 text-xs text-lime-300">
          {importNotice}
        </p>
      ) : null}

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

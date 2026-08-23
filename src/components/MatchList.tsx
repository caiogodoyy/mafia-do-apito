'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CalendarDays, ChevronRight, Trash2, Trophy, Users } from 'lucide-react'
import ConfirmDialog from '@/components/ConfirmDialog'
import { deleteMatch } from '@/actions/matches'
import { formatDate } from '@/lib/format'
import type { MatchSummary } from '@/lib/types'

export default function MatchList({ matches }: { matches: MatchSummary[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [removing, setRemoving] = useState<MatchSummary | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleDelete() {
    if (!removing) return
    setError(null)

    const target = removing.id

    startTransition(async () => {
      const result = await deleteMatch(target)

      if (!result.ok) {
        setError(result.error)
        setRemoving(null)
        return
      }

      setRemoving(null)
      router.refresh()
    })
  }

  if (matches.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 px-5 py-10 text-center">
        <CalendarDays size={28} className="text-slate-600" />
        <p className="text-sm text-slate-500">Nenhuma pelada registrada ainda.</p>
      </div>
    )
  }

  return (
    <>
      {error ? (
        <p className="mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <ul className="space-y-3">
        {matches.map((match) => (
          <li key={match.id} className="card flex items-center gap-1 pr-2">
            <Link
              href={`/pelada/${match.id}`}
              className="flex min-w-0 flex-1 items-center gap-3 px-4 py-4 transition active:scale-[0.99]"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-50">{formatDate(match.date)}</p>
                  <span
                    className={`badge ${
                      match.status === 'OPEN'
                        ? 'bg-lime-400/15 text-lime-300'
                        : 'bg-white/5 text-slate-400'
                    }`}
                  >
                    {match.status === 'OPEN' ? 'Aberta' : 'Encerrada'}
                  </span>
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1">
                    <Users size={12} />
                    {match.playerCount} jogadores · {match.teamCount} times
                  </span>
                  {match.championName ? (
                    <span className="inline-flex items-center gap-1 text-amber-300">
                      <Trophy size={12} />
                      {match.championName}
                    </span>
                  ) : null}
                </div>
              </div>

              <ChevronRight size={18} className="shrink-0 text-slate-600" />
            </Link>

            <button
              onClick={() => setRemoving(match)}
              aria-label={`Excluir pelada de ${formatDate(match.date)}`}
              className="stepper text-red-400"
            >
              <Trash2 size={15} />
            </button>
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={Boolean(removing)}
        title={`Excluir a pelada de ${removing ? formatDate(removing.date) : ''}?`}
        description={
          removing?.status === 'CLOSED'
            ? 'Como esta pelada já foi encerrada, os gols, assistências, o artilheiro, o garçom e o título do campeão do dia serão descontados do histórico global dos jogadores. Não dá para desfazer.'
            : 'A pelada e a divisão dos times serão apagadas. Não dá para desfazer.'
        }
        confirmLabel="Excluir"
        tone="danger"
        pending={pending}
        onConfirm={handleDelete}
        onCancel={() => setRemoving(null)}
      />
    </>
  )
}

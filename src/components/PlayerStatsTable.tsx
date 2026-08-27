'use client'

import { useMemo, useState } from 'react'
import { BarChart3, Check, ChevronDown, ChevronUp, Copy } from 'lucide-react'
import {
  DEFAULT_STAT_KEY,
  STATS_LIMIT,
  STAT_COLUMNS,
  defaultDirection,
  formatStatsExport,
  sortPlayerStats,
  statCellValue,
  statColumn,
  type StatKey,
} from '@/lib/stats'
import type { PlayerStatRow } from '@/lib/types'

type Props = {
  rows: PlayerStatRow[]
  periodLabel: string
  isAdmin: boolean
}

const COLUMN_WIDTH: Record<StatKey, string> = {
  name: '',
  matchesPlayed: 'w-8',
  totalWins: 'w-8',
  topScorerCount: 'w-9',
  topAssisterCount: 'w-9',
  totalGoals: 'w-8',
  totalAssists: 'w-8',
  average: 'w-14',
}

const COLUMN_PADDING: Record<StatKey, string> = {
  name: 'pl-1.5 pr-2',
  matchesPlayed: 'px-1.5',
  totalWins: 'px-1.5',
  topScorerCount: 'px-1.5',
  topAssisterCount: 'px-1.5',
  totalGoals: 'px-1.5',
  totalAssists: 'px-1.5',
  average: 'pl-1.5 pr-4',
}

const RANK_PADDING = 'pl-4 pr-1.5'

const RANK_COLOR = ['text-amber-300', 'text-slate-300', 'text-orange-300']

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()

    try {
      return document.execCommand('copy')
    } catch {
      return false
    } finally {
      document.body.removeChild(area)
    }
  }
}

export default function PlayerStatsTable({ rows, periodLabel, isAdmin }: Props) {
  const [sortKey, setSortKey] = useState<StatKey>(DEFAULT_STAT_KEY)
  const [feedback, setFeedback] = useState<'copied' | 'error' | null>(null)

  const direction = defaultDirection(sortKey)

  const visible = useMemo(
    () => sortPlayerStats(rows, sortKey, direction).slice(0, STATS_LIMIT),
    [rows, sortKey, direction],
  )

  async function handleExport() {
    const text = formatStatsExport({
      rows: visible,
      totalPlayers: rows.length,
      periodLabel,
      sortKey,
      direction,
    })

    const copied = await copyToClipboard(text)
    setFeedback(copied ? 'copied' : 'error')
    setTimeout(() => setFeedback(null), 2500)
  }

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-3 border-b border-white/5 px-4 py-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-400/15 text-brand-300">
          <BarChart3 size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-bold leading-tight text-slate-50">Estatísticas</h2>
          <p className="truncate text-xs text-slate-500">
            Top {STATS_LIMIT} por {statColumn(sortKey).label.toLowerCase()}
          </p>
        </div>

        {isAdmin ? (
          <button type="button" onClick={handleExport} className="btn-ghost shrink-0 px-3 py-2">
            {feedback === 'copied' ? (
              <Check size={14} className="text-brand-400" />
            ) : (
              <Copy size={14} />
            )}
            <span className="text-xs">{feedback === 'copied' ? 'Copiado!' : 'Exportar'}</span>
          </button>
        ) : null}
      </header>

      {feedback === 'error' ? (
        <p className="border-b border-white/5 bg-red-500/10 px-4 py-2 text-center text-xs text-red-300">
          Não foi possível copiar para a área de transferência.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <p className="px-5 py-8 text-center text-sm text-slate-500">Nenhum registro no período.</p>
      ) : (
        <table className="w-full table-fixed border-collapse">
          <colgroup>
            <col className="w-9" />
            {STAT_COLUMNS.map((column) => (
              <col key={column.key} className={COLUMN_WIDTH[column.key]} />
            ))}
          </colgroup>

          <thead>
            <tr className="border-b border-white/5 bg-white/[0.03]">
              <th
                scope="col"
                className={`${RANK_PADDING} py-2.5 text-left text-[10px] font-bold text-slate-600`}
              >
                #
              </th>
              {STAT_COLUMNS.map((column) => {
                const active = column.key === sortKey

                return (
                  <th
                    key={column.key}
                    scope="col"
                    aria-sort={active ? (direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    className={`${COLUMN_PADDING[column.key]} py-2.5 ${
                      column.numeric ? 'text-right' : 'text-left'
                    } ${active ? 'bg-brand-400/[0.07]' : ''}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSortKey(column.key)}
                      title={column.label}
                      className={`inline-flex w-full items-center gap-0.5 text-[10px] font-bold uppercase tracking-wider transition ${
                        column.numeric ? 'justify-end' : 'justify-start'
                      } ${
                        active
                          ? 'cursor-default text-brand-400'
                          : 'text-slate-500 hover:text-slate-300 active:text-slate-300'
                      }`}
                    >
                      <span className="truncate">{column.short}</span>
                      {active ? (
                        direction === 'asc' ? (
                          <ChevronUp size={11} className="shrink-0" />
                        ) : (
                          <ChevronDown size={11} className="shrink-0" />
                        )
                      ) : null}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {visible.map((row, index) => (
              <tr key={row.id} className="transition-colors hover:bg-white/[0.02]">
                <td
                  className={`${RANK_PADDING} py-2.5 text-left text-[11px] font-bold tabular-nums ${
                    RANK_COLOR[index] ?? 'text-slate-600'
                  }`}
                >
                  {index + 1}
                </td>
                {STAT_COLUMNS.map((column) => {
                  const active = column.key === sortKey

                  if (!column.numeric) {
                    return (
                      <td
                        key={column.key}
                        className={`${COLUMN_PADDING[column.key]} py-2.5 text-[13px] font-medium text-slate-100 ${
                          active ? 'bg-brand-400/[0.04]' : ''
                        }`}
                      >
                        <span className="block truncate">{row.name}</span>
                      </td>
                    )
                  }

                  return (
                    <td
                      key={column.key}
                      className={`${COLUMN_PADDING[column.key]} py-2.5 text-right text-xs tabular-nums ${
                        active
                          ? 'bg-brand-400/[0.04] font-bold text-slate-50'
                          : 'font-medium text-slate-400'
                      }`}
                    >
                      {statCellValue(row, column.key)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer className="border-t border-white/5 px-4 py-3 text-[11px] leading-relaxed text-slate-600">
        PJ peladas jogadas · V vitórias · ART artilharias · GAR garçons · G gols · A assistências ·
        MÉD média de participação em gol
      </footer>
    </section>
  )
}

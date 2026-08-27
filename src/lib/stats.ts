import type { PlayerStatRow } from '@/lib/types'

export type StatKey =
  | 'name'
  | 'matchesPlayed'
  | 'totalWins'
  | 'topScorerCount'
  | 'topAssisterCount'
  | 'totalGoals'
  | 'totalAssists'
  | 'average'

export type SortDirection = 'asc' | 'desc'

export type StatColumn = {
  key: StatKey
  short: string
  label: string
  numeric: boolean
}

export const STATS_LIMIT = 20

export const DEFAULT_STAT_KEY: StatKey = 'totalGoals'

export const STAT_COLUMNS: StatColumn[] = [
  { key: 'name', short: 'Jogador', label: 'Jogador', numeric: false },
  { key: 'matchesPlayed', short: 'PJ', label: 'Peladas jogadas', numeric: true },
  { key: 'totalWins', short: 'V', label: 'Vitórias', numeric: true },
  { key: 'topScorerCount', short: 'ART', label: 'Artilharias', numeric: true },
  { key: 'topAssisterCount', short: 'GAR', label: 'Garçons', numeric: true },
  { key: 'totalGoals', short: 'G', label: 'Gols', numeric: true },
  { key: 'totalAssists', short: 'A', label: 'Assistências', numeric: true },
  { key: 'average', short: 'MÉD', label: 'Média de participação em gol', numeric: true },
]

const averageFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})

export function formatAverage(value: number) {
  return averageFormatter.format(value)
}

export function statColumn(key: StatKey): StatColumn {
  return STAT_COLUMNS.find((column) => column.key === key) ?? STAT_COLUMNS[0]
}

export function defaultDirection(key: StatKey): SortDirection {
  return key === 'name' ? 'asc' : 'desc'
}

export function sortPlayerStats(
  rows: PlayerStatRow[],
  key: StatKey,
  direction: SortDirection,
): PlayerStatRow[] {
  const factor = direction === 'asc' ? 1 : -1

  return [...rows].sort((a, b) => {
    if (key === 'name') return factor * a.name.localeCompare(b.name, 'pt-BR')

    const diff = a[key] - b[key]
    if (diff !== 0) return factor * diff

    return a.name.localeCompare(b.name, 'pt-BR')
  })
}

export function statCellValue(row: PlayerStatRow, key: StatKey): string {
  if (key === 'name') return row.name
  if (key === 'average') return formatAverage(row.average)
  return String(row[key])
}

type ExportInput = {
  rows: PlayerStatRow[]
  totalPlayers: number
  periodLabel: string
  sortKey: StatKey
  direction: SortDirection
}

export function formatStatsExport({
  rows,
  totalPlayers,
  periodLabel,
  sortKey,
  direction,
}: ExportInput): string {
  const order =
    sortKey === 'name'
      ? direction === 'asc'
        ? 'A → Z'
        : 'Z → A'
      : direction === 'desc'
        ? 'maior para menor'
        : 'menor para maior'
  const header = [
    '🏆 MÁFIA DO APITO — Estatísticas',
    `📅 Período: ${periodLabel}`,
    `🔀 Ordenado por: ${statColumn(sortKey).label} (${order})`,
    `👥 Exibindo ${rows.length} de ${totalPlayers} jogadores`,
  ]

  if (rows.length === 0) {
    return [...header, '', 'Nenhum registro no período.'].join('\n')
  }

  const cells = rows.map((row, index) => [
    String(index + 1),
    ...STAT_COLUMNS.map((column) => statCellValue(row, column.key)),
  ])

  const titles = ['#', ...STAT_COLUMNS.map((column) => column.short.toUpperCase())]

  const widths = titles.map((title, index) =>
    Math.max(title.length, ...cells.map((line) => line[index].length)),
  )

  const pad = (value: string, index: number) =>
    index === 1 ? value.padEnd(widths[index]) : value.padStart(widths[index])

  const lines = [titles, ...cells].map((line) =>
    line.map((value, index) => pad(value, index)).join('  ').trimEnd(),
  )

  const legend = STAT_COLUMNS.filter((column) => column.numeric)
    .map((column) => `${column.short} = ${column.label}`)
    .join(' · ')

  return [...header, '', '```', ...lines, '```', '', legend].join('\n')
}

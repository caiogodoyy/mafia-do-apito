import { toDateInputValue } from '@/lib/format'

export type PeriodKey = 'mes' | 'ano' | 'tudo'

export type PeriodRange = { start: Date; end: Date }

export const DEFAULT_PERIOD: PeriodKey = 'tudo'

export const PERIOD_OPTIONS: { key: PeriodKey; label: string }[] = [
  { key: 'mes', label: 'Mês' },
  { key: 'ano', label: 'Ano' },
  { key: 'tudo', label: 'Geral' },
]

export function parsePeriod(value: string | string[] | undefined): PeriodKey {
  const key = Array.isArray(value) ? value[0] : value
  return PERIOD_OPTIONS.some((option) => option.key === key) ? (key as PeriodKey) : DEFAULT_PERIOD
}

function currentParts() {
  const [year, month] = toDateInputValue(new Date()).split('-').map(Number)
  return { year, month }
}

export function periodRange(period: PeriodKey): PeriodRange | null {
  if (period === 'tudo') return null

  const { year, month } = currentParts()

  if (period === 'mes') {
    return { start: new Date(Date.UTC(year, month - 1, 1)), end: new Date(Date.UTC(year, month, 1)) }
  }

  return { start: new Date(Date.UTC(year, 0, 1)), end: new Date(Date.UTC(year + 1, 0, 1)) }
}

const monthLabelFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  month: 'long',
  year: 'numeric',
})

export function periodLabel(period: PeriodKey): string {
  const { year, month } = currentParts()

  if (period === 'mes') {
    const label = monthLabelFormatter.format(new Date(Date.UTC(year, month - 1, 1)))
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  if (period === 'ano') return `Ano de ${year}`

  return 'Todo o histórico'
}

export function periodHref(period: PeriodKey): string {
  return period === DEFAULT_PERIOD ? '/' : `/?periodo=${period}`
}

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const longDateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'UTC',
  weekday: 'long',
  day: '2-digit',
  month: 'long',
})

export function formatDate(value: string | Date) {
  return dateFormatter.format(new Date(value))
}

export function formatLongDate(value: string | Date) {
  const formatted = longDateFormatter.format(new Date(value))
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

const inputDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Sao_Paulo',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function toDateInputValue(value: string | Date) {
  return inputDateFormatter.format(new Date(value))
}

export function parseDateInput(value: string) {
  return new Date(`${value}T12:00:00.000Z`)
}

const ratingFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 1,
})

export function formatRating(value: number) {
  return ratingFormatter.format(value)
}

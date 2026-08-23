import type { LucideIcon } from 'lucide-react'
import type { RankingEntry } from '@/lib/types'

type Props = {
  title: string
  subtitle: string
  icon: LucideIcon
  accent: string
  unit: string
  entries: RankingEntry[]
}

const positionStyles = [
  'bg-amber-400/15 text-amber-300 border-amber-400/30',
  'bg-slate-300/10 text-slate-300 border-slate-300/20',
  'bg-orange-500/10 text-orange-300 border-orange-500/20',
  'bg-white/5 text-slate-400 border-white/10',
  'bg-white/5 text-slate-400 border-white/10',
]

export default function RankingCard({ title, subtitle, icon: Icon, accent, unit, entries }: Props) {
  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-3 border-b border-white/5 px-5 py-4">
        <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${accent}`}>
          <Icon size={20} />
        </span>
        <div>
          <h2 className="text-base font-bold leading-tight text-slate-50">{title}</h2>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </header>

      {entries.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-slate-500">Nenhum registro ainda.</p>
      ) : (
        <ol className="divide-y divide-white/5">
          {entries.map((entry, index) => (
            <li key={entry.id} className="flex items-center gap-3 px-5 py-3">
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${positionStyles[index]}`}
              >
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-100">
                {entry.name}
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-slate-50">
                {entry.value}
                <span className="ml-1 text-[11px] font-medium text-slate-500">{unit}</span>
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  )
}

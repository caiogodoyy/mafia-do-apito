import Link from 'next/link'
import { CalendarRange } from 'lucide-react'
import { PERIOD_OPTIONS, periodHref, periodLabel, type PeriodKey } from '@/lib/period'

export default function PeriodFilter({ period }: { period: PeriodKey }) {
  return (
    <div>
      <div className="flex gap-1 rounded-2xl border border-white/10 bg-white/5 p-1">
        {PERIOD_OPTIONS.map((option) => {
          const active = option.key === period

          return (
            <Link
              key={option.key}
              href={periodHref(option.key)}
              scroll={false}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 rounded-xl px-3 py-2 text-center text-sm font-semibold transition ${
                active ? 'bg-lime-400 text-pitch-950' : 'text-slate-400 active:bg-white/5'
              }`}
            >
              {option.label}
            </Link>
          )
        })}
      </div>

      <p className="mt-2 flex items-center justify-center gap-1.5 text-xs text-slate-500">
        <CalendarRange size={12} />
        {periodLabel(period)}
      </p>
    </div>
  )
}

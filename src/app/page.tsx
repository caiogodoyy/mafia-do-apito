import Image from 'next/image'
import Link from 'next/link'
import { Radio, Users } from 'lucide-react'
import PeriodFilter from '@/components/PeriodFilter'
import PlayerStatsTable from '@/components/PlayerStatsTable'
import { getPlayerStats } from '@/actions/rankings'
import { isAdmin } from '@/lib/auth'
import { formatDate } from '@/lib/format'
import { parsePeriod, periodLabel } from '@/lib/period'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function HomePage({ searchParams }: Props) {
  const period = parsePeriod((await searchParams).periodo)

  const [stats, liveMatch, admin] = await Promise.all([
    getPlayerStats(period),
    prisma.match.findFirst({
      where: { status: 'OPEN' },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, date: true },
    }),
    isAdmin(),
  ])

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-4 pt-8">
      <header className="flex items-center gap-3">
        <Image
          src="/logo.jpeg"
          alt=""
          width={48}
          height={48}
          priority
          className="h-12 w-12 shrink-0 rounded-2xl object-cover ring-1 ring-white/10"
        />
        <div>
          <h1 className="text-2xl font-black leading-none tracking-tight text-slate-50">
            Máfia do Apito
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {stats.totalPlayers} jogadores no elenco
          </p>
        </div>
      </header>

      {liveMatch ? (
        <Link
          href={`/pelada/${liveMatch.id}`}
          className="mt-6 flex items-center gap-3 rounded-3xl border border-brand-400/30 bg-brand-400/10 px-5 py-4 transition active:scale-[0.99]"
        >
          <Radio size={20} className="animate-pulse-soft text-brand-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-brand-300">Pelada em andamento</p>
            <p className="text-xs text-slate-400">{formatDate(liveMatch.date)} · toque para acompanhar</p>
          </div>
        </Link>
      ) : null}

      <div className="mt-6">
        <PeriodFilter period={period} />
      </div>

      <main className="mt-5 pb-4">
        <PlayerStatsTable
          rows={stats.players}
          periodLabel={periodLabel(period)}
          isAdmin={admin}
        />
      </main>

      <footer className="safe-bottom mt-auto flex items-center justify-center gap-2 pt-6 text-xs text-slate-600">
        <Users size={12} />
        <span>Máfia do Apito</span>
        <Link href="/login" aria-label="Área do administrador" className="px-1 text-slate-700 transition hover:text-slate-400">
          ·
        </Link>
        <span>Содержание, сфабрикованное диктатором Гильерме.</span>
      </footer>
    </div>
  )
}

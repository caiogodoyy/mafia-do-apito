import Image from 'next/image'
import Link from 'next/link'
import { Crosshair, Handshake, Radio, Trophy, Users, Zap } from 'lucide-react'
import RankingCard from '@/components/RankingCard'
import { getRankings } from '@/actions/rankings'
import { formatDate } from '@/lib/format'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [rankings, liveMatch] = await Promise.all([
    getRankings(),
    prisma.match.findFirst({
      where: { status: 'OPEN' },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      select: { id: true, date: true },
    }),
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
            {rankings.totalPlayers} jogadores no elenco
          </p>
        </div>
      </header>

      {liveMatch ? (
        <Link
          href={`/pelada/${liveMatch.id}`}
          className="mt-6 flex items-center gap-3 rounded-3xl border border-lime-400/30 bg-lime-400/10 px-5 py-4 transition active:scale-[0.99]"
        >
          <Radio size={20} className="animate-pulse-soft text-lime-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-lime-300">Pelada em andamento</p>
            <p className="text-xs text-slate-400">{formatDate(liveMatch.date)} · toque para acompanhar</p>
          </div>
        </Link>
      ) : null}

      <main className="mt-6 grid gap-4 pb-4">
        <RankingCard
          title="Artilheiros"
          subtitle="Vezes que foi o artilheiro do dia"
          icon={Crosshair}
          accent="bg-red-500/15 text-red-400"
          unit="x"
          entries={rankings.scorers}
        />
        <RankingCard
          title="Vencedores"
          subtitle="Vezes que foi campeão do dia"
          icon={Trophy}
          accent="bg-amber-400/15 text-amber-300"
          unit="x"
          entries={rankings.winners}
        />
        <RankingCard
          title="Garçons"
          subtitle="Vezes que foi o garçom do dia"
          icon={Handshake}
          accent="bg-sky-400/15 text-sky-300"
          unit="x"
          entries={rankings.assisters}
        />
        <RankingCard
          title="Participações em Gols"
          subtitle="Gols + assistências na carreira"
          icon={Zap}
          accent="bg-lime-400/15 text-lime-300"
          unit="pts"
          entries={rankings.participations}
        />
      </main>

      <footer className="safe-bottom mt-auto flex items-center justify-center gap-2 pt-6 text-xs text-slate-600">
        <Users size={12} />
        <span>Máfia do Apito</span>
        <Link href="/login" aria-label="Área do administrador" className="px-1 text-slate-700 transition hover:text-slate-400">
          ·
        </Link>
        <span>Pelada com estatística é outra coisa</span>
      </footer>
    </div>
  )
}

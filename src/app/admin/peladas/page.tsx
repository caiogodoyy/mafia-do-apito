import Link from 'next/link'
import { Plus } from 'lucide-react'
import MatchList from '@/components/MatchList'
import { listMatches } from '@/actions/matches'

export const dynamic = 'force-dynamic'

export default async function AdminMatchesPage() {
  const matches = await listMatches()

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black tracking-tight text-slate-50">Peladas</h1>
          <p className="text-xs text-slate-500">{matches.length} no histórico</p>
        </div>

        <Link href="/admin/peladas/nova" className="btn-primary">
          <Plus size={16} />
          Nova Pelada
        </Link>
      </div>

      <MatchList matches={matches} />
    </div>
  )
}

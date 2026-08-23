import { notFound } from 'next/navigation'
import LiveMatch from '@/components/LiveMatch'
import PusherProvider from '@/components/PusherProvider'
import { isAdmin } from '@/lib/auth'
import { loadMatchState } from '@/lib/match-state'

export const dynamic = 'force-dynamic'

export default async function LiveMatchPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params
  const [state, admin] = await Promise.all([loadMatchState(uuid), isAdmin()])

  if (!state) notFound()

  return (
    <PusherProvider initialState={state} isAdmin={admin}>
      <LiveMatch />
    </PusherProvider>
  )
}

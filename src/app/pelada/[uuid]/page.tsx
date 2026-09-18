import { notFound, redirect } from 'next/navigation'
import LiveMatch from '@/components/LiveMatch'
import PusherProvider from '@/components/PusherProvider'
import { isAdmin } from '@/lib/auth'
import { loadMatchState } from '@/lib/match-state'

export const dynamic = 'force-dynamic'

export default async function LiveMatchPage({ params }: { params: Promise<{ uuid: string }> }) {
  const { uuid } = await params

  if (!(await isAdmin())) redirect('/login')

  const state = await loadMatchState(uuid)

  if (!state) notFound()

  return (
    <PusherProvider initialState={state} isAdmin>
      <LiveMatch />
    </PusherProvider>
  )
}

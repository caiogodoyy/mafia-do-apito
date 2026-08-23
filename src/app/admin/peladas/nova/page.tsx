import NewMatchForm from '@/components/NewMatchForm'
import { listPlayers } from '@/actions/players'
import { toDateInputValue } from '@/lib/format'

export const dynamic = 'force-dynamic'

export default async function NewMatchPage() {
  const players = await listPlayers()

  return <NewMatchForm players={players} defaultDate={toDateInputValue(new Date())} />
}

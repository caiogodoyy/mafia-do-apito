import PlayersManager from '@/components/PlayersManager'
import { listPlayers } from '@/actions/players'

export const dynamic = 'force-dynamic'

export default async function AdminPlayersPage() {
  const players = await listPlayers()

  return <PlayersManager players={players} />
}

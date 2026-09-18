import { isAdmin } from '@/lib/auth'
import { loadMatchState } from '@/lib/match-state'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ uuid: string }> }) {
  if (!(await isAdmin())) {
    return Response.json({ ok: false, error: 'Acesso restrito ao administrador.' }, { status: 401 })
  }

  const { uuid } = await params
  const state = await loadMatchState(uuid)

  if (!state) {
    return Response.json({ ok: false, error: 'Pelada não encontrada.' }, { status: 404 })
  }

  return Response.json({ ok: true, data: state }, { headers: { 'Cache-Control': 'no-store' } })
}

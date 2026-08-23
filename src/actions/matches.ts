'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { resolveChampion } from '@/lib/champion'
import { MAX_PLAYERS_PER_MATCH, MAX_PLAYERS_PER_TEAM } from '@/lib/balance'
import { loadMatchState, matchInclude, serializeMatch } from '@/lib/match-state'
import { parseDateInput } from '@/lib/format'
import { broadcastMatch } from '@/lib/pusher'
import { prisma } from '@/lib/prisma'
import type { ActionResult, MatchSummary, MatchState } from '@/lib/types'

export type NewMatchInput = {
  date: string
  teams: { name: string; playerIds: string[] }[]
}

function refresh(matchId?: string) {
  revalidatePath('/')
  revalidatePath('/admin/peladas')
  if (matchId) revalidatePath(`/pelada/${matchId}`)
}

function consolidationOps(state: MatchState, championTeamId: string | null, direction: 1 | -1) {
  const participants = state.teams.flatMap((team) => team.players)
  const maxGoals = Math.max(0, ...participants.map((player) => player.goals))
  const maxAssists = Math.max(0, ...participants.map((player) => player.assists))
  const championTeam = state.teams.find((team) => team.id === championTeamId)
  const championIds = new Set(championTeam?.players.map((player) => player.playerId) ?? [])

  return participants.map((player) =>
    prisma.player.update({
      where: { id: player.playerId },
      data: {
        totalGoals: { increment: direction * player.goals },
        totalAssists: { increment: direction * player.assists },
        matchesPlayed: { increment: direction },
        ...(maxGoals > 0 && player.goals === maxGoals
          ? { topScorerCount: { increment: direction } }
          : {}),
        ...(maxAssists > 0 && player.assists === maxAssists
          ? { topAssisterCount: { increment: direction } }
          : {}),
        ...(championIds.has(player.playerId) ? { totalWins: { increment: direction } } : {}),
      },
    }),
  )
}

export async function listMatches(): Promise<MatchSummary[]> {
  const matches = await prisma.match.findMany({
    orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    include: {
      teams: { select: { id: true, name: true } },
      _count: { select: { players: true } },
    },
  })

  return matches.map((match) => ({
    id: match.id,
    date: match.date.toISOString(),
    status: match.status,
    playerCount: match._count.players,
    teamCount: match.teams.length,
    championName: match.championTeamId
      ? (match.teams.find((team) => team.id === match.championTeamId)?.name ?? null)
      : null,
  }))
}

export async function createMatch(input: NewMatchInput): Promise<ActionResult<{ id: string }>> {
  try {
    await requireAdmin()

    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
      return { ok: false, error: 'Escolha uma data válida.' }
    }

    const teams = input.teams.filter((team) => team.playerIds.length > 0)

    if (teams.length < 2) {
      return { ok: false, error: 'Monte pelo menos 2 times com jogadores.' }
    }

    const overloaded = teams.find((team) => team.playerIds.length > MAX_PLAYERS_PER_TEAM)
    if (overloaded) {
      return { ok: false, error: `${overloaded.name} passou do limite de ${MAX_PLAYERS_PER_TEAM} jogadores.` }
    }

    const playerIds = teams.flatMap((team) => team.playerIds)

    if (playerIds.length > MAX_PLAYERS_PER_MATCH) {
      return { ok: false, error: `Máximo de ${MAX_PLAYERS_PER_MATCH} jogadores por pelada.` }
    }

    if (new Set(playerIds).size !== playerIds.length) {
      return { ok: false, error: 'Um jogador foi escalado em mais de um time.' }
    }

    const found = await prisma.player.count({ where: { id: { in: playerIds } } })
    if (found !== playerIds.length) {
      return { ok: false, error: 'Algum jogador selecionado não existe mais.' }
    }

    const matchId = await prisma.$transaction(async (tx) => {
      const match = await tx.match.create({
        data: { date: parseDateInput(input.date) },
        select: { id: true },
      })

      for (const [index, team] of teams.entries()) {
        const created = await tx.matchTeam.create({
          data: { matchId: match.id, name: team.name, position: index },
          select: { id: true },
        })

        await tx.matchPlayer.createMany({
          data: team.playerIds.map((playerId) => ({
            matchId: match.id,
            matchTeamId: created.id,
            playerId,
          })),
        })
      }

      return match.id
    })

    refresh(matchId)

    return { ok: true, data: { id: matchId } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro ao criar a pelada.' }
  }
}

export async function closeMatch(matchId: string): Promise<ActionResult<MatchState>> {
  try {
    await requireAdmin()

    const match = await prisma.match.findUnique({ where: { id: matchId }, include: matchInclude })
    if (!match) return { ok: false, error: 'Pelada não encontrada.' }
    if (match.status === 'CLOSED') return { ok: false, error: 'Esta pelada já está encerrada.' }

    const state = serializeMatch(match)
    const champion = resolveChampion(state)

    if (champion.kind === 'PENDING') {
      return { ok: false, error: 'Registre ao menos um resultado antes de encerrar.' }
    }

    if (champion.kind === 'PENALTY') {
      const names = champion.teams.map((team) => team.name).join(' vs ')
      return { ok: false, error: `Defina o campeão nos pênaltis (${names}) antes de encerrar.` }
    }

    await prisma.$transaction([
      ...consolidationOps(state, champion.team.id, 1),
      prisma.match.update({
        where: { id: matchId },
        data: { status: 'CLOSED', championTeamId: champion.team.id },
      }),
    ])

    const updated = await loadMatchState(matchId)
    if (updated) await broadcastMatch(updated)
    refresh(matchId)

    return { ok: true, data: updated ?? undefined }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro ao encerrar a pelada.' }
  }
}

export async function reopenMatch(matchId: string): Promise<ActionResult<MatchState>> {
  try {
    await requireAdmin()

    const match = await prisma.match.findUnique({ where: { id: matchId }, include: matchInclude })
    if (!match) return { ok: false, error: 'Pelada não encontrada.' }
    if (match.status === 'OPEN') return { ok: false, error: 'Esta pelada já está aberta.' }

    const state = serializeMatch(match)

    await prisma.$transaction([
      ...consolidationOps(state, state.championTeamId, -1),
      prisma.match.update({
        where: { id: matchId },
        data: { status: 'OPEN', championTeamId: null },
      }),
    ])

    const updated = await loadMatchState(matchId)
    if (updated) await broadcastMatch(updated)
    refresh(matchId)

    return { ok: true, data: updated ?? undefined }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro ao reabrir a pelada.' }
  }
}

export async function deleteMatch(matchId: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    const match = await prisma.match.findUnique({ where: { id: matchId }, include: matchInclude })
    if (!match) return { ok: false, error: 'Pelada não encontrada.' }

    const state = serializeMatch(match)
    const rollback =
      state.status === 'CLOSED' ? consolidationOps(state, state.championTeamId, -1) : []

    await prisma.$transaction([...rollback, prisma.match.delete({ where: { id: matchId } })])

    refresh(matchId)

    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro ao excluir a pelada.' }
  }
}

'use server'

import { Prisma } from '@prisma/client'
import { revalidatePath } from 'next/cache'
import { resolveChampion } from '@/lib/champion'
import { loadMatchState } from '@/lib/match-state'
import { isValidDelta } from '@/lib/optimistic'
import { broadcastMatch } from '@/lib/pusher'
import { prisma } from '@/lib/prisma'
import type { PlayerStat, TeamStat } from '@/lib/optimistic'
import type { ActionResult, MatchState } from '@/lib/types'

export type { PlayerStat, TeamStat }

async function publish(matchId: string): Promise<ActionResult<MatchState>> {
  const state = await loadMatchState(matchId)
  if (!state) return { ok: false, error: 'Pelada não encontrada.' }

  await broadcastMatch(state)
  revalidatePath(`/pelada/${matchId}`)

  return { ok: true, data: state }
}

function bumpVersion(matchId: string, data: Prisma.MatchUpdateInput = {}) {
  return prisma.match.update({
    where: { id: matchId },
    data: { ...data, version: { increment: 1 } },
  })
}

function incrementClamped(table: 'MatchPlayer' | 'MatchTeam', column: string, id: string, delta: number) {
  const target = Prisma.raw(`"${column}"`)

  return table === 'MatchPlayer'
    ? prisma.$executeRaw`UPDATE "MatchPlayer" SET ${target} = GREATEST(0, ${target} + ${delta}::int) WHERE "id" = ${id}`
    : prisma.$executeRaw`UPDATE "MatchTeam" SET ${target} = GREATEST(0, ${target} + ${delta}::int) WHERE "id" = ${id}`
}

export async function getMatchState(matchId: string): Promise<ActionResult<MatchState>> {
  const state = await loadMatchState(matchId)
  if (!state) return { ok: false, error: 'Pelada não encontrada.' }
  return { ok: true, data: state }
}

export async function updatePlayerStat(
  matchPlayerId: string,
  stat: PlayerStat,
  delta: number,
): Promise<ActionResult<MatchState>> {
  try {
    if (stat !== 'goals' && stat !== 'assists') {
      return { ok: false, error: 'Estatística inválida.' }
    }

    if (!isValidDelta(delta)) {
      return { ok: false, error: 'Variação inválida.' }
    }

    const entry = await prisma.matchPlayer.findUnique({
      where: { id: matchPlayerId },
      select: { id: true, matchId: true, match: { select: { status: true } } },
    })

    if (!entry) return { ok: false, error: 'Jogador não encontrado nesta pelada.' }
    if (entry.match.status === 'CLOSED') {
      return { ok: false, error: 'Pelada encerrada. Reabra para editar.' }
    }

    await prisma.$transaction([
      incrementClamped('MatchPlayer', stat, entry.id, delta),
      bumpVersion(entry.matchId),
    ])

    return publish(entry.matchId)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro ao atualizar o placar.' }
  }
}

export async function updateTeamStat(
  matchTeamId: string,
  stat: TeamStat,
  delta: number,
): Promise<ActionResult<MatchState>> {
  try {
    if (stat !== 'wins' && stat !== 'draws') {
      return { ok: false, error: 'Estatística inválida.' }
    }

    if (!isValidDelta(delta)) {
      return { ok: false, error: 'Variação inválida.' }
    }

    const team = await prisma.matchTeam.findUnique({
      where: { id: matchTeamId },
      select: { id: true, matchId: true, match: { select: { status: true } } },
    })

    if (!team) return { ok: false, error: 'Time não encontrado.' }
    if (team.match.status === 'CLOSED') {
      return { ok: false, error: 'Pelada encerrada. Reabra para editar.' }
    }

    await prisma.$transaction([
      incrementClamped('MatchTeam', stat, team.id, delta),
      bumpVersion(team.matchId, { penaltyWinnerTeamId: null }),
    ])

    return publish(team.matchId)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro ao atualizar o time.' }
  }
}

export async function setPenaltyWinner(
  matchId: string,
  matchTeamId: string,
): Promise<ActionResult<MatchState>> {
  try {
    const state = await loadMatchState(matchId)
    if (!state) return { ok: false, error: 'Pelada não encontrada.' }
    if (state.status === 'CLOSED') {
      return { ok: false, error: 'Pelada encerrada. Reabra para editar.' }
    }

    const champion = resolveChampion(state)
    if (champion.kind !== 'PENALTY') {
      return { ok: false, error: 'Não há disputa de pênaltis nesta pelada.' }
    }

    if (!champion.teams.some((team) => team.id === matchTeamId)) {
      return { ok: false, error: 'Este time não está na disputa de pênaltis.' }
    }

    await bumpVersion(matchId, { penaltyWinnerTeamId: matchTeamId })

    return publish(matchId)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro ao definir o campeão.' }
  }
}

'use server'

import { revalidatePath } from 'next/cache'
import { resolveChampion } from '@/lib/champion'
import { loadMatchState } from '@/lib/match-state'
import { broadcastMatch } from '@/lib/pusher'
import { prisma } from '@/lib/prisma'
import type { ActionResult, MatchState } from '@/lib/types'

export type PlayerStat = 'goals' | 'assists'
export type TeamStat = 'wins' | 'draws'

async function publish(matchId: string): Promise<ActionResult<MatchState>> {
  const state = await loadMatchState(matchId)
  if (!state) return { ok: false, error: 'Pelada não encontrada.' }

  await broadcastMatch(state)
  revalidatePath(`/pelada/${matchId}`)

  return { ok: true, data: state }
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

    const step = delta > 0 ? 1 : -1

    const entry = await prisma.matchPlayer.findUnique({
      where: { id: matchPlayerId },
      select: { id: true, matchId: true, goals: true, assists: true, match: { select: { status: true } } },
    })

    if (!entry) return { ok: false, error: 'Jogador não encontrado nesta pelada.' }
    if (entry.match.status === 'CLOSED') {
      return { ok: false, error: 'Pelada encerrada. Reabra para editar.' }
    }

    const next = Math.max(0, entry[stat] + step)
    if (next !== entry[stat]) {
      await prisma.matchPlayer.update({
        where: { id: entry.id },
        data: stat === 'goals' ? { goals: next } : { assists: next },
      })
    }

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

    const step = delta > 0 ? 1 : -1

    const team = await prisma.matchTeam.findUnique({
      where: { id: matchTeamId },
      select: { id: true, matchId: true, wins: true, draws: true, match: { select: { status: true } } },
    })

    if (!team) return { ok: false, error: 'Time não encontrado.' }
    if (team.match.status === 'CLOSED') {
      return { ok: false, error: 'Pelada encerrada. Reabra para editar.' }
    }

    const next = Math.max(0, team[stat] + step)
    if (next !== team[stat]) {
      await prisma.$transaction([
        prisma.matchTeam.update({
          where: { id: team.id },
          data: stat === 'wins' ? { wins: next } : { draws: next },
        }),
        prisma.match.update({ where: { id: team.matchId }, data: { penaltyWinnerTeamId: null } }),
      ])
    }

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

    await prisma.match.update({
      where: { id: matchId },
      data: { penaltyWinnerTeamId: matchTeamId },
    })

    return publish(matchId)
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro ao definir o campeão.' }
  }
}

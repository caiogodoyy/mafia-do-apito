'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeName, stripInvisible } from '@/lib/import-txt'
import type { ActionResult, PlayerRow, RatingImportSummary } from '@/lib/types'

function sanitizeName(value: unknown) {
  return stripInvisible(String(value ?? '')).trim().replace(/\s+/g, ' ')
}

function sanitizeRating(value: unknown) {
  const rating = Number(value)
  if (!Number.isFinite(rating)) return null
  const rounded = Math.round(rating * 2) / 2
  if (rounded < 0.5 || rounded > 5) return null
  return rounded
}

function refresh() {
  revalidatePath('/')
  revalidatePath('/admin/jogadores')
  revalidatePath('/admin/peladas/nova')
}

export async function listPlayers(): Promise<PlayerRow[]> {
  return prisma.player.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      rating: true,
      totalWins: true,
      totalGoals: true,
      totalAssists: true,
      topScorerCount: true,
      topAssisterCount: true,
      matchesPlayed: true,
    },
  })
}

export async function createPlayer(input: { name: string; rating: number }): Promise<ActionResult> {
  try {
    await requireAdmin()

    const name = sanitizeName(input.name)
    const rating = sanitizeRating(input.rating)

    if (name.length < 2) return { ok: false, error: 'Informe um nome com pelo menos 2 letras.' }
    if (rating === null) return { ok: false, error: 'As estrelas devem ficar entre 0,5 e 5.' }

    const existing = await prisma.player.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
      select: { id: true },
    })

    if (existing) return { ok: false, error: 'Já existe um jogador com esse nome.' }

    await prisma.player.create({ data: { name, rating } })
    refresh()

    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro ao cadastrar jogador.' }
  }
}

export async function updatePlayer(input: {
  id: string
  name: string
  rating: number
}): Promise<ActionResult> {
  try {
    await requireAdmin()

    const name = sanitizeName(input.name)
    const rating = sanitizeRating(input.rating)

    if (name.length < 2) return { ok: false, error: 'Informe um nome com pelo menos 2 letras.' }
    if (rating === null) return { ok: false, error: 'As estrelas devem ficar entre 0,5 e 5.' }

    const existing = await prisma.player.findFirst({
      where: { name: { equals: name, mode: 'insensitive' }, id: { not: input.id } },
      select: { id: true },
    })

    if (existing) return { ok: false, error: 'Já existe um jogador com esse nome.' }

    await prisma.player.update({ where: { id: input.id }, data: { name, rating } })
    refresh()

    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro ao editar jogador.' }
  }
}

export async function deletePlayer(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()

    const openMatches = await prisma.matchPlayer.count({
      where: { playerId: id, match: { status: 'OPEN' } },
    })

    if (openMatches > 0) {
      return { ok: false, error: 'Jogador está escalado em uma pelada aberta.' }
    }

    await prisma.player.delete({ where: { id } })
    refresh()

    return { ok: true }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro ao excluir jogador.' }
  }
}

export async function bulkUpdateRatings(
  entries: { name: string; rating: number }[],
): Promise<ActionResult<RatingImportSummary>> {
  try {
    await requireAdmin()

    if (!Array.isArray(entries) || entries.length === 0) {
      return { ok: false, error: 'O arquivo não tem nenhum jogador válido.' }
    }

    const players = await prisma.player.findMany({ select: { id: true, name: true, rating: true } })
    const byName = new Map(players.map((player) => [normalizeName(player.name), player]))

    const updates: { id: string; rating: number }[] = []
    const notFound: string[] = []
    const invalid: string[] = []
    let unchanged = 0

    for (const entry of entries) {
      const name = sanitizeName(entry.name)
      const rating = sanitizeRating(entry.rating)

      if (name.length < 2 || rating === null) {
        invalid.push(name || String(entry.name ?? ''))
        continue
      }

      const player = byName.get(normalizeName(name))

      if (!player) {
        notFound.push(name)
        continue
      }

      if (player.rating === rating) {
        unchanged += 1
        continue
      }

      updates.push({ id: player.id, rating })
    }

    if (updates.length > 0) {
      await prisma.$transaction(
        updates.map((update) =>
          prisma.player.update({ where: { id: update.id }, data: { rating: update.rating } }),
        ),
      )
      refresh()
    }

    return { ok: true, data: { updated: updates.length, unchanged, notFound, invalid } }
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Erro ao importar estrelas.' }
  }
}

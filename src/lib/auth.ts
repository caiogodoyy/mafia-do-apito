import { createHash, timingSafeEqual } from 'crypto'
import { cookies } from 'next/headers'

export const ADMIN_COOKIE = 'mafia_admin'
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30

function digest(value: string) {
  return createHash('sha256').update(`mafia-do-apito::${value}`).digest('hex')
}

function safeEqual(a: string, b: string) {
  const bufferA = Buffer.from(a)
  const bufferB = Buffer.from(b)
  if (bufferA.length !== bufferB.length) return false
  return timingSafeEqual(bufferA, bufferB)
}

export function adminToken() {
  const password = process.env.ADMIN_PASSWORD
  if (!password) return null
  return digest(password)
}

export function checkPassword(input: string) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return safeEqual(digest(input), digest(expected))
}

export async function isAdmin() {
  const expected = adminToken()
  if (!expected) return false

  const store = await cookies()
  const current = store.get(ADMIN_COOKIE)?.value
  if (!current) return false

  return safeEqual(current, expected)
}

export async function requireAdmin() {
  if (!(await isAdmin())) {
    throw new Error('Acesso restrito ao administrador.')
  }
}

export async function startAdminSession() {
  const token = adminToken()
  if (!token) return

  const store = await cookies()
  store.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
}

export async function endAdminSession() {
  const store = await cookies()
  store.delete(ADMIN_COOKIE)
}

import { createSign } from 'node:crypto'
import { BACKUP_COLUMNS, MATCH_ID_COLUMN, matchBackupRows } from '@/lib/match-backup'
import type { SheetValue } from '@/lib/match-backup'
import type { MatchState } from '@/lib/types'

const SCOPE = 'https://www.googleapis.com/auth/spreadsheets'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const API_URL = 'https://sheets.googleapis.com/v4/spreadsheets'
const TOKEN_TTL = 3600

type SheetsConfig = {
  spreadsheetId: string
  clientEmail: string
  privateKey: string
  tab: string
}

type ApiInit = {
  method?: string
  body?: string
}

function getConfig(): SheetsConfig | null {
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID
  const clientEmail = process.env.GOOGLE_SHEETS_CLIENT_EMAIL
  const privateKey = process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!spreadsheetId || !clientEmail || !privateKey) return null

  return {
    spreadsheetId,
    clientEmail,
    privateKey,
    tab: process.env.GOOGLE_SHEETS_TAB || 'Peladas',
  }
}

function encode(value: string | Buffer) {
  return Buffer.from(value).toString('base64url')
}

let cachedToken: { value: string; expiresAt: number } | null = null

async function getAccessToken(config: SheetsConfig) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) return cachedToken.value

  const issuedAt = Math.floor(Date.now() / 1000)
  const header = encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claims = encode(
    JSON.stringify({
      iss: config.clientEmail,
      scope: SCOPE,
      aud: TOKEN_URL,
      iat: issuedAt,
      exp: issuedAt + TOKEN_TTL,
    }),
  )
  const signature = encode(
    createSign('RSA-SHA256').update(`${header}.${claims}`).sign(config.privateKey),
  )

  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${header}.${claims}.${signature}`,
    }),
  })

  if (!response.ok) {
    throw new Error(`Autenticação no Google recusada (${response.status}): ${await response.text()}`)
  }

  const data = (await response.json()) as { access_token: string; expires_in: number }
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }

  return data.access_token
}

async function api<T>(config: SheetsConfig, path: string, init: ApiInit = {}): Promise<T> {
  const token = await getAccessToken(config)

  const response = await fetch(`${API_URL}/${config.spreadsheetId}${path}`, {
    method: init.method,
    body: init.body,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Google Sheets recusou a requisição (${response.status}): ${await response.text()}`)
  }

  return (await response.json()) as T
}

function appendRows(config: SheetsConfig, values: SheetValue[][]) {
  const range = encodeURIComponent(`${config.tab}!A1`)

  return api<unknown>(
    config,
    `/values/${range}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    { method: 'POST', body: JSON.stringify({ values }) },
  )
}

async function ensureTab(config: SheetsConfig) {
  const data = await api<{ sheets?: { properties: { sheetId: number; title: string } }[] }>(
    config,
    '?fields=sheets.properties(sheetId,title)',
  )

  const existing = data.sheets?.find((sheet) => sheet.properties.title === config.tab)
  if (existing) return existing.properties.sheetId

  const created = await api<{ replies: { addSheet: { properties: { sheetId: number } } }[] }>(
    config,
    ':batchUpdate',
    {
      method: 'POST',
      body: JSON.stringify({ requests: [{ addSheet: { properties: { title: config.tab } } }] }),
    },
  )

  await appendRows(config, [BACKUP_COLUMNS])

  return created.replies[0].addSheet.properties.sheetId
}

async function removeMatchRows(config: SheetsConfig, sheetId: number, matchId: string) {
  const range = encodeURIComponent(`${config.tab}!${MATCH_ID_COLUMN}:${MATCH_ID_COLUMN}`)
  const data = await api<{ values?: string[][] }>(config, `/values/${range}`)
  const rows = data.values ?? []

  const requests = rows
    .flatMap((row, index) => (row[0] === matchId ? [index] : []))
    .reverse()
    .map((index) => ({
      deleteDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: index, endIndex: index + 1 },
      },
    }))

  if (requests.length === 0) return

  await api<unknown>(config, ':batchUpdate', {
    method: 'POST',
    body: JSON.stringify({ requests }),
  })
}

export async function backupMatch(state: MatchState) {
  const config = getConfig()
  if (!config) return

  try {
    const sheetId = await ensureTab(config)
    await removeMatchRows(config, sheetId, state.id)
    await appendRows(config, matchBackupRows(state))
  } catch (error) {
    console.error('Falha ao enviar o backup da pelada para o Google Sheets', error)
  }
}

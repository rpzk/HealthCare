import { ExternalFetchAdapter } from '@/lib/external-updates-service'
import fetch from 'node-fetch'

// ICD-11 WHO adapter (real)
// - Set the following environment variables (recommended):
//   ICD11_CLIENT_ID and ICD11_CLIENT_SECRET (or ICD11_API_BASE to override base URL)
// - The adapter implements OAuth2 client credentials (token endpoint below)
// See: https://icd.who.int/docs/icd-api/API-Authentication/

const ICD11_API_BASE = process.env.ICD11_API_BASE || 'https://id.who.int'
const ICD11_TOKEN_ENDPOINT = process.env.ICD11_TOKEN_ENDPOINT || 'https://icdaccessmanagement.who.int/connect/token'
const ICD11_CLIENT_ID = process.env.ICD11_CLIENT_ID || process.env.ICD11_API_KEY || ''
const ICD11_CLIENT_SECRET = process.env.ICD11_CLIENT_SECRET || process.env.ICD11_API_SECRET || ''

async function requestToken(): Promise<string> {
  if (!ICD11_CLIENT_ID || !ICD11_CLIENT_SECRET) throw new Error('ICD11 client id/secret not configured')
  const basic = Buffer.from(`${ICD11_CLIENT_ID}:${ICD11_CLIENT_SECRET}`).toString('base64')
  const resp = await fetch(ICD11_TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams({ grant_type: 'client_credentials', scope: 'icdapi_access' }).toString()
  })
  if (!resp.ok) {
    const txt = await resp.text()
    throw new Error(`ICD11 token request failed: ${resp.status} ${txt}`)
  }
  const j = await resp.json() as { access_token?: string }
  if (!j.access_token) throw new Error('Resposta do token ICD11 sem access_token')
  return j.access_token
}

type JsonRecord = Record<string, unknown>

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null
}

function extractItems(json: unknown): JsonRecord[] {
  if (!json) return []
  if (Array.isArray(json)) return json.filter(isJsonRecord)
  if (!isJsonRecord(json)) return []

  const candidateKeys = ['items', 'entities', 'results', 'result'] as const
  for (const key of candidateKeys) {
    const value = json[key]
    if (Array.isArray(value)) {
      return value.filter(isJsonRecord)
    }
  }

  return []
}

function textFromField(field: unknown): string | undefined {
  if (!field) return undefined
  if (typeof field === 'string') return field
  // JSON-LD style multilingual fields sometimes appear as { 'en': 'text' }
  if (isJsonRecord(field)) {
    const fallback = Object.values(field).find((value) => typeof value === 'string')
    return field['en'] as string
      || field['en-US'] as string
      || field['en_GB'] as string
      || field['default'] as string
      || (typeof fallback === 'string' ? fallback : undefined)
  }
  return String(field)
}

interface Icd11NormalizedItem {
  code?: string
  title?: string
  description?: string
  parent?: string
}

function extractString(record: JsonRecord, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = record[key]
    if (!value) continue
    if (typeof value === 'string') return value
    const text = textFromField(value)
    if (text) return text
  }
  return undefined
}

function extractParentCode(value: unknown): string | undefined {
  if (!value) return undefined
  if (typeof value === 'string') return value
  if (Array.isArray(value)) {
    for (const entry of value) {
      const parent = extractParentCode(entry)
      if (parent) return parent
    }
    return undefined
  }
  if (isJsonRecord(value)) {
    return extractString(value, ['code', 'notation', 'id'])
  }
  return undefined
}

export const icd11WhoRealAdapter: ExternalFetchAdapter<Icd11NormalizedItem> = {
  name: 'ICD11-WHO-API',
  sourceType: 'ICD11',
  async version() {
    // Attempt to derive a release date/version from the API if available; fallback to ISO date
    return new Date().toISOString().slice(0, 10)
  },
  async fetchList() {
    // If client is not configured, return sample to avoid breaking dev flows
    if (!ICD11_CLIENT_ID || !ICD11_CLIENT_SECRET) {
      return [{ code: '1A00', title: 'Cholera', parent: undefined, description: 'Sample ICD11 (no credentials)' }]
    }

    const token = await requestToken()
    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'API-Version': 'v2',
      'Accept-Language': 'en'
    }

  const list: Icd11NormalizedItem[] = []
    const pageSize = 1000
    let offset = 0
    const maxPages = 200 // safety limit to avoid runaway loops

    // Two possible endpoints to try: a linearization release endpoint and the generic entity endpoint.
    // Try linearization (MMS) first; if it returns empty/404, fallback to entity endpoint.
    const tryEndpoints = [
      `${ICD11_API_BASE}/icd/release/11/mms`,
      `${ICD11_API_BASE}/icd/entity`
    ]

    for (const baseUrl of tryEndpoints) {
      offset = 0
      for (let page = 0; page < maxPages; page++) {
        const url = new URL(baseUrl)
        url.searchParams.set('limit', String(pageSize))
        url.searchParams.set('offset', String(offset))
        // Some installations may accept q=* to list all; harmless to include
        url.searchParams.set('q', '*')

  let resp: Awaited<ReturnType<typeof fetch>>
        try {
          resp = await fetch(url.toString(), { headers })
        } catch (err) {
          // network error for this endpoint — try next
          break
        }

        if (resp.status === 404) break
        if (!resp.ok) {
          // for non-OK responses try the next endpoint variant
          break
        }

        const json = await resp.json()
        const items = extractItems(json)
        if (!items || items.length === 0) {
          // try next page or endpoint
        }

        for (const it of items) {
          // Map a few common fields used by WHO ICD API responses
          const code = extractString(it, ['code', 'notation', 'id'])
          const title = extractString(it, ['title', 'display', 'prefLabel', 'label'])
          const description = extractString(it, ['definition', 'description', 'scopeNote', 'note'])
          // parent may be a code or a URI; try to extract a notation if present
          const parent = extractParentCode(it.parent || it.broader || it.parents)

          list.push({ code, title, description, parent })
        }

        if (items.length < pageSize) break
        offset += pageSize
      }

      if (list.length > 0) break
      // otherwise try next endpoint
    }

    // Deduplicate and filter out entries without codes
    const seen = new Set<string>()
    const filtered = list
      .map(x => ({ code: x.code, title: x.title, description: x.description, parent: x.parent }))
      .filter(x => x.code)
      .filter(x => {
        const normalized = String(x.code)
        if (seen.has(normalized)) return false
        seen.add(normalized)
        return true
      })

    return filtered
  },
  mapRecord(row) {
    if (!row.code || !row.title) {
      throw new Error('Registro ICD11 inválido sem código ou título')
    }
    return { code: row.code, display: row.title, description: row.description, parentCode: row.parent }
  }
}

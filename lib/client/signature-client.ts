/**
 * Lightweight client-side helper to fetch signature metadata with:
 * - deduplication of in-flight requests
 * - concurrency limit (semaphore)
 * - simple retry/backoff
 * - short-term caching
 */

type SigInfo = {
  signed: boolean
  valid?: boolean
  reason?: string | null
  signatureHash?: string | null
  verificationUrl?: string | null
  signedAt?: string | null
  signatureAlgorithm?: string | null
  isValid?: boolean | null
  validationResult?: string | null
  certificate?: any
}

const inFlight = new Map<string, Promise<SigInfo>>()
const cache = new Map<string, { ts: number; value: SigInfo }>()
const CACHE_TTL = 30 * 1000 // 30s

// semaphore
let active = 0
const MAX_CONCURRENT = 4
const queue: Array<() => void> = []
function acquire() {
  return new Promise<void>((resolve) => {
    if (active < MAX_CONCURRENT) {
      active++
      resolve()
      return
    }
    queue.push(() => {
      active++
      resolve()
    })
  })
}
function release() {
  active--
  const next = queue.shift()
  if (next) next()
}

async function fetchWithTimeout(url: string, opts: RequestInit = {}, timeoutMs = 4000) {
  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal })
    return res
  } finally {
    clearTimeout(id)
  }
}

export async function getSignatureInfo(documentType: string, id: string): Promise<SigInfo> {
  const key = `${documentType}:${id}`

  // cache
  const cached = cache.get(key)
  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.value
  }

  // dedupe
  if (inFlight.has(key)) return inFlight.get(key)!

  const promise = (async () => {
    await acquire()
    try {
      const url = `/api/${
        documentType === 'PRESCRIPTION' ? 'prescriptions' : documentType === 'REFERRAL' ? 'referrals' : documentType === 'EXAM_REQUEST' ? 'exam-requests' : 'medical-certificates'
      }/${encodeURIComponent(id)}/signature`

      // simple retry with small backoff
      let attempt = 0
      const maxAttempts = 2
      let lastErr: any = null

      while (attempt <= maxAttempts) {
        try {
          const res = await fetchWithTimeout(url, { method: 'GET' }, 3500)
          if (!res.ok) {
            // if 404 or 429 etc., throw to trigger backoff
            const body = await res.text().catch(() => '')
            throw new Error(`Status ${res.status} - ${body}`)
          }
          const data = await res.json()
          const info: SigInfo = {
            signed: !!data?.signed,
            valid: !!data?.valid,
            reason: data?.reason ?? null,
            signatureHash: data?.signatureHash ?? null,
            verificationUrl: data?.verificationUrl ?? null,
            signedAt: data?.signedAt ?? null,
            signatureAlgorithm: data?.signatureAlgorithm ?? null,
            isValid: data?.isValid ?? null,
            validationResult: data?.validationResult ?? null,
            certificate: data?.certificate ?? null,
          }
          cache.set(key, { ts: Date.now(), value: info })
          return info
        } catch (err) {
          lastErr = err
          attempt++
          // small jittered backoff
          if (attempt <= maxAttempts) await new Promise(r => setTimeout(r, 100 * Math.pow(2, attempt) + Math.random() * 50))
        }
      }

      throw lastErr
    } finally {
      release()
      inFlight.delete(key)
    }
  })()

  inFlight.set(key, promise)
  return promise
}

// Cached single-call for signature policy
let policyCache: { ts: number; value: any } | null = null
export async function getSignaturePolicyCached(ttlMs = 60_000) {
  if (policyCache && Date.now() - policyCache.ts < ttlMs) return policyCache.value
  const res = await fetch('/api/system/signature-policy')
  if (!res.ok) throw new Error('Failed to load signature policy')
  const json = await res.json()
  policyCache = { ts: Date.now(), value: json.policy }
  return json.policy
}

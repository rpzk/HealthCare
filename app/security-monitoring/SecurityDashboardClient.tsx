"use client"
import React, { useCallback, useEffect, useRef, useState } from 'react'
import type { AuditLogEntry, RedisCombinedStats, SecurityOverview } from './types'
import { extractAuditLogs, extractOverview, extractRedisStats } from './validation'

interface Props {
  initialOverview?: SecurityOverview | null
}

const INITIAL_INTERVAL_MS = 5000
const MAX_INTERVAL_MS = 60_000

export function SecurityDashboardClient({ initialOverview = null }: Props) {
  const [overview, setOverview] = useState<SecurityOverview | null>(initialOverview)
  const [redis, setRedis] = useState<RedisCombinedStats | null>(null)
  const [audit, setAudit] = useState<AuditLogEntry[]>([])
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef(INITIAL_INTERVAL_MS)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stoppedRef = useRef(false)

  const clearExistingTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const fetchAll = useCallback(async () => {
    try {
      const [ovRes, redisRes, auditRes] = await Promise.all([
        fetch('/api/admin/security?action=security-overview', { cache: 'no-store' }),
        fetch('/api/admin/security?action=redis-stats', { cache: 'no-store' }),
        fetch('/api/admin/security?action=audit-recent', { cache: 'no-store' })
      ])

      if (!ovRes.ok || !redisRes.ok || !auditRes.ok) {
        throw new Error(`HTTP fail: ov=${ovRes.status} redis=${redisRes.status} audit=${auditRes.status}`)
      }

      const [ovJson, redisJson, auditJson]: [unknown, unknown, unknown] = await Promise.all([
        ovRes.json(),
        redisRes.json(),
        auditRes.json()
      ])

  const overviewPayload = extractOverview(ovJson)
  const redisPayload = extractRedisStats(redisJson)
  const auditPayload = extractAuditLogs(auditJson)

      if (overviewPayload) setOverview(overviewPayload)
      if (redisPayload) setRedis(redisPayload)
      if (auditPayload) setAudit(auditPayload.logs)
      setError(null)
      intervalRef.current = INITIAL_INTERVAL_MS
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : String(caughtError)
      setError(message)
      intervalRef.current = Math.min(intervalRef.current * 2, MAX_INTERVAL_MS)
    } finally {
      if (!stoppedRef.current) {
        clearExistingTimer()
        timerRef.current = setTimeout(() => {
          void fetchAll()
        }, intervalRef.current)
      }
    }
  }, [clearExistingTimer])

  useEffect(() => {
    void fetchAll()
    return () => {
      stoppedRef.current = true
      clearExistingTimer()
    }
  }, [clearExistingTimer, fetchAll])

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Real‑time Updates</h2>
      {error && <div style={{ color: '#f87171', fontSize: 12 }}>Erro: {error} (intervalo atual {intervalRef.current / 1000}s)</div>}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        {redis && (
          <MiniCard
            label="Redis"
            value={redis.rateLimiter.redisConnected || redis.cache.redisConnected ? 'connected' : 'fallback'}
            color={(redis.rateLimiter.redisConnected || redis.cache.redisConnected) ? '#16a34a' : '#f59e0b'}
          />
        )}
        {redis && <MiniCard label="RL Users" value={String(redis.rateLimiter.activeUsers)} />}
        {redis && (
          <MiniCard
            label="RL Blocked"
            value={String(redis.rateLimiter.blockedUsers)}
            color={redis.rateLimiter.blockedUsers > 0 ? '#dc2626' : '#64748b'}
          />
        )}
        {redis && <MiniCard label="Cache Fallback" value={String(redis.cache.memoryFallbackEntries)} />}
        {overview && <MiniCard label="Reqs" value={String(overview.rateLimit.totalRequests)} />}
      </div>
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>Últimos Logs de Auditoria</h3>
        <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid #334155', borderRadius: 6, fontSize: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'ui-monospace, monospace' }}>
            <thead style={{ background: '#1e293b', position: 'sticky', top: 0 }}>
              <tr>
                {['Tempo', 'Ação', 'Recurso', 'Usuário', 'OK', 'Erro'].map((header) => (
                  <th
                    key={header}
                    style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #334155', fontWeight: 500, fontSize: 11, color: '#94a3b8' }}
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audit.slice(0, 50).map((log, index) => (
                <tr key={log.t + index} style={{ background: index % 2 ? '#0f172a' : '#0b1220' }}>
                  <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{log.t.split('T')[1]?.replace('Z', '') ?? log.t}</td>
                  <td style={{ padding: '4px 6px' }}>{log.action}</td>
                  <td style={{ padding: '4px 6px' }}>{log.resource}</td>
                  <td style={{ padding: '4px 6px' }}>{log.user}</td>
                  <td style={{ padding: '4px 6px', color: log.success ? '#16a34a' : '#dc2626' }}>{log.success ? '✔' : '✖'}</td>
                  <td style={{ padding: '4px 6px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.err ?? ''}</td>
                </tr>
              ))}
              {audit.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: 12, textAlign: 'center', color: '#64748b' }}>Sem logs ainda</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function MiniCard({ label, value, color = '#38bdf8' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ minWidth: 100, background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '0.6rem 0.75rem' }}>
      <div style={{ fontSize: 11, letterSpacing: 0.5, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color }}>{value}</div>
    </div>
  )
}

"use client";
import React, { useEffect, useRef, useState } from 'react';

interface DashboardData {
  overview?: any;
  redis?: any;
  auditRecent?: any[];
}

interface Props {
  initialOverview?: any;
}

// Simple exponential backoff poller with max interval
export function SecurityDashboardClient({ initialOverview }: Props) {
  const [overview, setOverview] = useState<any>(initialOverview);
  const [redis, setRedis] = useState<any>(null);
  const [audit, setAudit] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<number>(5000);
  const timerRef = useRef<any>(null);
  const stoppedRef = useRef(false);

  async function fetchAll() {
    try {
      const [ovRes, redisRes, auditRes] = await Promise.all([
        fetch('/api/admin/security?action=security-overview', { cache: 'no-store' }),
        fetch('/api/admin/security?action=redis-stats', { cache: 'no-store' }),
        fetch('/api/admin/security?action=audit-recent', { cache: 'no-store' })
      ]);

      if (!ovRes.ok || !redisRes.ok || !auditRes.ok) {
        throw new Error(`HTTP fail: ov=${ovRes.status} redis=${redisRes.status} audit=${auditRes.status}`);
      }

      const [ovJson, redisJson, auditJson] = await Promise.all([ovRes.json(), redisRes.json(), auditRes.json()]);
      setOverview(ovJson.overview);
      setRedis(redisJson.redis);
      setAudit(auditJson.logs || []);
      setError(null);
      intervalRef.current = 5000; // reset backoff on success
    } catch (e: any) {
      setError(e.message || String(e));
      intervalRef.current = Math.min(intervalRef.current * 2, 60000); // backoff
    } finally {
      schedule();
    }
  }

  function schedule() {
    if (stoppedRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(fetchAll, intervalRef.current);
  }

  useEffect(() => {
    fetchAll();
    return () => { stoppedRef.current = true; clearTimeout(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div style={{ marginTop: '2rem' }}>
      <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Real‑time Updates</h2>
      {error && <div style={{ color: '#f87171', fontSize: 12 }}>Erro: {error} (intervalo atual {intervalRef.current/1000}s)</div>}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
        {redis && (
          <MiniCard label="Redis" value={redis.rateLimiter?.redisConnected || redis.cache?.redisConnected ? 'connected' : 'fallback'} color={(redis.rateLimiter?.redisConnected || redis.cache?.redisConnected) ? '#16a34a' : '#f59e0b'} />
        )}
        {redis && <MiniCard label="RL Users" value={String(redis.rateLimiter?.activeUsers ?? 0)} />}
        {redis && <MiniCard label="RL Blocked" value={String(redis.rateLimiter?.blockedUsers ?? 0)} color={ (redis.rateLimiter?.blockedUsers ?? 0) > 0 ? '#dc2626' : '#64748b'} />}
        {redis && <MiniCard label="Cache Fallback" value={String(redis.cache?.memoryFallbackEntries ?? 0)} />}
        {overview && <MiniCard label="Reqs" value={String(overview.rateLimit?.totalRequests ?? 0)} />}
      </div>
      <div style={{ marginTop: '1.5rem' }}>
        <h3 style={{ fontSize: '1rem', marginBottom: 8 }}>Últimos Logs de Auditoria</h3>
        <div style={{ maxHeight: 240, overflow: 'auto', border: '1px solid #334155', borderRadius: 6, fontSize: 12 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: 'ui-monospace, monospace' }}>
            <thead style={{ background: '#1e293b', position: 'sticky', top: 0 }}>
              <tr>
                {['Tempo','Ação','Recurso','Usuário','OK','Erro'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '4px 6px', borderBottom: '1px solid #334155', fontWeight: 500, fontSize: 11, color: '#94a3b8' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {audit.slice(0,50).map((l,i) => (
                <tr key={i} style={{ background: i % 2 ? '#0f172a' : '#0b1220' }}>
                  <td style={{ padding: '4px 6px', whiteSpace: 'nowrap' }}>{l.t.split('T')[1].replace('Z','')}</td>
                  <td style={{ padding: '4px 6px' }}>{l.action}</td>
                  <td style={{ padding: '4px 6px' }}>{l.resource}</td>
                  <td style={{ padding: '4px 6px' }}>{l.user}</td>
                  <td style={{ padding: '4px 6px', color: l.success ? '#16a34a' : '#dc2626' }}>{l.success ? '✔' : '✖'}</td>
                  <td style={{ padding: '4px 6px', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.err || ''}</td>
                </tr>
              ))}
              {audit.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 12, textAlign: 'center', color: '#64748b' }}>Sem logs ainda</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function MiniCard({ label, value, color = '#38bdf8' }: { label: string; value: string; color?: string }) {
  return (
    <div style={{ minWidth: 100, background: '#1e293b', border: '1px solid #334155', borderRadius: 6, padding: '0.6rem 0.75rem' }}>
      <div style={{ fontSize: 11, letterSpacing: 0.5, color: '#94a3b8', textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 600, color }}>{value}</div>
    </div>
  )}

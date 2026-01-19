"use client";
import React, { useEffect } from 'react';

export default function SecurityMonitoringDashboardIsolation() {
  useEffect(() => {
    console.log('[SecurityMonitor-Isolation] Mounted');
    fetch('/api/admin/security?action=security-overview', { cache: 'no-store' })
      .then(r => r.json())
      .then(data => {
        // @ts-ignore
        window.__SECURITY_RAW = data;
        console.log('[SecurityMonitor-Isolation] API response', data);
      })
      .catch(e => console.error('[SecurityMonitor-Isolation] fetch error', e));
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>🛡️ Security Monitoring 2 (Isolation)</h1>
      <p>Nova rota isolada sem nenhum código antigo. URL: /security-monitoring2</p>
      <p>Se o erro ainda referenciar <code>systemHealth</code> nesta rota, a origem está em outro provider/global.</p>
    </div>
  );
}

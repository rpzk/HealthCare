"use client";
import React, { useEffect } from 'react';
import type { SecurityOverviewResponse } from '../security-monitoring/types';
import { isSecurityOverviewResponse } from '../security-monitoring/validation';

declare global {
  interface Window {
    __SECURITY_RAW?: unknown;
  }
}

export default function SecurityMonitoringDashboardIsolation() {
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function load() {
      console.log('[SecurityMonitor-Isolation] Mounted');
      try {
        const response = await fetch('/api/admin/security?action=security-overview', {
          cache: 'no-store',
          signal: controller.signal
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload: unknown = await response.json();
        if (cancelled) return;
        if (isSecurityOverviewResponse(payload)) {
          window.__SECURITY_RAW = payload;
          console.log('[SecurityMonitor-Isolation] API response (sanitized)', payload);
        } else {
          window.__SECURITY_RAW = null;
          console.warn('[SecurityMonitor-Isolation] Unexpected API shape', payload);
        }
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        console.error('[SecurityMonitor-Isolation] fetch error', error);
      }
    }

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>🛡️ Security Monitoring 2 (Isolation)</h1>
      <p>Nova rota isolada sem nenhum código antigo. URL: /security-monitoring2</p>
      <p>Se o erro ainda referenciar <code>systemHealth</code> nesta rota, a origem está em outro provider/global.</p>
    </div>
  );
}

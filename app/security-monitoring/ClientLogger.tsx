"use client";
import React from 'react'

export function ClientLogger({ data }: { data: any }) {
  const ranRef = React.useRef(false);
  React.useEffect(() => {
    // Evita double-run em StrictMode dev
    if (ranRef.current) return;
    ranRef.current = true;
    console.log('[SecurityMonitor-Minimal] Mounted (ClientLogger)');
    if (data) {
      // @ts-ignore
      window.__SECURITY_RAW = data;
      console.log('[SecurityMonitor-Minimal] API response', data);
    }
  }, [data]);
  return null;
}

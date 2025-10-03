"use client"
import React from 'react'
import type { SecurityOverviewResponse } from './types'

interface ClientLoggerProps {
  data: SecurityOverviewResponse | null
}

declare global {
  interface Window {
    __SECURITY_RAW?: SecurityOverviewResponse | null
  }
}

export function ClientLogger({ data }: ClientLoggerProps) {
  const ranRef = React.useRef(false)
  React.useEffect(() => {
    if (ranRef.current) return
    ranRef.current = true
    console.log('[SecurityMonitor-Minimal] Mounted (ClientLogger)')
    if (data) {
      window.__SECURITY_RAW = data
      console.log('[SecurityMonitor-Minimal] API response', data)
    }
  }, [data])
  return null
}

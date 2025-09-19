'use client'
import React from 'react'

interface Props { children: React.ReactNode; fallback?: React.ReactNode }
export function HydrationGuard({ children, fallback = null }: Props) {
  const [ready, setReady] = React.useState(false)
  React.useEffect(() => { setReady(true) }, [])
  if (!ready) return <>{fallback}</>
  return <>{children}</>
}

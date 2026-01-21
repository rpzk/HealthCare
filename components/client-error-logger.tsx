'use client'
import { useEffect } from 'react'
import { logger } from '@/lib/logger'

export function ClientErrorLogger() {
  useEffect(() => {
    function onError(ev: ErrorEvent) {
      logger.error('[GlobalClientError]', ev.message, ev.error?.stack)
    }
    function onRejection(ev: PromiseRejectionEvent) {
      logger.error('[GlobalUnhandledRejection]', ev.reason)
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    // Instrument proxy for any object that looks like pagination
    const origDefine = Object.defineProperty
    try {
      (Object as any).defineProperty = function(obj: any, prop: string | symbol, desc: PropertyDescriptor) {
        if(prop === 'pages' && typeof desc?.get === 'function') {
          const originalGet = desc.get
          desc.get = function(...args: any[]) {
            const stack = new Error().stack?.split('\n').slice(0,8).join(' | ')
            // attaching diagnostic info for debugging in dev only
            ;(window as any).__LAST_PAGES_STACK = stack
            return (originalGet as any).call(this)
          }
        }
        return origDefine(obj, prop, desc)
      }
    } catch(e) {
      logger.warn('[Instrument] unable to wrap defineProperty', e)
    }
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      Object.defineProperty = origDefine
    }
  }, [])
  return null
}

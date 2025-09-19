'use client'
import { useEffect } from 'react'

export function ClientErrorLogger() {
  useEffect(() => {
    function onError(ev: ErrorEvent) {
      console.error('[GlobalClientError]', ev.message, ev.error?.stack)
    }
    function onRejection(ev: PromiseRejectionEvent) {
      console.error('[GlobalUnhandledRejection]', ev.reason)
    }
    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    // Instrument proxy for any object that looks like pagination
    const origDefine = Object.defineProperty
    try {
      Object.defineProperty = function(obj: any, prop: string | symbol, desc: any) {
        if(prop === 'pages' && typeof desc?.get === 'function') {
          const originalGet = desc.get
          desc.get = function(...args: any[]) {
            const stack = new Error().stack?.split('\n').slice(0,8).join(' | ')
            // @ts-expect-error - attaching diagnostic info for debugging in dev only
            window.__LAST_PAGES_STACK = stack
            return originalGet.apply(this, args as any)
          }
        }
        return origDefine(obj, prop, desc)
      }
    } catch(e) {
      console.warn('[Instrument] unable to wrap defineProperty', e)
    }
    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
      Object.defineProperty = origDefine
    }
  }, [])
  return null
}

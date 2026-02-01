'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'

interface UseAutoPrintOptions {
  /** Whether the component is ready (data loaded, etc.) */
  isReady: boolean
  /** Optional condition that must be true to allow printing */
  canPrint?: boolean
  /** Callback executed after print dialog opens */
  onPrint?: () => void
}

/**
 * Hook to auto-trigger print when ?print=1 is in URL
 * Opens print dialog automatically when data is ready
 */
export function useAutoPrint({ isReady, canPrint = true, onPrint }: UseAutoPrintOptions) {
  const searchParams = useSearchParams()
  const shouldPrint = searchParams?.get('print') === '1'

  useEffect(() => {
    if (shouldPrint && isReady && canPrint) {
      // Small delay to ensure DOM is fully rendered
      const timer = setTimeout(() => {
        window.print()
        onPrint?.()
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [shouldPrint, isReady, canPrint, onPrint])

  return { shouldPrint }
}

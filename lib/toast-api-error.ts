'use client'

import { toast } from 'sonner'

type Resolution = {
  label?: string
  href: string
}

function getCurrentPathWithSearch() {
  if (typeof window === 'undefined') return '/'
  return `${window.location.pathname}${window.location.search}`
}

function safeSameOriginPath(input: string): string {
  // Only allow same-origin relative paths.
  if (!input) return '/'
  if (input.startsWith('/')) return input
  try {
    const url = new URL(input)
    if (typeof window !== 'undefined' && url.origin === window.location.origin) {
      return url.pathname + url.search + url.hash
    }
  } catch {
    // ignore
  }
  return '/'
}

function buildTermsAcceptHref(termIds?: string[]) {
  const returnTo = getCurrentPathWithSearch()
  const params = new URLSearchParams()
  params.set('returnTo', returnTo)
  if (termIds && termIds.length > 0) {
    params.set('ids', termIds.join(','))
  }
  return `/terms/accept?${params.toString()}`
}

export function toastApiError(
  data: unknown,
  fallbackMessage = 'Erro ao processar a solicitação'
) {
  const obj = (data && typeof data === 'object') ? (data as Record<string, any>) : null

  const message =
    (obj && typeof obj.error === 'string' && obj.error.trim())
      ? obj.error
      : fallbackMessage

  let resolution: Resolution | null = null

  const code = obj?.code

  if (code === 'TERMS_NOT_ACCEPTED') {
    const missing = Array.isArray(obj?.missing) ? obj.missing : []
    const termIds = missing
      .map((t: any) => (t && typeof t.id === 'string' ? t.id : null))
      .filter(Boolean) as string[]

    resolution = {
      label: 'Resolver',
      href: buildTermsAcceptHref(termIds),
    }
  } else if (code === 'TERMS_NOT_CONFIGURED') {
    resolution = {
      label: 'Resolver',
      href: '/admin/terms',
    }
  } else if (obj?.resolution && typeof obj.resolution === 'object' && typeof obj.resolution.href === 'string') {
    resolution = {
      label: typeof obj.resolution.label === 'string' ? obj.resolution.label : 'Resolver',
      href: safeSameOriginPath(obj.resolution.href),
    }
  }

  if (!resolution) {
    toast.error(message)
    return
  }

  const go = () => {
    const href = safeSameOriginPath(resolution.href)
    window.location.href = href
  }

  // Sonner supports clickable actions; we also attach onClick so clicking the toast navigates.
  toast.error(message, {
    action: {
      label: resolution.label || 'Resolver',
      onClick: go,
    },
    onClick: go,
  } as any)
}

import * as React from 'react'
import { toast as sonnerToast } from 'sonner'

export type ToastProps = {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

type ToastType = 'success' | 'error' | 'info' | 'warning'

const toastContext = React.createContext<{ 
  toast: (props: ToastProps) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
  warning: (title: string, description?: string) => void
} | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const showToast = (type: ToastType, title: string, description?: string) => {
    const message = title || description || ''
    const desc = title && description ? description : undefined

    switch (type) {
      case 'success':
        sonnerToast.success(message, { description: desc })
        break
      case 'error':
        sonnerToast.error(message, { description: desc })
        break
      case 'warning':
        sonnerToast.warning(message, { description: desc })
        break
      case 'info':
        sonnerToast.info(message, { description: desc })
        break
    }
  }

  const toast = (props: ToastProps) => {
    const type = props.variant === 'destructive' ? 'error' : 'success'
    showToast(type, props.title, props.description)
  }

  const value = {
    toast,
    success: (title: string, description?: string) => showToast('success', title, description),
    error: (title: string, description?: string) => showToast('error', title, description),
    info: (title: string, description?: string) => showToast('info', title, description),
    warning: (title: string, description?: string) => showToast('warning', title, description),
  }

  return React.createElement(toastContext.Provider, { value }, children)
}

export function useToast() {
  const context = React.useContext(toastContext)
  // Fallback gracefully if provider is not mounted
  if (!context) {
    const shim = (props: ToastProps) => {
      const type = props.variant === 'destructive' ? 'error' : 'success'
      const message = props.title || props.description || ''
      const desc = props.title && props.description ? props.description : undefined
      switch (type) {
        case 'error':
          sonnerToast.error(message, { description: desc })
          break
        default:
          sonnerToast.success(message, { description: desc })
      }
    }
    return {
      toast: shim,
      success: (t: string, d?: string) => sonnerToast.success(t, { description: d }),
      error: (t: string, d?: string) => sonnerToast.error(t, { description: d }),
      info: (t: string, d?: string) => sonnerToast.info(t, { description: d }),
      warning: (t: string, d?: string) => sonnerToast.warning(t, { description: d }),
    }
  }
  return context
}

// Backwards-compatible export: accepts either object props or (type, title, description)
export const toast = (
  arg1: ToastProps | ToastType,
  title?: string,
  description?: string
) => {
  if (typeof arg1 === 'string') {
    const type = arg1 as ToastType
    switch (type) {
      case 'success':
        sonnerToast.success(title || '', { description })
        break
      case 'error':
        sonnerToast.error(title || '', { description })
        break
      case 'warning':
        sonnerToast.warning(title || '', { description })
        break
      case 'info':
        sonnerToast.info(title || '', { description })
        break
    }
    return
  }
  const props = arg1 as ToastProps
  const type = props.variant === 'destructive' ? 'error' : 'success'
  const message = props.title || props.description || ''
  const desc = props.title && props.description ? props.description : undefined
  if (type === 'error') {
    sonnerToast.error(message, { description: desc })
  } else {
    sonnerToast.success(message, { description: desc })
  }
}

export default null
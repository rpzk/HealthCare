import * as React from 'react'

export type ToastProps = {
  title: string
  description?: string
  variant?: 'default' | 'destructive'
}

const toastContext = React.createContext<{ toast: (props: ToastProps) => void } | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = (props: ToastProps) => {
    try {
      if (typeof window !== 'undefined') {
        // eslint-disable-next-line no-alert
        alert(`${props.title}${props.description ? ': ' + props.description : ''}`)
      } else {
        console.log('Toast:', props)
      }
    } catch (e) {
      console.log('toast fallback:', props)
    }
  }

  return React.createElement(toastContext.Provider, { value: { toast } }, children)
}

export function useToast() {
  const context = React.useContext(toastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}

export const toast = (props: ToastProps) => {
  try {
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-alert
      alert(`${props.title}${props.description ? ': ' + props.description : ''}`)
    } else {
      console.log('Toast:', props)
    }
  } catch (e) {
    console.log('toast error', e, props)
  }
}

export default null
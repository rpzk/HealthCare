import * as React from "react"

type ToastProps = {
  title: string
  description?: string
  variant?: "default" | "destructive"
}

const toastContext = React.createContext<{
  toast: (props: ToastProps) => void
}>({
  toast: () => {}
})

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const toast = (props: ToastProps) => {
    // Implementação simples do toast usando alert temporariamente
    // Em produção, você usaria uma biblioteca de toast como react-hot-toast
    alert(`${props.title}: ${props.description || ''}`)
  }

  return (
    <toastContext.Provider value={{ toast }}>
      {children}
    </toastContext.Provider>
  )
}

export function useToast() {
  const context = React.useContext(toastContext)
  if (!context) {
    throw new Error('useToast deve ser usado dentro de um ToastProvider')
  }
  return context
}

export const toast = (props: ToastProps) => {
  // Implementação simples - substituir por uma biblioteca de toast real
  console.log(`Toast: ${props.title} - ${props.description}`)
  // Use in-browser alert as a minimal feedback mechanism for now
  try {
    alert(`${props.title}${props.description ? ': ' + props.description : ''}`)
  } catch (e) {
    // In non-browser environments just log
    console.log('toast:', props)
  }
}

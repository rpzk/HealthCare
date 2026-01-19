// Função simples de notificação para substituir toast
export const toast = (props: {
  title: string
  description?: string
  variant?: "default" | "destructive"
}) => {
  console.log(`${props.title}: ${props.description || ''}`)
  // Notificação visual simples - em produção usar biblioteca de toast
  if (typeof window !== 'undefined') {
    alert(`${props.title}${props.description ? ': ' + props.description : ''}`)
  }
}

export const useToast = () => {
  return { toast }
}
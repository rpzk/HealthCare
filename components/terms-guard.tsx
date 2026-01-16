'use client'

import { useTermsEnforcement } from '@/hooks/use-terms-enforcement'

/**
 * Componente que força a verificação de termos pendentes
 * Deve ser usado nos layouts principais
 */
export function TermsGuard({ children }: { children: React.ReactNode }) {
  const { checking } = useTermsEnforcement()

  // Enquanto verifica, mostra os children normalmente
  // (o hook fará o redirect se necessário)
  if (checking) {
    return <>{children}</>
  }

  return <>{children}</>
}

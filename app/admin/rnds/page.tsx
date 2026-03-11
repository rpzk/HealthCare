'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Cloud, Info } from 'lucide-react'
import Link from 'next/link'

/**
 * RNDS (Rede Nacional de Dados em Saúde) — Funcionalidade em desenvolvimento futuro
 * Foco atual: clínicas particulares e atendimento médico individual
 */
export default function RNDSPlaceholderPage() {
  return (
    <div className="p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-6 w-6" />
            RNDS — Rede Nacional de Dados em Saúde
          </CardTitle>
          <CardDescription>
            Integração com a plataforma nacional do Ministério da Saúde
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Esta funcionalidade está planejada para uma versão futura. O foco atual do sistema
              é <strong>clínicas particulares</strong> e <strong>atendimento médico individual</strong>.
              <br />
              <br />
              A integração RNDS pode ser reativada quando houver demanda para interoperabilidade
              com a rede pública de saúde.
            </AlertDescription>
          </Alert>
          <p className="text-sm text-muted-foreground">
            <Link href="/admin" className="text-primary hover:underline">
              ← Voltar ao painel administrativo
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

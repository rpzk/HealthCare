'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Cloud, Info } from 'lucide-react'
import Link from 'next/link'

/**
 * e-SUS AB — Funcionalidade em desenvolvimento futuro
 * Foco atual: clínicas particulares e atendimento médico individual
 */
export default function ESUSPlaceholderPage() {
  return (
    <div className="p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Cloud className="h-6 w-6" />
            e-SUS Atenção Básica
          </CardTitle>
          <CardDescription>
            Integração com o sistema do Ministério da Saúde para UBS e Atenção Primária
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
              A integração e-SUS AB (fichas CDS, exportação para PEC) pode ser reativada quando
              houver demanda para atendimento em Unidades Básicas de Saúde.
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

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata = {
  title: 'Relatórios SUS - SIAB',
  description: 'Visualize e gere relatórios de produção SUS',
}

export default function SUSReportsPage() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Relatórios SUS - SIAB
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Visualize e gere relatórios de produção conforme exigências do SUS
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Módulo em Desenvolvimento</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-400">
                O módulo de Relatórios SUS está em desenvolvimento. Schema Prisma migrado com sucesso e APIs criadas.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <li>✅ 8 modelos Prisma criados</li>
                <li>✅ Migração de banco de dados aplicada</li>
                <li>✅ Serviço de geração de relatórios implementado</li>
                <li>✅ 3 endpoints de API criados</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

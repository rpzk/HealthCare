import React from 'react'
import { prisma } from '@/lib/prisma'
import { PageHeader } from '@/components/navigation/page-header'
import { RefreshButton } from '@/components/navigation/refresh-button'

export default async function AuditPage() {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs de Auditoria"
        description={`Últimos ${logs.length} logs de auditoria do sistema`}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: 'Administração', href: '/admin' },
          { label: 'Auditoria', href: '/admin/audit' }
        ]}
        actions={<RefreshButton />}
      />

      <div className="space-y-4">
        <div className="overflow-x-auto border rounded bg-card">
          <table className="min-w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="p-2 text-left">Tempo</th>
                <th className="p-2 text-left">Usuário</th>
                <th className="p-2 text-left">Ação</th>
                <th className="p-2 text-left">Recurso</th>
                <th className="p-2 text-left">Sucesso</th>
                <th className="p-2 text-left">Detalhes</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((l: any) => (
                <tr key={l.id} className="border-t">
                  <td className="p-2 whitespace-nowrap">{new Date(l.createdAt).toLocaleString()}</td>
                  <td className="p-2">{l.userEmail}</td>
                  <td className="p-2">{l.action}</td>
                  <td className="p-2">{l.resource}{l.resourceId ? `:${l.resourceId}` : ''}</td>
                  <td className="p-2">{l.success ? '✅' : '❌'}</td>
                  <td className="p-2 max-w-xs truncate" title={l.details}>{l.details?.slice(0,80)}</td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={6} className="p-4 text-center text-muted-foreground">Sem logs.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">SSR secure. Iteração futura: filtros, auto-refresh.</p>
      </div>
    </div>
  )
}

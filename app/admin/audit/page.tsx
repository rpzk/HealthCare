import React from 'react'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export default async function AuditPage() {
  const session = await getServerSession(authOptions as any)
  const s: any = session
  if (!s || s?.user?.role !== 'ADMIN') {
    return <div className="p-6"><h1 className="text-xl font-semibold">Acesso negado</h1><p className="text-sm text-gray-500">Esta área é restrita a administradores.</p></div>
  }

  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Audit Logs (últimos {logs.length})</h1>
      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 dark:bg-gray-800">
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
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">Sem logs.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">SSR secure. Iteração futura: filtros, auto-refresh.</p>
    </div>
  )
}

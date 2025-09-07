import React from 'react'

async function fetchLogs() {
  try {
    const res = await fetch(process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/audit/logs?limit=50` : 'http://localhost:3000/api/audit/logs?limit=50', {
      // SSR lado do servidor sem credencial: endpoint exige admin; placeholder
      cache: 'no-store'
    })
    if (!res.ok) return []
    const data = await res.json()
    return data.logs || []
  } catch {
    return []
  }
}

export default async function AuditPage() {
  const logs = await fetchLogs()
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
              <tr><td colSpan={6} className="p-4 text-center text-gray-500">Sem logs ou acesso negado.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-gray-500">Atualização apenas no load. Adicionar SWR/refresh em iteração futura.</p>
    </div>
  )
}

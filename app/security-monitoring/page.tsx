import React from 'react';
import { headers, cookies } from 'next/headers'
import { ClientLogger } from './ClientLogger'
import { SecurityDashboardClient } from './SecurityDashboardClient'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, Shield, Users, Activity, ListChecks } from 'lucide-react'

// Server Component settings
export const dynamic = 'force-dynamic';
export const revalidate = 0;

type FetchResult = { data: any; error: string | null; status: number }

async function fetchSecurityOverview(): Promise<FetchResult> {
  const hdrs = headers();
  const host = hdrs.get('host') || 'localhost:3000';
  const proto = hdrs.get('x-forwarded-proto') || 'http';
  const base = `${proto}://${host}`;
  const url = `${base}/api/admin/security?action=security-overview`;
  try {
    const cookieHeader = cookies().toString();
    const res = await fetch(url, {
      headers: { cookie: cookieHeader },
      cache: 'no-store'
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('[SecurityMonitoring][fetch] Falha', res.status, text);
      return { data: null, error: `Status ${res.status}: ${text.slice(0,400)}`, status: res.status };
    }
    const json = await res.json();
    return { data: json, error: null, status: res.status };
  } catch (e:any) {
    console.error('[SecurityMonitoring][fetch] Exceção', e);
    return { data: null, error: e.message || String(e), status: 0 };
  }
}

export default async function SecurityMonitoringDashboard() {
  const result = await fetchSecurityOverview();
  const overview = result.data?.overview
  const health = overview?.systemHealth === 'healthy' ? 'Saudável' : (overview?.systemHealth || 'N/A')
  const reqs = String(overview?.rateLimit?.totalRequests ?? 0)
  const clients = String(overview?.rateLimit?.totalClients ?? 0)
  const blocked = String(overview?.rateLimit?.blockedClients ?? 0)
  const audits1h = String(overview?.audit?.lastHour ?? 0)
  const auditErrors = String(overview?.audit?.errors ?? 0)

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <PageHeader
            title="Monitoramento de Segurança"
            description="Visão em tempo real de limites, auditoria e integridade do sistema"
            breadcrumbs={[{ label: 'Segurança' }, { label: 'Monitoramento' }]}
            showBackButton={false}
          />

          {result.error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded p-3 mb-4 text-sm">
              <strong>Erro ao obter overview:</strong> {result.error}
            </div>
          )}

          {/* Métricas rápidas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Saúde</p>
                    <p className={`text-xl font-semibold ${overview?.systemHealth === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>{health}</p>
                  </div>
                  <Shield className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Requisições</p>
                    <p className="text-xl font-semibold">{reqs}</p>
                  </div>
                  <Activity className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Clientes</p>
                    <p className="text-xl font-semibold">{clients}</p>
                  </div>
                  <Users className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Bloqueados</p>
                    <p className={`text-xl font-semibold ${Number(blocked) > 0 ? 'text-red-600' : 'text-gray-900'}`}>{blocked}</p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Auditorias (1h)</p>
                    <p className="text-xl font-semibold">{audits1h}</p>
                  </div>
                  <ListChecks className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Erros de Auditoria</p>
                    <p className={`text-xl font-semibold ${Number(auditErrors) > 0 ? 'text-red-600' : 'text-green-600'}`}>{auditErrors}</p>
                  </div>
                  <AlertTriangle className="h-5 w-5 text-gray-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Atualizações em tempo real e detalhes */}
          <div className="grid grid-cols-1 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Atualizações em Tempo Real</CardTitle>
              </CardHeader>
              <CardContent>
                <SecurityDashboardClient initialOverview={overview} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Detalhes (JSON)</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="text-xs bg-black text-green-400 p-3 rounded overflow-x-auto">
{JSON.stringify(result.data, null, 2) || 'Nenhum dado'}
                </pre>
              </CardContent>
            </Card>
          </div>

          <ClientLogger data={result.data} />
        </main>
      </div>
    </div>
  );
}
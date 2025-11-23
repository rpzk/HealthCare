"use client"

import { useEffect, useState } from "react"
import { Header } from "@/components/layout/header"
import { Sidebar } from "@/components/layout/sidebar"
import { PageHeader } from "@/components/navigation/page-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ProductivityChart } from "@/components/bi/productivity-chart"
import { RiskChart } from "@/components/bi/risk-chart"
import { Users, Activity, Calendar, UserCheck } from "lucide-react"

export default function BIPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/bi')
      .then(res => res.json())
      .then(data => {
        setData(data)
        setLoading(false)
      })
      .catch(err => {
        console.error(err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex pt-16">
          <Sidebar />
          <main className="flex-1 ml-64 p-6 flex items-center justify-center">
            <p>Carregando dados de inteligência...</p>
          </main>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <PageHeader
            title="Gestão & BI"
            description="Painel de Inteligência de Negócios e Saúde Populacional"
            breadcrumbs={[{ label: 'Admin' }, { label: 'BI' }]}
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Pacientes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.metrics?.totalPatients || 0}</div>
                <p className="text-xs text-muted-foreground">Cadastrados no sistema</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Consultas (Mês)</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.metrics?.consultationsThisMonth || 0}</div>
                <p className="text-xs text-muted-foreground">Realizadas este mês</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Corpo Clínico</CardTitle>
                <UserCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.metrics?.totalDoctors || 0}</div>
                <p className="text-xs text-muted-foreground">Médicos ativos</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Histórico</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.metrics?.totalConsultations || 0}</div>
                <p className="text-xs text-muted-foreground">Consultas desde o início</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <div className="col-span-4">
              <ProductivityChart data={data?.consultationHistory || []} />
            </div>
            <div className="col-span-3">
              <RiskChart data={data?.riskDistribution || []} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

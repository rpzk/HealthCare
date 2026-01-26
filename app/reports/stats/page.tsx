'use client'

import { useEffect, useState } from 'react'
import type { ChangeEvent } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, ArrowLeft, Users, Stethoscope, TestTube, FileText, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'

type StatsTimeRange = '7days' | '30days' | '90days' | '1year'

interface StatsData {
  totalPatients: number
  patientsInPeriod: number
  totalConsultations: number
  consultationsInPeriod: number
  totalExams: number
  examsInPeriod: number
  totalRecords: number
  recordsInPeriod: number
  periodStart: string | null
  periodEnd: string | null
}

const emptyStats: StatsData = {
  totalPatients: 0,
  patientsInPeriod: 0,
  totalConsultations: 0,
  consultationsInPeriod: 0,
  totalExams: 0,
  examsInPeriod: 0,
  totalRecords: 0,
  recordsInPeriod: 0,
  periodStart: null,
  periodEnd: null,
}

export default function StatsPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [timeRange, setTimeRange] = useState<StatsTimeRange>('30days')
  const [statsData, setStatsData] = useState<StatsData>(emptyStats)

  useEffect(() => {
    const fetchStatistics = async () => {
      setLoading(true)
      try {
        const response = await fetch(`/api/reports/stats?range=${timeRange}`)
        if (!response.ok) return
        const data = await response.json()

        setStatsData({
          totalPatients: data.totalPatients || 0,
          patientsInPeriod: data.newPatientsInPeriod ?? data.newPatientsThisMonth ?? 0,
          totalConsultations: data.totalConsultations || 0,
          consultationsInPeriod: data.consultationsInPeriod ?? data.consultationsThisMonth ?? 0,
          totalExams: data.totalExams || 0,
          examsInPeriod: data.examsInPeriod ?? data.examsThisMonth ?? 0,
          totalRecords: data.totalRecords || 0,
          recordsInPeriod: data.recordsInPeriod ?? data.recordsThisMonth ?? 0,
          periodStart: data.periodStart ?? null,
          periodEnd: data.periodEnd ?? null,
        })
      } catch (error) {
        console.error('Failed to fetch statistics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStatistics()
  }, [timeRange])

  const timeRangeOptions: Array<{ value: StatsTimeRange; label: string }> = [
    { value: '7days', label: 'Últimos 7 dias' },
    { value: '30days', label: 'Últimos 30 dias' },
    { value: '90days', label: 'Últimos 3 meses' },
    { value: '1year', label: 'Último ano' }
  ]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  const periodLabel = statsData.periodStart && statsData.periodEnd
    ? `${new Date(statsData.periodStart).toLocaleDateString('pt-BR')} – ${new Date(statsData.periodEnd).toLocaleDateString('pt-BR')}`
    : null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            onClick={() => router.back()}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar</span>
          </Button>
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BarChart3 className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Estatísticas</h1>
              <p className="text-sm text-gray-500">Dados do banco (sem placeholders)</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(event: ChangeEvent<HTMLSelectElement>) => setTimeRange(event.target.value as StatsTimeRange)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {timeRangeOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
      </div>

      {periodLabel ? (
        <div className="text-sm text-muted-foreground">
          Período selecionado: <span className="font-medium text-foreground">{periodLabel}</span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Resumo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-blue-700">Pacientes</p>
                <Users className="h-4 w-4 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{statsData.totalPatients}</p>
              <p className="text-xs text-blue-700">{statsData.patientsInPeriod} no período</p>
            </div>

            <div className="bg-purple-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-purple-700">Consultas</p>
                <Stethoscope className="h-4 w-4 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-900">{statsData.totalConsultations}</p>
              <p className="text-xs text-purple-700">{statsData.consultationsInPeriod} no período</p>
            </div>

            <div className="bg-green-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-green-700">Exames</p>
                <TestTube className="h-4 w-4 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">{statsData.totalExams}</p>
              <p className="text-xs text-green-700">{statsData.examsInPeriod} no período</p>
            </div>

            <div className="bg-orange-50 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-orange-700">Registros</p>
                <FileText className="h-4 w-4 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-900">{statsData.totalRecords}</p>
              <p className="text-xs text-orange-700">{statsData.recordsInPeriod} no período</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Ações Rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Button
          variant="outline"
          onClick={() => router.push('/reports/dashboard')}
          className="h-auto p-4"
        >
          <div className="text-left">
            <BarChart3 className="h-6 w-6 text-indigo-600 mb-2" />
            <p className="font-medium">Dashboard Executivo</p>
            <p className="text-xs text-gray-500">Visão geral dos indicadores</p>
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={() => router.push('/reports/export')}
          className="h-auto p-4"
        >
          <div className="text-left">
            <TrendingUp className="h-6 w-6 text-green-600 mb-2" />
            <p className="font-medium">Exportar Relatórios</p>
            <p className="text-xs text-gray-500">Gerar arquivos personalizados</p>
          </div>
        </Button>

        <Button
          variant="outline"
          onClick={() => router.push('/reports')}
          className="h-auto p-4"
        >
          <div className="text-left">
            <Users className="h-6 w-6 text-blue-600 mb-2" />
            <p className="font-medium">Todos os Relatórios</p>
            <p className="text-xs text-gray-500">Voltar ao menu principal</p>
          </div>
        </Button>
      </div>
    </div>
  )
}

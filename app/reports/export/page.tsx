'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { 
  FileText, 
  ArrowLeft, 
  Download, 
  Calendar, 
  Users, 
  Activity, 
  Target,
  Mail,
  FileSpreadsheet,
  FileBarChart,
  FileImage,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function ExportPage() {
  const router = useRouter()
  const [selectedReports, setSelectedReports] = useState<string[]>([])
  const [exportFormat, setExportFormat] = useState('pdf')
  const [dateRange, setDateRange] = useState('30days')
  const [customSettings, setCustomSettings] = useState({
    includeCharts: true,
    includeSummary: true,
    includeRawData: false,
    emailDelivery: false,
    email: '',
    customTitle: '',
    notes: ''
  })
  const [exportHistory, setExportHistory] = useState<any[]>([])
  const [isExporting, setIsExporting] = useState(false)

  const reportTypes = [
    {
      id: 'patients',
      name: 'Relatório de Pacientes',
      description: 'Dados demográficos, cadastros e estatísticas',
      icon: Users,
      color: 'blue',
      estimatedSize: '2.5 MB'
    },
    {
      id: 'consultations',
      name: 'Relatório de Consultas',
      description: 'Agendamentos, status e análise de produtividade',
      icon: Activity,
      color: 'purple',
      estimatedSize: '4.1 MB'
    },
    {
      id: 'exams',
      name: 'Relatório de Exames',
      description: 'Solicitações, resultados e tempo de processamento',
      icon: Target,
      color: 'green',
      estimatedSize: '3.8 MB'
    },
    {
      id: 'financial',
      name: 'Relatório Financeiro',
      description: 'Receitas, custos e análise de rentabilidade',
      icon: FileBarChart,
      color: 'emerald',
      estimatedSize: '1.9 MB'
    },
    {
      id: 'performance',
      name: 'Relatório de Performance',
      description: 'KPIs, métricas e indicadores de qualidade',
      icon: FileImage,
      color: 'indigo',
      estimatedSize: '2.2 MB'
    },
    {
      id: 'complete',
      name: 'Relatório Completo',
      description: 'Todos os dados consolidados em um único arquivo',
      icon: FileText,
      color: 'orange',
      estimatedSize: '12.5 MB'
    }
  ]

  const exportFormats = [
    { value: 'pdf', label: 'PDF', icon: FileText, description: 'Formato universal, ideal para compartilhamento' },
    { value: 'excel', label: 'Excel', icon: FileSpreadsheet, description: 'Planilha editável com dados detalhados' },
    { value: 'csv', label: 'CSV', icon: FileBarChart, description: 'Dados tabulares para análise' },
    { value: 'json', label: 'JSON', icon: FileText, description: 'Dados estruturados para integração' }
  ]

  const dateRangeOptions = [
    { value: '7days', label: 'Últimos 7 dias' },
    { value: '30days', label: 'Últimos 30 dias' },
    { value: '90days', label: 'Últimos 3 meses' },
    { value: '6months', label: 'Últimos 6 meses' },
    { value: '1year', label: 'Último ano' },
    { value: 'custom', label: 'Período personalizado' }
  ]

  useEffect(() => {
    // Simular histórico de exportações
    setExportHistory([
      {
        id: 1,
        name: 'Relatório Completo - Janeiro 2025',
        type: 'complete',
        format: 'pdf',
        date: '2025-01-20',
        status: 'completed',
        size: '12.5 MB',
        downloads: 3
      },
      {
        id: 2,
        name: 'Consultas - Últimos 30 dias',
        type: 'consultations',
        format: 'excel',
        date: '2025-01-18',
        status: 'completed',
        size: '4.1 MB',
        downloads: 1
      },
      {
        id: 3,
        name: 'Dados Pacientes - Trimestre',
        type: 'patients',
        format: 'csv',
        date: '2025-01-15',
        status: 'processing',
        size: '2.5 MB',
        downloads: 0
      }
    ])
  }, [])

  const handleReportSelection = (reportId: string) => {
    setSelectedReports(prev => 
      prev.includes(reportId) 
        ? prev.filter(id => id !== reportId)
        : [...prev, reportId]
    )
  }

  const handleExport = async () => {
    if (selectedReports.length === 0) {
      alert('Selecione pelo menos um relatório para exportar')
      return
    }

    setIsExporting(true)
    
    // Simular processo de exportação
    setTimeout(() => {
      const newExport = {
        id: Date.now(),
        name: `${selectedReports.length > 1 ? 'Relatórios Múltiplos' : reportTypes.find(r => r.id === selectedReports[0])?.name} - ${new Date().toLocaleDateString('pt-BR')}`,
        type: selectedReports.length > 1 ? 'multiple' : selectedReports[0],
        format: exportFormat,
        date: new Date().toISOString().split('T')[0],
        status: 'completed',
        size: '5.2 MB',
        downloads: 0
      }

      setExportHistory(prev => [newExport, ...prev])
      setIsExporting(false)
      
      if (customSettings.emailDelivery && customSettings.email) {
        alert(`Relatório enviado para ${customSettings.email}`)
      } else {
        alert('Relatório gerado com sucesso! Verifique o histórico de exportações.')
      }
    }, 3000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'processing':
        return <Clock className="h-4 w-4 text-yellow-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600" />
      default:
        return <Clock className="h-4 w-4 text-gray-600" />
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Concluído</Badge>
      case 'processing':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">Processando</Badge>
      case 'error':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Erro</Badge>
      default:
        return <Badge variant="outline">Pendente</Badge>
    }
  }

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
            <div className="p-2 bg-blue-100 rounded-lg">
              <Download className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Exportar Relatórios</h1>
              <p className="text-sm text-gray-500">Gere e baixe relatórios personalizados</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuração da Exportação */}
        <div className="space-y-6">
          {/* Seleção de Relatórios */}
          <Card>
            <CardHeader>
              <CardTitle>Selecione os Relatórios</CardTitle>
              <CardDescription>
                Escolha quais relatórios deseja incluir na exportação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {reportTypes.map(report => {
                  const Icon = report.icon
                  const isSelected = selectedReports.includes(report.id)
                  
                  return (
                    <div
                      key={report.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => handleReportSelection(report.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className={`p-2 rounded-lg bg-${report.color}-100`}>
                            <Icon className={`h-5 w-5 text-${report.color}-600`} />
                          </div>
                          <div>
                            <h4 className="font-medium text-gray-900">{report.name}</h4>
                            <p className="text-sm text-gray-500">{report.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">
                            {report.estimatedSize}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Configurações de Formato */}
          <Card>
            <CardHeader>
              <CardTitle>Formato de Exportação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {exportFormats.map(format => {
                  const Icon = format.icon
                  return (
                    <div
                      key={format.value}
                      className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                        exportFormat === format.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setExportFormat(format.value)}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <Icon className="h-4 w-4 text-gray-600" />
                        <span className="font-medium">{format.label}</span>
                      </div>
                      <p className="text-xs text-gray-500">{format.description}</p>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>

          {/* Período dos Dados */}
          <Card>
            <CardHeader>
              <CardTitle>Período dos Dados</CardTitle>
            </CardHeader>
            <CardContent>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {dateRangeOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </CardContent>
          </Card>
        </div>

        {/* Configurações Avançadas e Histórico */}
        <div className="space-y-6">
          {/* Configurações Avançadas */}
          <Card>
            <CardHeader>
              <CardTitle>Configurações Avançadas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={customSettings.includeCharts}
                    onChange={(e) => setCustomSettings(prev => ({
                      ...prev,
                      includeCharts: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Incluir gráficos e visualizações</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={customSettings.includeSummary}
                    onChange={(e) => setCustomSettings(prev => ({
                      ...prev,
                      includeSummary: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Incluir resumo executivo</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={customSettings.includeRawData}
                    onChange={(e) => setCustomSettings(prev => ({
                      ...prev,
                      includeRawData: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Incluir dados brutos</span>
                </label>

                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={customSettings.emailDelivery}
                    onChange={(e) => setCustomSettings(prev => ({
                      ...prev,
                      emailDelivery: e.target.checked
                    }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Enviar por email</span>
                </label>
              </div>

              {customSettings.emailDelivery && (
                <div className="space-y-3">
                  <Input
                    placeholder="Email para entrega"
                    value={customSettings.email}
                    onChange={(e) => setCustomSettings(prev => ({
                      ...prev,
                      email: e.target.value
                    }))}
                  />
                </div>
              )}

              <div className="space-y-3">
                <Input
                  placeholder="Título personalizado (opcional)"
                  value={customSettings.customTitle}
                  onChange={(e) => setCustomSettings(prev => ({
                    ...prev,
                    customTitle: e.target.value
                  }))}
                />

                <Textarea
                  placeholder="Notas adicionais (opcional)"
                  value={customSettings.notes}
                  onChange={(e) => setCustomSettings(prev => ({
                    ...prev,
                    notes: e.target.value
                  }))}
                  className="h-20"
                />
              </div>
            </CardContent>
          </Card>

          {/* Botão de Exportação */}
          <Card>
            <CardContent className="p-4">
              <Button 
                onClick={handleExport}
                disabled={isExporting || selectedReports.length === 0}
                className="w-full h-12"
              >
                {isExporting ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Gerando Relatório...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Download className="h-4 w-4" />
                    <span>Exportar {selectedReports.length} Relatório(s)</span>
                  </div>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Histórico de Exportações */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Histórico de Exportações</span>
          </CardTitle>
          <CardDescription>
            Seus relatórios gerados recentemente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {exportHistory.map(export_ => (
              <div key={export_.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(export_.status)}
                    <div>
                      <h4 className="font-medium text-gray-900">{export_.name}</h4>
                      <p className="text-sm text-gray-500">
                        {export_.format.toUpperCase()} • {export_.size} • {new Date(export_.date).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  {getStatusBadge(export_.status)}
                  {export_.status === 'completed' && (
                    <Button size="sm" variant="outline">
                      <Download className="h-4 w-4 mr-1" />
                      Baixar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

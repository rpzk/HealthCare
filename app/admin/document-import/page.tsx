import { Suspense } from 'react'
import { Metadata } from 'next'
import MedicalDocumentImport from '@/components/admin/medical-document-import'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'Importação de Documentos Médicos - HealthCare AI',
  description: 'Sistema inteligente de importação e análise de documentos médicos com IA'
}

export default function DocumentImportPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* 📄 Cabeçalho */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Importação Inteligente de Documentos</h1>
        <p className="text-gray-600">
          Sistema AI para análise automática de prontuários, evoluções, exames e prescrições médicas
        </p>
      </div>

      {/* 📊 Estatísticas Rápidas */}
      <Suspense fallback={<div>Carregando estatísticas...</div>}>
        <DocumentStats />
      </Suspense>

      {/* 🤖 Componente Principal */}
      <Suspense fallback={<div>Carregando sistema de importação...</div>}>
        <MedicalDocumentImport />
      </Suspense>

      {/* 📖 Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Como Usar o Sistema de Importação</CardTitle>
          <CardDescription>
            Guia rápido para maximizar a eficiência da análise AI
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="font-semibold text-green-700">✅ Formatos Suportados</h3>
              <ul className="space-y-1 text-sm">
                <li>• <strong>.docx/.doc</strong> - Documentos Word</li>
                <li>• <strong>.pdf</strong> - Arquivos PDF</li>
                <li>• <strong>.txt</strong> - Texto simples</li>
                <li>• <strong>.rtf</strong> - Rich Text Format</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-blue-700">🎯 Tipos Detectados</h3>
              <ul className="space-y-1 text-sm">
                <li>• <strong>Evoluções</strong> - Notas de evolução</li>
                <li>• <strong>Exames</strong> - Resultados laboratoriais</li>
                <li>• <strong>Prescrições</strong> - Receitas médicas</li>
                <li>• <strong>Anamneses</strong> - Histórico do paciente</li>
                <li>• <strong>Atestados</strong> - Documentos oficiais</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-purple-700">🧠 Dados Extraídos</h3>
              <ul className="space-y-1 text-sm">
                <li>• Informações do paciente (nome, CPF)</li>
                <li>• Sintomas e diagnósticos</li>
                <li>• Medicamentos e dosagens</li>
                <li>• Sinais vitais</li>
                <li>• Resultados de exames</li>
              </ul>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold text-orange-700">⚡ Ações Automáticas</h3>
              <ul className="space-y-1 text-sm">
                <li>• Criação de novos pacientes</li>
                <li>• Atualização de prontuários</li>
                <li>• Registro de consultas</li>
                <li>• Cadastro de prescrições</li>
                <li>• Arquivo de resultados</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h3 className="font-semibold text-red-700 mb-2">⚠️ Dicas Importantes</h3>
            <ul className="space-y-1 text-sm text-gray-600">
              <li>• Sempre revise as análises AI antes de confirmar a importação</li>
              <li>• Documentos com melhor qualidade geram análises mais precisas</li>
              <li>• O sistema identifica pacientes automaticamente via CPF quando disponível</li>
              <li>• Mantenha os nomes de arquivo descritivos para melhor organização</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// 📊 Componente de estatísticas
async function DocumentStats() {
  // Simulação - em produção, buscar dados reais da API
  const stats = {
    totalDocuments: 0,
    pendingAnalysis: 0,
    successfulImports: 0,
    todayUploads: 0
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded">📄</div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total</p>
              <p className="text-2xl font-bold">{stats.totalDocuments}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded">⏳</div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Analisando</p>
              <p className="text-2xl font-bold">{stats.pendingAnalysis}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded">✅</div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Importados</p>
              <p className="text-2xl font-bold">{stats.successfulImports}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded">📈</div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Hoje</p>
              <p className="text-2xl font-bold">{stats.todayUploads}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

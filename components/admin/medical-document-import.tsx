'use client'

import React, { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Upload, 
  File, 
  AlertCircle, 
  CheckCircle2, 
  Clock,
  Eye,
  Trash2,
  Brain
} from 'lucide-react'
import { useDropzone } from 'react-dropzone'

// 📄 Tipos para importação de documentos
interface MedicalDocument {
  id: string
  fileName: string
  fileType: string
  status: 'PENDING' | 'ANALYZING' | 'CLASSIFIED' | 'IMPORTED' | 'ERROR'
  uploadDate: string
  analysis?: DocumentAnalysis
  errorMessage?: string
}

interface DocumentAnalysis {
  confidence: number
  documentType: 'EVOLUCAO' | 'EXAME' | 'PRESCRICAO' | 'ANAMNESE' | 'ATESTADO' | 'RECEITA' | 'LAUDO' | 'OUTROS'
  patientInfo: {
    name?: string
    cpf?: string
    birthDate?: string
    matchedPatient?: {
      id: string
      name: string
      cpf: string
    }
  }
  extractedData: {
    symptoms?: string[]
    diagnoses?: string[]
    medications?: Array<{
      name: string
      dosage?: string
      frequency?: string
    }>
    vitalSigns?: {
      systolic?: string
      diastolic?: string
      heartRate?: string
      temperature?: string
      weight?: string
    }
    examResults?: Array<{
      name: string
      result: string
      reference?: string
    }>
    recommendations?: string[]
  }
  suggestedActions: Array<{
    type: 'CREATE_PATIENT' | 'UPDATE_RECORD' | 'CREATE_CONSULTATION' | 'CREATE_PRESCRIPTION' | 'REVIEW_REQUIRED'
    description: string
    confidence: number
  }>
}

export default function MedicalDocumentImport() {
  const [documents, setDocuments] = useState<MedicalDocument[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [selectedDocument, setSelectedDocument] = useState<MedicalDocument | null>(null)

  // 📤 Handler para upload de arquivos
  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setIsUploading(true)
    
    for (const file of acceptedFiles) {
      const formData = new FormData()
      formData.append('file', file)

      try {
        const response = await fetch('/api/admin/document-import', {
          method: 'POST',
          body: formData,
        })

        if (response.ok) {
          const newDocument = await response.json()
          setDocuments(prev => [...prev, newDocument])
          
          // Iniciar análise em background
          analyzeDocument(newDocument.id)
        } else {
          console.error('Erro no upload:', await response.text())
        }
      } catch (error) {
        console.error('Erro no upload:', error)
      }
    }
    
    setIsUploading(false)
  }, [])

  // 🧠 Analisar documento com IA
  const analyzeDocument = async (documentId: string) => {
    try {
      const response = await fetch(`/api/admin/document-import/${documentId}/analyze`, {
        method: 'POST',
      })

      if (response.ok) {
        const analyzedDocument = await response.json()
        setDocuments(prev => 
          prev.map(doc => 
            doc.id === documentId ? analyzedDocument : doc
          )
        )
      }
    } catch (error) {
      console.error('Erro na análise:', error)
    }
  }

  // ✅ Confirmar importação
  const confirmImport = async (document: MedicalDocument) => {
    try {
      const response = await fetch(`/api/admin/document-import/${document.id}/confirm`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirmedActions: document.analysis?.suggestedActions || []
        })
      })

      if (response.ok) {
        const updatedDocument = await response.json()
        setDocuments(prev => 
          prev.map(doc => 
            doc.id === document.id ? updatedDocument : doc
          )
        )
      }
    } catch (error) {
      console.error('Erro na confirmação:', error)
    }
  }

  // 🗑️ Remover documento
  const removeDocument = async (documentId: string) => {
    try {
      await fetch(`/api/admin/document-import/${documentId}`, {
        method: 'DELETE',
      })
      
      setDocuments(prev => prev.filter(doc => doc.id !== documentId))
    } catch (error) {
      console.error('Erro ao remover:', error)
    }
  }

  // 📂 Configuração do dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/msword': ['.doc'],
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'application/rtf': ['.rtf'],
    },
    multiple: true,
    disabled: isUploading
  })

  // 🎨 Função para cor do status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING': return 'bg-gray-100 text-gray-700'
      case 'ANALYZING': return 'bg-blue-100 text-blue-700'
      case 'CLASSIFIED': return 'bg-green-100 text-green-700'
      case 'IMPORTED': return 'bg-emerald-100 text-emerald-700'
      case 'ERROR': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // 🎨 Função para ícone do tipo de documento
  const getDocumentTypeIcon = (type: string) => {
    switch (type) {
      case 'EVOLUCAO': return '📝'
      case 'EXAME': return '🔬'
      case 'PRESCRICAO': return '💊'
      case 'ANAMNESE': return '📋'
      case 'ATESTADO': return '📄'
      case 'RECEITA': return '💊'
      case 'LAUDO': return '📊'
      default: return '📄'
    }
  }

  return (
    <div className="space-y-6">
      {/* 📤 Área de Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importação Inteligente de Documentos Médicos
          </CardTitle>
          <CardDescription>
            Upload de prontuários, evoluções, exames e prescrições para análise automática com IA
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
              ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
            `}
          >
            <input {...getInputProps()} />
            <div className="space-y-4">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                {isUploading ? (
                  <Clock className="h-8 w-8 text-gray-400 animate-spin" />
                ) : (
                  <Upload className="h-8 w-8 text-gray-400" />
                )}
              </div>
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {isDragActive ? 'Solte os arquivos aqui...' : 'Arraste documentos aqui ou clique para selecionar'}
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Suporta: .docx, .doc, .pdf, .txt, .rtf
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 📊 Lista de Documentos */}
      {documents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Documentos Importados ({documents.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <File className="h-5 w-5 text-gray-500" />
                      <div>
                        <h4 className="font-medium">{doc.fileName}</h4>
                        <p className="text-sm text-gray-500">
                          {new Date(doc.uploadDate).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(doc.status)}>
                        {doc.status}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedDocument(selectedDocument?.id === doc.id ? null : doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeDocument(doc.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* 🔍 Análise Detalhada */}
                  {selectedDocument?.id === doc.id && doc.analysis && (
                    <div className="border-t pt-4 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Tipo e Confiança */}
                        <div className="bg-gray-50 rounded p-3">
                          <h5 className="font-medium mb-2">Classificação IA</h5>
                          <div className="flex items-center gap-2">
                            <span className="text-2xl">
                              {getDocumentTypeIcon(doc.analysis.documentType)}
                            </span>
                            <div>
                              <p className="font-medium">{doc.analysis.documentType}</p>
                              <p className="text-sm text-gray-500">
                                {(doc.analysis.confidence * 100).toFixed(1)}% confiança
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Informações do Paciente */}
                        <div className="bg-blue-50 rounded p-3">
                          <h5 className="font-medium mb-2">Paciente Identificado</h5>
                          {doc.analysis.patientInfo.matchedPatient ? (
                            <div>
                              <p className="font-medium text-blue-700">
                                {doc.analysis.patientInfo.matchedPatient.name}
                              </p>
                              <p className="text-sm text-blue-600">
                                CPF: {doc.analysis.patientInfo.matchedPatient.cpf}
                              </p>
                            </div>
                          ) : (
                            <div>
                              <p className="font-medium">Novo Paciente</p>
                              <p className="text-sm text-gray-600">
                                {doc.analysis.patientInfo.name || 'Nome não identificado'}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Dados Extraídos */}
                        <div className="bg-green-50 rounded p-3">
                          <h5 className="font-medium mb-2">Dados Extraídos</h5>
                          <div className="space-y-1 text-sm">
                            {doc.analysis.extractedData.symptoms && (
                              <p>🩺 {doc.analysis.extractedData.symptoms.length} sintomas</p>
                            )}
                            {doc.analysis.extractedData.medications && (
                              <p>💊 {doc.analysis.extractedData.medications.length} medicamentos</p>
                            )}
                            {doc.analysis.extractedData.examResults && (
                              <p>📊 {doc.analysis.extractedData.examResults.length} exames</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Ações Sugeridas */}
                      <div className="bg-yellow-50 rounded p-4">
                        <h5 className="font-medium mb-3 flex items-center gap-2">
                          <Brain className="h-4 w-4" />
                          Ações Sugeridas pela IA
                        </h5>
                        <div className="space-y-2">
                          {doc.analysis.suggestedActions.map((action, index) => (
                            <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                              <div>
                                <p className="font-medium">{action.description}</p>
                                <p className="text-sm text-gray-500">
                                  {(action.confidence * 100).toFixed(0)}% confiança
                                </p>
                              </div>
                              <Badge variant="outline">{action.type}</Badge>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Botões de Ação */}
                      <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline">
                          Revisar Manualmente
                        </Button>
                        <Button 
                          onClick={() => confirmImport(doc)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Confirmar Importação
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Erro na Análise */}
                  {doc.status === 'ERROR' && doc.errorMessage && (
                    <div className="border-t pt-4">
                      <div className="bg-red-50 border border-red-200 rounded p-3">
                        <div className="flex items-center gap-2 text-red-700">
                          <AlertCircle className="h-4 w-4" />
                          <span className="font-medium">Erro na Análise</span>
                        </div>
                        <p className="text-sm text-red-600 mt-1">{doc.errorMessage}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

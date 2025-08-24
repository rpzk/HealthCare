'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  UserPlus, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Upload,
  User,
  Phone,
  Mail,
  MapPin,
  Heart,
  CreditCard
} from 'lucide-react'

interface PatientData {
  nome: string
  cpf?: string
  telefone?: string
  celular?: string
  email?: string
  dataNascimento?: string
  sexo?: string
  endereco?: {
    logradouro?: string
    numero?: string
    bairro?: string
    cidade?: string
    cep?: string
  }
  tipoSanguineo?: string
  alergias?: string[]
  convenio?: {
    nome?: string
    numero?: string
  }
  contatoEmergencia?: {
    nome?: string
    telefone?: string
  }
}

interface RegistrationResult {
  success: boolean
  patient: any
  action: 'created' | 'updated'
  confidence: number
  extractedData: PatientData
  message: string
}

export default function AutoPatientRegistration() {
  const [documentContent, setDocumentContent] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<RegistrationResult | null>(null)
  const [error, setError] = useState('')

  // 📋 Processar documento cadastral
  const processDocument = async () => {
    if (!documentContent.trim()) {
      setError('Por favor, cole o conteúdo do documento cadastral')
      return
    }

    setIsProcessing(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/admin/auto-patient-registration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentContent })
      })

      if (response.ok) {
        const data = await response.json()
        setResult(data)
        setDocumentContent('')
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Erro no processamento')
      }
    } catch (err) {
      setError('Erro de conexão com o servidor')
      console.error('Erro:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  // 🎨 Exemplo de documento para demonstração
  const loadExample = () => {
    const exemplo = `HOSPITAL NOSSA SENHORA DA SAÚDE
FICHA DE CADASTRO DE PACIENTE

DADOS PESSOAIS
Nome: Maria Clara Santos Silva
CPF: 123.456.789-10
Data de Nascimento: 15/03/1985
Sexo: Feminino

CONTATO
Telefone: (11) 3456-7890
Celular: (11) 98765-4321
E-mail: maria.clara@email.com

ENDEREÇO
Rua das Flores, 123, Apto 45
Jardim Primavera - São Paulo - SP
CEP: 01234-567

DADOS MÉDICOS
Tipo Sanguíneo: A+
Alergias: Penicilina, Dipirona
Convênio: Amil Saúde - 123456789012

CONTATO DE EMERGÊNCIA
João Carlos Silva (Esposo): (11) 99876-5432`

    setDocumentContent(exemplo)
  }

  return (
    <div className="space-y-6">
      {/* 📤 Interface de Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Cadastro Automático de Pacientes
          </CardTitle>
          <CardDescription>
            Cole o conteúdo de documentos cadastrais para criar pacientes automaticamente com IA
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">Conteúdo do Documento Cadastral</label>
              <Button variant="outline" size="sm" onClick={loadExample}>
                <FileText className="h-4 w-4 mr-2" />
                Carregar Exemplo
              </Button>
            </div>
            <Textarea
              placeholder="Cole aqui o conteúdo de uma ficha de cadastro, formulário de paciente, ou exportação de sistema..."
              value={documentContent}
              onChange={(e) => setDocumentContent(e.target.value)}
              rows={15}
              className="font-mono text-sm"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setDocumentContent('')}
              disabled={isProcessing || !documentContent}
            >
              Limpar
            </Button>
            <Button
              onClick={processDocument}
              disabled={isProcessing || !documentContent.trim()}
              className="bg-green-600 hover:bg-green-700"
            >
              {isProcessing ? (
                <>
                  <Upload className="h-4 w-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Cadastrar Automaticamente
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ❌ Erro */}
      {error && (
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Erro no Processamento</span>
            </div>
            <p className="text-sm text-red-600 mt-1">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* ✅ Resultado do Cadastro */}
      {result && (
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-700">
              <CheckCircle2 className="h-5 w-5" />
              {result.action === 'created' ? 'Paciente Criado com Sucesso!' : 'Paciente Atualizado!'}
            </CardTitle>
            <CardDescription>{result.message}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Badge de Confiança */}
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-green-700 border-green-300">
                {result.action === 'created' ? 'NOVO CADASTRO' : 'ATUALIZAÇÃO'}
              </Badge>
              <Badge variant="secondary">
                {(result.confidence * 100).toFixed(1)}% confiança
              </Badge>
            </div>

            {/* Dados Extraídos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Dados Pessoais */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Dados Pessoais
                </h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <strong>Nome:</strong> {result.extractedData.nome}
                  </div>
                  {result.extractedData.cpf && (
                    <div>
                      <strong>CPF:</strong> {result.extractedData.cpf}
                    </div>
                  )}
                  {result.extractedData.dataNascimento && (
                    <div>
                      <strong>Nascimento:</strong> {result.extractedData.dataNascimento}
                    </div>
                  )}
                  {result.extractedData.sexo && (
                    <div>
                      <strong>Sexo:</strong> {result.extractedData.sexo}
                    </div>
                  )}
                </div>
              </div>

              {/* Contato */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Phone className="h-4 w-4" />
                  Contato
                </h4>
                <div className="space-y-2 text-sm">
                  {result.extractedData.telefone && (
                    <div>
                      <strong>Telefone:</strong> {result.extractedData.telefone}
                    </div>
                  )}
                  {result.extractedData.celular && (
                    <div>
                      <strong>Celular:</strong> {result.extractedData.celular}
                    </div>
                  )}
                  {result.extractedData.email && (
                    <div className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      <strong>Email:</strong> {result.extractedData.email}
                    </div>
                  )}
                </div>
              </div>

              {/* Endereço */}
              {result.extractedData.endereco && (
                <div className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    Endereço
                  </h4>
                  <div className="text-sm">
                    {result.extractedData.endereco.logradouro && (
                      <div>{result.extractedData.endereco.logradouro} {result.extractedData.endereco.numero}</div>
                    )}
                    {result.extractedData.endereco.bairro && (
                      <div>{result.extractedData.endereco.bairro}</div>
                    )}
                    {result.extractedData.endereco.cidade && (
                      <div>{result.extractedData.endereco.cidade}</div>
                    )}
                    {result.extractedData.endereco.cep && (
                      <div>CEP: {result.extractedData.endereco.cep}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Dados Médicos */}
              <div className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  Dados Médicos
                </h4>
                <div className="space-y-2 text-sm">
                  {result.extractedData.tipoSanguineo && (
                    <div>
                      <strong>Tipo Sanguíneo:</strong> {result.extractedData.tipoSanguineo}
                    </div>
                  )}
                  {result.extractedData.alergias && result.extractedData.alergias.length > 0 && (
                    <div>
                      <strong>Alergias:</strong> {result.extractedData.alergias.join(', ')}
                    </div>
                  )}
                  {result.extractedData.convenio && (
                    <div className="flex items-center gap-1">
                      <CreditCard className="h-3 w-3" />
                      <strong>Convênio:</strong> {result.extractedData.convenio.nome}
                      {result.extractedData.convenio.numero && ` - ${result.extractedData.convenio.numero}`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Contato de Emergência */}
            {result.extractedData.contatoEmergencia && (
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Contato de Emergência</h4>
                <div className="text-sm">
                  <strong>{result.extractedData.contatoEmergencia.nome}</strong>
                  {result.extractedData.contatoEmergencia.telefone && (
                    <span> - {result.extractedData.contatoEmergencia.telefone}</span>
                  )}
                </div>
              </div>
            )}

            {/* Informações do Paciente Criado */}
            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
              <h4 className="font-medium text-green-800 mb-2">Paciente no Sistema</h4>
              <div className="text-sm text-green-700">
                <div><strong>ID:</strong> {result.patient.id}</div>
                <div><strong>Email no sistema:</strong> {result.patient.email}</div>
                <div><strong>Cadastrado em:</strong> {new Date(result.patient.createdAt).toLocaleString('pt-BR')}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 📖 Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Como Usar o Cadastro Automático</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-green-700 mb-2">✅ Formatos Aceitos</h4>
              <ul className="text-sm space-y-1">
                <li>• Fichas de cadastro hospitalar</li>
                <li>• Formulários de clínicas</li>
                <li>• Exportações de sistemas legados</li>
                <li>• Documentos em texto livre</li>
                <li>• Dados estruturados (CSV-like)</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-medium text-blue-700 mb-2">🎯 Dados Extraídos</h4>
              <ul className="text-sm space-y-1">
                <li>• Nome completo e CPF</li>
                <li>• Data de nascimento e sexo</li>
                <li>• Telefones e email</li>
                <li>• Endereço completo</li>
                <li>• Tipo sanguíneo e alergias</li>
                <li>• Convênio médico</li>
                <li>• Contato de emergência</li>
              </ul>
            </div>
          </div>
          
          <div className="border-t pt-4">
            <h4 className="font-medium text-purple-700 mb-2">🚀 Vantagens</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <strong>Velocidade:</strong> Cadastra pacientes em segundos
              </div>
              <div>
                <strong>Precisão:</strong> IA especializada em documentos médicos
              </div>
              <div>
                <strong>Automação:</strong> Sem digitação manual
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

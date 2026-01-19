'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Zap,
  Stethoscope,
  Pill,
  Heart,
  TrendingUp,
  X
} from 'lucide-react'

interface Symptom {
  id: string
  text: string
}

interface DiagnosisResult {
  possibleDiagnoses: {
    name: string
    probability: number
    description: string
    urgencyLevel: 'low' | 'medium' | 'high' | 'critical'
  }[]
  recommendedTests: string[]
  redFlags: string[]
  treatmentSuggestions?: string[]
}

export function SymptomAnalyzer() {
  const [symptoms, setSymptoms] = useState<Symptom[]>([])
  const [currentSymptom, setCurrentSymptom] = useState('')
  const [patientAge, setPatientAge] = useState('')
  const [patientGender, setPatientGender] = useState<'M' | 'F' | ''>('')
  const [medicalHistory, setMedicalHistory] = useState('')
  const [currentMedications, setCurrentMedications] = useState('')
  const [vitalSigns, setVitalSigns] = useState({
    temperature: '',
    bloodPressure: '',
    heartRate: '',
    respiratoryRate: ''
  })
  
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [results, setResults] = useState<DiagnosisResult | null>(null)
  const [error, setError] = useState('')

  const addSymptom = () => {
    if (currentSymptom.trim() && symptoms.length < 10) {
      const newSymptom: Symptom = {
        id: Date.now().toString(),
        text: currentSymptom.trim()
      }
      setSymptoms([...symptoms, newSymptom])
      setCurrentSymptom('')
    }
  }

  const removeSymptom = (id: string) => {
    setSymptoms(symptoms.filter(s => s.id !== id))
  }

  const analyzeSymptoms = async () => {
    if (symptoms.length === 0 || !patientAge || !patientGender) {
      setError('Preencha todos os campos obrigatórios')
      return
    }

    setIsAnalyzing(true)
    setError('')
    setResults(null)

    try {
      const requestData = {
        symptoms: symptoms.map(s => s.text),
        patientAge: parseInt(patientAge),
        patientGender,
        medicalHistory: medicalHistory ? medicalHistory.split(',').map(s => s.trim()) : undefined,
        currentMedications: currentMedications ? currentMedications.split(',').map(s => s.trim()) : undefined,
        vitalSigns: {
          temperature: vitalSigns.temperature ? parseFloat(vitalSigns.temperature) : undefined,
          bloodPressure: vitalSigns.bloodPressure || undefined,
          heartRate: vitalSigns.heartRate ? parseInt(vitalSigns.heartRate) : undefined,
          respiratoryRate: vitalSigns.respiratoryRate ? parseInt(vitalSigns.respiratoryRate) : undefined
        }
      }

      const response = await fetch('/api/ai/analyze-symptoms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestData)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao analisar sintomas')
      }

      setResults(data.data)
      
    } catch (err) {
      setError(String(err))
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getUrgencyColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-600 text-white'
      case 'high': return 'bg-red-500 text-white'
      case 'medium': return 'bg-yellow-500 text-black'
      case 'low': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getUrgencyIcon = (level: string) => {
    switch (level) {
      case 'critical': return <Zap className="w-4 h-4" />
      case 'high': return <AlertTriangle className="w-4 h-4" />
      case 'medium': return <Clock className="w-4 h-4" />
      case 'low': return <CheckCircle className="w-4 h-4" />
      default: return <Heart className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-100 rounded-lg">
          <Brain className="w-6 h-6 text-blue-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Análise de Sintomas com IA</h2>
          <p className="text-gray-600">Sistema inteligente de apoio ao diagnóstico médico</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário de Entrada */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Stethoscope className="w-5 h-5" />
            Dados do Paciente
          </h3>

          {/* Dados básicos */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Idade *</label>
              <Input
                type="number"
                value={patientAge}
                onChange={(e) => setPatientAge(e.target.value)}
                placeholder="Ex: 35"
                min="0"
                max="120"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Gênero *</label>
              <select
                value={patientGender}
                onChange={(e) => setPatientGender(e.target.value as 'M' | 'F' | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecionar</option>
                <option value="M">Masculino</option>
                <option value="F">Feminino</option>
              </select>
            </div>
          </div>

          {/* Sintomas */}
          <div>
            <label className="block text-sm font-medium mb-1">Sintomas *</label>
            <div className="flex gap-2">
              <Input
                value={currentSymptom}
                onChange={(e) => setCurrentSymptom(e.target.value)}
                placeholder="Ex: dor de cabeça, febre..."
                onKeyPress={(e) => e.key === 'Enter' && addSymptom()}
              />
              <Button onClick={addSymptom} disabled={!currentSymptom.trim()}>
                Adicionar
              </Button>
            </div>
            
            {symptoms.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {symptoms.map((symptom) => (
                  <Badge
                    key={symptom.id}
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    {symptom.text}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-red-100"
                      onClick={() => removeSymptom(symptom.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Histórico médico */}
          <div>
            <label className="block text-sm font-medium mb-1">Histórico Médico</label>
            <Textarea
              value={medicalHistory}
              onChange={(e) => setMedicalHistory(e.target.value)}
              placeholder="Ex: hipertensão, diabetes, cirurgias anteriores..."
              className="h-20"
            />
          </div>

          {/* Medicações atuais */}
          <div>
            <label className="block text-sm font-medium mb-1">Medicações Atuais</label>
            <Textarea
              value={currentMedications}
              onChange={(e) => setCurrentMedications(e.target.value)}
              placeholder="Ex: losartana 50mg, metformina 850mg..."
              className="h-20"
            />
          </div>

          {/* Sinais vitais */}
          <div>
            <label className="block text-sm font-medium mb-2">Sinais Vitais</label>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Temperatura (°C)</label>
                <Input
                  type="number"
                  step="0.1"
                  value={vitalSigns.temperature}
                  onChange={(e) => setVitalSigns({...vitalSigns, temperature: e.target.value})}
                  placeholder="36.5"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Pressão Arterial</label>
                <Input
                  value={vitalSigns.bloodPressure}
                  onChange={(e) => setVitalSigns({...vitalSigns, bloodPressure: e.target.value})}
                  placeholder="120/80"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">FC (bpm)</label>
                <Input
                  type="number"
                  value={vitalSigns.heartRate}
                  onChange={(e) => setVitalSigns({...vitalSigns, heartRate: e.target.value})}
                  placeholder="72"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">FR (ipm)</label>
                <Input
                  type="number"
                  value={vitalSigns.respiratoryRate}
                  onChange={(e) => setVitalSigns({...vitalSigns, respiratoryRate: e.target.value})}
                  placeholder="16"
                />
              </div>
            </div>
          </div>

          <Button 
            onClick={analyzeSymptoms}
            disabled={isAnalyzing || symptoms.length === 0 || !patientAge || !patientGender}
            className="w-full"
          >
            {isAnalyzing ? (
              <>
                <Brain className="w-4 h-4 mr-2 animate-pulse" />
                Analisando...
              </>
            ) : (
              <>
                <Brain className="w-4 h-4 mr-2" />
                Analisar Sintomas
              </>
            )}
          </Button>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}
        </Card>

        {/* Resultados */}
        <div className="space-y-4">
          {results && (
            <>
              {/* Possíveis Diagnósticos */}
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5" />
                  Possíveis Diagnósticos
                </h3>
                <div className="space-y-3">
                  {results.possibleDiagnoses.map((diagnosis, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold">{diagnosis.name}</h4>
                        <div className="flex items-center gap-2">
                          <Badge className={getUrgencyColor(diagnosis.urgencyLevel)}>
                            {getUrgencyIcon(diagnosis.urgencyLevel)}
                            {diagnosis.urgencyLevel.toUpperCase()}
                          </Badge>
                          <Badge variant="outline">
                            {diagnosis.probability}%
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{diagnosis.description}</p>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Exames Recomendados */}
              {results.recommendedTests.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Exames Recomendados</h3>
                  <ul className="space-y-2">
                    {results.recommendedTests.map((test, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        {test}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Sinais de Alerta */}
              {results.redFlags.length > 0 && (
                <Card className="p-6 border-red-200 bg-red-50">
                  <h3 className="text-lg font-semibold mb-4 text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Sinais de Alerta
                  </h3>
                  <ul className="space-y-2">
                    {results.redFlags.map((flag, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-red-700">
                        <AlertTriangle className="w-4 h-4" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Sugestões de Tratamento */}
              {results.treatmentSuggestions && results.treatmentSuggestions.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Pill className="w-5 h-5" />
                    Sugestões de Tratamento
                  </h3>
                  <ul className="space-y-2">
                    {results.treatmentSuggestions.map((treatment, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm">
                        <Pill className="w-4 h-4 text-blue-600" />
                        {treatment}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Aviso Legal */}
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Aviso:</strong> Esta análise é apenas um sistema de apoio ao diagnóstico. 
                  Sempre consulte um médico para avaliação e diagnóstico definitivo.
                </p>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

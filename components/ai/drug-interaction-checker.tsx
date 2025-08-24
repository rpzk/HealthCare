'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Pill, 
  AlertTriangle, 
  Shield, 
  X,
  Plus,
  Search
} from 'lucide-react'

interface Medication {
  id: string
  name: string
}

interface DrugInteraction {
  drugs: string[]
  severity: 'mild' | 'moderate' | 'severe'
  description: string
  recommendation: string
}

interface InteractionResults {
  medications: string[]
  interactions: DrugInteraction[]
  contraindications: string[]
}

export function DrugInteractionChecker() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [currentMedication, setCurrentMedication] = useState('')
  const [isChecking, setIsChecking] = useState(false)
  const [results, setResults] = useState<InteractionResults | null>(null)
  const [error, setError] = useState('')

  const addMedication = () => {
    if (currentMedication.trim() && medications.length < 15) {
      const newMedication: Medication = {
        id: Date.now().toString(),
        name: currentMedication.trim()
      }
      setMedications([...medications, newMedication])
      setCurrentMedication('')
    }
  }

  const removeMedication = (id: string) => {
    setMedications(medications.filter(m => m.id !== id))
    if (medications.length <= 2) {
      setResults(null)
    }
  }

  const checkInteractions = async () => {
    if (medications.length < 2) {
      setError('Adicione pelo menos 2 medicamentos para verificar interações')
      return
    }

    setIsChecking(true)
    setError('')
    setResults(null)

    try {
      const response = await fetch('/api/ai/drug-interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          medications: medications.map(m => m.name)
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao verificar interações')
      }

      setResults(data.data)
      
    } catch (err) {
      setError(String(err))
    } finally {
      setIsChecking(false)
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe': return 'bg-red-600 text-white'
      case 'moderate': return 'bg-yellow-500 text-black'
      case 'mild': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'severe': return <AlertTriangle className="w-4 h-4" />
      case 'moderate': return <AlertTriangle className="w-4 h-4" />
      case 'mild': return <Shield className="w-4 h-4" />
      default: return <Shield className="w-4 h-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-orange-100 rounded-lg">
          <Pill className="w-6 h-6 text-orange-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Verificador de Interações Medicamentosas</h2>
          <p className="text-gray-600">Sistema inteligente para identificar interações entre medicamentos</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário de Entrada */}
        <Card className="p-6 space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Plus className="w-5 h-5" />
            Adicionar Medicamentos
          </h3>

          {/* Input para medicamentos */}
          <div className="flex gap-2">
            <Input
              value={currentMedication}
              onChange={(e) => setCurrentMedication(e.target.value)}
              placeholder="Ex: Aspirina, Losartana, Omeprazol..."
              onKeyPress={(e) => e.key === 'Enter' && addMedication()}
            />
            <Button onClick={addMedication} disabled={!currentMedication.trim()}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {/* Lista de medicamentos adicionados */}
          {medications.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Medicamentos Adicionados ({medications.length})
              </label>
              <div className="flex flex-wrap gap-2">
                {medications.map((medication) => (
                  <Badge
                    key={medication.id}
                    variant="secondary"
                    className="flex items-center gap-1 py-1 px-2"
                  >
                    <Pill className="w-3 h-3" />
                    {medication.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-red-100"
                      onClick={() => removeMedication(medication.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <Button 
            onClick={checkInteractions}
            disabled={isChecking || medications.length < 2}
            className="w-full"
          >
            {isChecking ? (
              <>
                <Search className="w-4 h-4 mr-2 animate-pulse" />
                Verificando...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-2" />
                Verificar Interações
              </>
            )}
          </Button>

          {medications.length < 2 && (
            <p className="text-sm text-gray-500 text-center">
              Adicione pelo menos 2 medicamentos para verificar interações
            </p>
          )}

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
              {/* Status Geral */}
              <Card className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Status da Verificação</h3>
                  <Badge 
                    className={
                      results.interactions.length === 0 
                        ? 'bg-green-500 text-white'
                        : results.interactions.some(i => i.severity === 'severe')
                        ? 'bg-red-600 text-white'
                        : 'bg-yellow-500 text-black'
                    }
                  >
                    {results.interactions.length === 0 
                      ? 'Nenhuma Interação Detectada'
                      : `${results.interactions.length} Interação(ões) Encontrada(s)`
                    }
                  </Badge>
                </div>
                
                <div className="text-sm text-gray-600">
                  <p>Medicamentos analisados: {results.medications.length}</p>
                  <p>Interações encontradas: {results.interactions.length}</p>
                  <p>Contraindicações: {results.contraindications.length}</p>
                </div>
              </Card>

              {/* Interações Detectadas */}
              {results.interactions.length > 0 && (
                <Card className="p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    Interações Detectadas
                  </h3>
                  <div className="space-y-4">
                    {results.interactions.map((interaction, index) => (
                      <div key={index} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold">
                            {interaction.drugs.join(' + ')}
                          </h4>
                          <Badge className={getSeverityColor(interaction.severity)}>
                            {getSeverityIcon(interaction.severity)}
                            {interaction.severity.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-medium text-gray-700">Descrição:</p>
                            <p className="text-sm text-gray-600">{interaction.description}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-gray-700">Recomendação:</p>
                            <p className="text-sm text-blue-600">{interaction.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Contraindicações */}
              {results.contraindications.length > 0 && (
                <Card className="p-6 border-red-200 bg-red-50">
                  <h3 className="text-lg font-semibold mb-4 text-red-800 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5" />
                    Contraindicações Importantes
                  </h3>
                  <ul className="space-y-2">
                    {results.contraindications.map((contraindication, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-red-700">
                        <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        {contraindication}
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {/* Nenhuma Interação */}
              {results.interactions.length === 0 && (
                <Card className="p-6 border-green-200 bg-green-50">
                  <div className="flex items-center gap-2 text-green-800">
                    <Shield className="w-5 h-5" />
                    <h3 className="text-lg font-semibold">Análise Concluída</h3>
                  </div>
                  <p className="text-green-700 mt-2">
                    Nenhuma interação medicamentosa significativa foi detectada entre os medicamentos analisados.
                  </p>
                </Card>
              )}

              {/* Aviso Legal */}
              <Card className="p-4 bg-yellow-50 border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Aviso:</strong> Esta verificação é um sistema de apoio. 
                  Sempre consulte um farmacêutico ou médico antes de iniciar, alterar ou interromper medicamentos.
                </p>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

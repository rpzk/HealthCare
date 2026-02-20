'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Pill,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Share2,
  Info,
  ExternalLink
} from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface PrescriptionItem {
  id: string
  medicationName: string
  dosage: string | null
  frequency: string | null
  duration: string | null
  instructions: string | null
}

interface Prescription {
  id: string
  status: string
  createdAt: string
  validUntil?: string | null
  doctor?: {
    name: string
    speciality?: string
  }
  items?: PrescriptionItem[]
  medicationName?: string
  dosage?: string | null
  frequency?: string | null
  duration?: string | null
}

export default function MinhasReceitasPage() {
  const { data: session } = useSession()
  const [loading, setLoading] = useState(true)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [selectedPrescription, setSelectedPrescription] = useState<Prescription | null>(null)
  const [filter, setFilter] = useState<'all' | 'active' | 'expired'>('active')

  useEffect(() => {
    loadPrescriptions()
  }, [session?.user?.id])

  const loadPrescriptions = async () => {
    try {
      setLoading(true)
      
      // Primeiro buscar o paciente vinculado
      const patientResponse = await fetch('/api/patients/me')
      if (!patientResponse.ok) {
        setLoading(false)
        return
      }
      
      const patient = await patientResponse.json()
      if (patient?.id) {
        const response = await fetch(`/api/prescriptions?patientId=${patient.id}`)
        if (response.ok) {
          const data = await response.json()
          setPrescriptions(data.prescriptions || [])
        }
      }
    } catch (err) {
      console.error('Erro:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredPrescriptions = prescriptions.filter(p => {
    if (filter === 'all') return true
    if (filter === 'active') return p.status === 'ACTIVE'
    if (filter === 'expired') return p.status !== 'ACTIVE'
    return true
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ativa
          </Badge>
        )
      case 'COMPLETED':
        return (
          <Badge className="bg-blue-100 text-blue-700">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Concluída
          </Badge>
        )
      case 'CANCELLED':
        return (
          <Badge className="bg-red-100 text-red-700">
            <XCircle className="h-3 w-3 mr-1" />
            Cancelada
          </Badge>
        )
      default:
        return (
          <Badge className="bg-gray-100 text-gray-700">
            {status}
          </Badge>
        )
    }
  }

  // Tela de detalhes da receita
  if (selectedPrescription) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-950">
        {/* Header */}
        <div className="bg-green-600 text-white p-4">
          <div className="max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20"
                onClick={() => setSelectedPrescription(null)}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              <h1 className="text-xl font-bold">Detalhes da Receita</h1>
            </div>
          </div>
        </div>

        <div className="p-4 max-w-lg mx-auto">
          {/* Status e Data */}
          <Card className="rounded-2xl shadow-lg mb-4">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-4">
                {getStatusBadge(selectedPrescription.status)}
                <span className="text-sm text-muted-foreground">
                  {format(parseISO(selectedPrescription.createdAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                </span>
              </div>
              
              {selectedPrescription.doctor && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <User className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Prescrito por</p>
                    <p className="font-medium">{selectedPrescription.doctor.name}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Medicamentos */}
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Pill className="h-5 w-5 text-green-600" />
            Medicamentos
          </h2>
          
          <div className="space-y-3 mb-6">
            {selectedPrescription.items && selectedPrescription.items.length > 0 ? (
              selectedPrescription.items.map((item, index) => (
                <Card key={item.id || index} className="rounded-xl">
                  <CardContent className="p-4">
                    <h3 className="font-semibold text-lg mb-2">{item.medicationName}</h3>
                    
                    <div className="space-y-2 text-sm">
                      {item.dosage && (
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground w-20">Dosagem:</span>
                          <span className="font-medium">{item.dosage}</span>
                        </div>
                      )}
                      {item.frequency && (
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground w-20">Frequência:</span>
                          <span className="font-medium">{item.frequency}</span>
                        </div>
                      )}
                      {item.duration && (
                        <div className="flex items-start gap-2">
                          <span className="text-muted-foreground w-20">Duração:</span>
                          <span className="font-medium">{item.duration}</span>
                        </div>
                      )}
                      {item.instructions && (
                        <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                          <div className="flex items-start gap-2">
                            <Info className="h-4 w-4 text-amber-600 mt-0.5" />
                            <p className="text-amber-800 text-sm">{item.instructions}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              // Fallback para estrutura antiga
              <Card className="rounded-xl">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-lg mb-2">
                    {selectedPrescription.medicationName || 'Medicamento'}
                  </h3>
                  <div className="space-y-2 text-sm">
                    {selectedPrescription.dosage && (
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground w-20">Dosagem:</span>
                        <span className="font-medium">{selectedPrescription.dosage}</span>
                      </div>
                    )}
                    {selectedPrescription.frequency && (
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground w-20">Frequência:</span>
                        <span className="font-medium">{selectedPrescription.frequency}</span>
                      </div>
                    )}
                    {selectedPrescription.duration && (
                      <div className="flex items-start gap-2">
                        <span className="text-muted-foreground w-20">Duração:</span>
                        <span className="font-medium">{selectedPrescription.duration}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Ações: Baixar PDF, Verificar, Compartilhar */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="default" 
              className="flex items-center gap-2"
              onClick={() => window.open(`/api/prescriptions/${selectedPrescription.id}/pdf`, '_blank')}
              title="Baixar o PDF da receita (documento assinado digitalmente)."
            >
              <Download className="h-4 w-4" />
              Baixar PDF
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/prescriptions/${selectedPrescription.id}/signature`)
                  const data = await res.json()
                  const pageUrl = data?.verificationPageUrl ?? (data?.signatureHash ? `/verify/${data.signatureHash}` : null)
                  if (pageUrl) window.open(pageUrl, '_blank')
                  else alert('Verificação disponível apenas para receitas assinadas digitalmente.')
                } catch {
                  alert('Não foi possível abrir a verificação.')
                }
              }}
            >
              <ExternalLink className="h-4 w-4" />
              Verificar
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 col-span-2"
              onClick={async () => {
                try {
                  const res = await fetch(`/api/prescriptions/${selectedPrescription.id}/signature`)
                  const data = await res.json()
                  const pageUrl = data?.verificationPageUrl ?? (data?.signatureHash ? `/verify/${data.signatureHash}` : null)
                  const shareUrl = pageUrl ? `${window.location.origin}${pageUrl}` : `${window.location.origin}/api/prescriptions/${selectedPrescription.id}/pdf`
                  if (navigator.share) {
                    await navigator.share({ title: 'Receita Médica', url: shareUrl })
                  } else {
                    await navigator.clipboard.writeText(shareUrl)
                    alert('Link copiado para a área de transferência!')
                  }
                } catch (err) {
                  console.error('Erro ao compartilhar:', err)
                }
              }}
            >
              <Share2 className="h-4 w-4" />
              Compartilhar link de verificação
            </Button>
          </div>

          {/* Aviso */}
          <div className="mt-6 p-4 bg-amber-50 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="font-medium text-amber-800">Importante</p>
                <p className="text-sm text-amber-700 mt-1">
                  Siga sempre as orientações do seu médico. Em caso de dúvidas ou reações 
                  adversas, entre em contato com o profissional que prescreveu o medicamento.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white dark:from-gray-900 dark:to-gray-950 pb-24">
      {/* Header */}
      <div className="bg-green-600 text-white p-4 pb-6">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center gap-3 mb-4">
            <Link href="/minha-saude">
              <Button variant="ghost" size="icon" className="text-white hover:bg-white/20">
                <ChevronLeft className="h-6 w-6" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Minhas Receitas</h1>
          </div>
          
          {/* Resumo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">
                {prescriptions.filter(p => p.status === 'ACTIVE').length}
              </p>
              <p className="text-xs text-green-200">Receitas Ativas</p>
            </div>
            <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{prescriptions.length}</p>
              <p className="text-xs text-green-200">Total de Receitas</p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto -mt-2">
        {/* Filtros */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <Button
            variant={filter === 'active' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('active')}
            className="rounded-full whitespace-nowrap"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Ativas
          </Button>
          <Button
            variant={filter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('all')}
            className="rounded-full whitespace-nowrap"
          >
            Todas
          </Button>
          <Button
            variant={filter === 'expired' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter('expired')}
            className="rounded-full whitespace-nowrap"
          >
            Antigas
          </Button>
        </div>

        {/* Lista de Receitas */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : filteredPrescriptions.length === 0 ? (
          <Card className="rounded-2xl">
            <CardContent className="p-8 text-center">
              <Pill className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p className="text-muted-foreground">
                {filter === 'active' 
                  ? 'Você não tem receitas ativas no momento.'
                  : 'Nenhuma receita encontrada.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredPrescriptions.map((prescription) => (
              <Card 
                key={prescription.id} 
                className="rounded-xl cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedPrescription(prescription)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg ${
                        prescription.status === 'ACTIVE' 
                          ? 'bg-green-100' 
                          : 'bg-gray-100'
                      }`}>
                        <Pill className={`h-5 w-5 ${
                          prescription.status === 'ACTIVE'
                            ? 'text-green-600'
                            : 'text-gray-400'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">
                          {prescription.items?.[0]?.medicationName || 
                           prescription.medicationName || 
                           'Receita Médica'}
                        </p>
                        {prescription.items && prescription.items.length > 1 && (
                          <p className="text-xs text-muted-foreground">
                            + {prescription.items.length - 1} medicamento(s)
                          </p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(prescription.status)}
                  </div>
                  
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {format(parseISO(prescription.createdAt), "d MMM yyyy", { locale: ptBR })}
                    </span>
                    {prescription.doctor && (
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {prescription.doctor.name}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center justify-end mt-2">
                    <ChevronRight className="h-5 w-5 text-gray-400" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t shadow-lg px-2 py-2 md:hidden">
        <div className="flex justify-around items-center max-w-lg mx-auto">
          <Link href="/minha-saude" className="flex flex-col items-center py-1.5 px-3 text-gray-500">
            <Pill className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Início</span>
          </Link>
          <Link href="/minha-saude/receitas" className="flex flex-col items-center py-1.5 px-3 text-green-600">
            <Pill className="h-5 w-5" />
            <span className="text-[10px] mt-0.5 font-medium">Receitas</span>
          </Link>
          <Link href="/minha-saude/consultas" className="flex flex-col items-center py-1.5 px-3 text-gray-500">
            <Calendar className="h-5 w-5" />
            <span className="text-[10px] mt-0.5">Consultas</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}

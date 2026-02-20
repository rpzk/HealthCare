'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { SearchFilter } from '@/components/search/search-filter'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Pill,
  Plus,
  Calendar,
  User,
  Stethoscope,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  Edit,
  FileText,
  Share2
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface Medication {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface Prescription {
  id: string
  medications: Medication[];
  status: string
  startDate: string
  endDate?: string
  createdAt: string
  patient: {
    name: string
  }
  doctor: {
    name: string
    speciality?: string
  }
}


export default function PrescriptionsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Só busca prescrições se sessão estiver carregada e autenticada
  const isReady = status === 'authenticated'

  const fetchPrescriptions = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: '10',
        search: searchTerm
      })
      
      // Só adiciona status se não for 'ALL'
      if (filterStatus && filterStatus !== 'ALL') {
        params.append('status', filterStatus)
      }

      const response = await fetch(`/api/prescriptions?${params}`)
      if (!response.ok) throw new Error('Falha ao carregar prescrições')

      const data = await response.json()
      setPrescriptions(data.prescriptions || [])
      const total = (data.pagination?.total ?? data.total ?? 0) as number
      setTotalPages(Math.ceil(total / 10))
    } catch (error) {
      console.error('Erro ao buscar prescrições:', error)
    } finally {
      setLoading(false)
    }
  }, [currentPage, filterStatus, searchTerm])
  
  useEffect(() => {
    if (isReady) {
      fetchPrescriptions()
    }
  }, [fetchPrescriptions, isReady])
  const getStatusColor = (status: string) => {
    const colors = {
      'ACTIVE': 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 border-green-200 dark:border-green-800',
      'COMPLETED': 'bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800',
      'CANCELLED': 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 border-red-200 dark:border-red-800',
      'EXPIRED': 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-300 border-gray-200 dark:border-gray-700'
  }

  const getStatusIcon = (status: string) => {
    const icons = {
      'ACTIVE': <Clock className="h-4 w-4" />,
      'COMPLETED': <CheckCircle className="h-4 w-4" />,
      'CANCELLED': <XCircle className="h-4 w-4" />,
      'EXPIRED': <AlertCircle className="h-4 w-4" />
    }
    return icons[status as keyof typeof icons] || <Clock className="h-4 w-4" />
  }

  const getStatusLabel = (status: string) => {
    const labels = {
      'ACTIVE': 'Ativa',
      'COMPLETED': 'Concluída',
      'CANCELLED': 'Cancelada',
      'EXPIRED': 'Expirada'
    }
    return labels[status as keyof typeof labels] || status
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="text-muted-foreground">Carregando sessão...</span>
      </div>
    )
  }

  if (status === 'unauthenticated' || !session) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-semibold">Sessão expirada ou não autenticado</h2>
          <p className="text-muted-foreground">Faça login para acessar as prescrições médicas.</p>
          <Button onClick={() => router.push('/login')}>Ir para Login</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-20">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            <PageHeader
              title="Prescrições Médicas"
              description="Gerencie prescrições e medicamentos"
              breadcrumbs={[
                { label: 'Dashboard', href: '/' },
                { label: 'Prescrições', href: '/prescriptions' }
              ]}
              actions={(
                <Button onClick={() => router.push('/prescriptions/new')} className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Nova Prescrição
                </Button>
              )}
            />

            <SearchFilter
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              filters={[
                {
                  name: 'status',
                  label: 'Status',
                  options: [
                    { label: 'Todos os Status', value: 'ALL' },
                    { label: 'Ativas', value: 'ACTIVE' },
                    { label: 'Concluídas', value: 'COMPLETED' },
                    { label: 'Canceladas', value: 'CANCELLED' },
                    { label: 'Expiradas', value: 'EXPIRED' }
                  ]
                }
              ]}
              filterValues={{ status: filterStatus }}
              onFilterChange={(_name, value) => setFilterStatus(value)}
              onClear={() => {
                setSearchTerm('')
                setFilterStatus('ALL')
              }}
              loading={loading}
              placeholder="Buscar por medicamento, paciente ou médico..."
            />

            {/* Lista de Prescrições */}
            <div className="grid gap-4">
              {loading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="space-y-3">
                          <div className="h-5 bg-muted rounded w-1/3"></div>
                          <div className="h-4 bg-muted rounded w-2/3"></div>
                          <div className="h-4 bg-muted rounded w-1/2"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : prescriptions.length === 0 ? (
                <Card>
                  <CardContent className="p-12 text-center">
                    <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Nenhuma prescrição encontrada
                    </h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || filterStatus !== 'ALL' 
                        ? 'Não há prescrições correspondentes aos filtros aplicados.'
                        : 'Comece criando sua primeira prescrição médica.'
                      }
                    </p>
                    <Button onClick={() => router.push('/prescriptions/new')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Criar {searchTerm || filterStatus !== 'ALL' ? 'Nova' : 'Primeira'} Prescrição
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                prescriptions.map((prescription: Prescription) => {
                  const meds = prescription.medications;
                  const main = meds && meds.length > 0 ? meds[0] : undefined
                  const medName = main?.name || 'Medicamentos'
                  const medDosage = main?.dosage || '-'
                  const medFrequency = main?.frequency || '-'
                  const medDuration = main?.duration || '-'
                  const instructions = main?.instructions
                  return (
                  <Card key={prescription.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => window.open(`/api/prescriptions/${prescription.id}/pdf`, '_blank')}>
                    <CardContent className="p-6">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        <div className="flex-1 space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <h3 className="font-semibold text-lg text-foreground flex items-center gap-2">
                                <Pill className="h-5 w-5 text-green-600 dark:text-green-400" />
                                {medName}
                              </h3>
                              <div className="space-y-1 text-sm text-muted-foreground">
                                <p><strong>Dosagem:</strong> {medDosage}</p>
                                <p><strong>Frequência:</strong> {medFrequency}</p>
                                <p><strong>Duração:</strong> {medDuration}</p>
                              </div>
                            </div>
                            <Badge 
                              variant="outline" 
                              className={`flex items-center gap-1 ${getStatusColor(prescription.status)}`}
                            >
                              {getStatusIcon(prescription.status)}
                              {getStatusLabel(prescription.status)}
                            </Badge>
                          </div>

                          {instructions && (
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                              <p className="text-sm text-blue-900 dark:text-blue-300">
                                <strong>Instruções:</strong> {instructions}
                              </p>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <User className="h-4 w-4" />
                              <span>{prescription.patient.name}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Stethoscope className="h-4 w-4" />
                              <span>{prescription.doctor.name}</span>
                              {prescription.doctor.speciality && (
                                <span className="text-muted-foreground">
                                  • {prescription.doctor.speciality}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              <span>
                                Início: {new Date(prescription.startDate).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            {prescription.endDate && (
                              <div className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                <span>
                                  Fim: {new Date(prescription.endDate).toLocaleDateString('pt-BR')}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Baixar o PDF da receita (documento assinado digitalmente; preserve o arquivo para validar no ITI)."
                            onClick={(e) => { e.stopPropagation(); window.open(`/api/prescriptions/${prescription.id}/pdf`, '_blank') }}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Baixar PDF
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Abrir detalhes da prescrição (editar, assinar, enviar e-mail)."
                            onClick={(e) => { e.stopPropagation(); router.push(`/prescriptions/${prescription.id}`) }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Detalhes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const res = await fetch(`/api/prescriptions/${prescription.id}/signature`)
                                const data = (await res.ok ? res.json() : {}) as { signed?: boolean }
                                if (data?.signed) {
                                  toast({
                                    title: 'Edição bloqueada',
                                    description: 'Esta prescrição já foi assinada digitalmente. Para alterações, crie uma nova prescrição.',
                                    variant: 'destructive',
                                  })
                                  return
                                }
                              } catch {
                                // Se falhar a verificação, deixa navegar
                              }
                              router.push(`/prescriptions/${prescription.id}/edit`)
                            }}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Abre a página de verificação da assinatura no sistema. Para validade oficial use o PDF no validar.iti.gov.br."
                            onClick={async (e) => {
                              e.stopPropagation();
                              try {
                                const res = await fetch(`/api/prescriptions/${prescription.id}/signature`)
                                const data = await res.json()
                                const pageUrl = data?.verificationPageUrl ?? (data?.signatureHash ? `/verify/${data.signatureHash}` : null)
                                if (pageUrl) window.open(pageUrl, '_blank')
                                else toast({ title: 'Assine primeiro', description: 'Assine a prescrição para poder verificar.', variant: 'destructive' })
                              } catch {
                                toast({ title: 'Erro', description: 'Não foi possível abrir a verificação.', variant: 'destructive' })
                              }
                            }}
                          >
                            Verificar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            title="Copia o link do PDF para enviar ao paciente (ex.: WhatsApp). O paciente abre o documento sem precisar logar. Válido 7 dias."
                            onClick={async (e) => {
                              e.stopPropagation()
                              try {
                                const res = await fetch(`/api/prescriptions/${prescription.id}/share-link`)
                                if (!res.ok) {
                                  const err = await res.json().catch(() => ({}))
                                  toast({ title: 'Erro', description: err?.error || 'Não foi possível gerar o link.', variant: 'destructive' })
                                  return
                                }
                                const { url } = await res.json()
                                if ((navigator as any)?.share) {
                                  await (navigator as any).share({ title: 'Receita médica', url })
                                  toast({ title: 'Compartilhado', description: 'Link do PDF enviado. Válido 7 dias.' })
                                } else {
                                  await navigator.clipboard.writeText(url)
                                  toast({ title: 'Link copiado', description: 'Link do PDF para o paciente. Envie por WhatsApp ou e-mail. Válido 7 dias.' })
                                }
                              } catch {
                                toast({ title: 'Erro', description: 'Não foi possível obter o link.', variant: 'destructive' })
                              }
                            }}
                          >
                            <Share2 className="h-4 w-4 mr-2" />
                            Compartilhar
                          </Button>
                          {/* Exibe botão Assinar apenas se não estiver assinada (mock: prescription.digitalSignature) */}
                          {!(prescription as any).digitalSignature && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={async (e) => {
                                e.stopPropagation();
                                window.location.href = `/prescriptions/${prescription.id}?assinar=1`
                              }}
                            >
                              Assinar
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )})
              )}
            </div>

            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1 || loading}
                >
                  Anterior
                </Button>
                <span className="px-4 py-2 text-sm text-muted-foreground">
                  Página {currentPage} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages || loading}
                >
                  Próxima
                </Button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}

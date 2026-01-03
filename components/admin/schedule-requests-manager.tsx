'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Clock, CheckCircle, XCircle, AlertCircle, Loader2, Eye } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface ScheduleRequest {
  id: string
  professionalId: string
  requestType: string
  requestData: any
  reason?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  createdAt: string
  updatedAt: string
  reviewedAt?: string
  reviewNotes?: string
  professional: {
    id: string
    name: string
    email: string
    speciality?: string
  }
  requester: {
    id: string
    name: string
  }
  reviewer?: {
    id: string
    name: string
  }
}

const REQUEST_TYPE_LABELS: Record<string, string> = {
  ADD_HOURS: 'Adicionar Horários',
  REMOVE_HOURS: 'Remover Horários',
  MODIFY_HOURS: 'Modificar Horários',
  BLOCK_DATES: 'Bloquear Datas',
  UNBLOCK_DATES: 'Desbloquear Datas',
  CHANGE_SERVICE_TYPE: 'Mudar Tipo de Atendimento',
}

const STATUS_CONFIG = {
  PENDING: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  APPROVED: { label: 'Aprovada', color: 'bg-green-100 text-green-800 border-green-300' },
  REJECTED: { label: 'Rejeitada', color: 'bg-red-100 text-red-800 border-red-300' },
}

const DAYS_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado']

export function ScheduleRequestsManager() {
  const [requests, setRequests] = useState<ScheduleRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [selectedRequest, setSelectedRequest] = useState<ScheduleRequest | null>(null)
  const [reviewNotes, setReviewNotes] = useState('')
  const [detailsOpen, setDetailsOpen] = useState(false)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async (status?: string) => {
    try {
      setLoading(true)
      const url = status ? `/api/schedules/requests?status=${status}` : '/api/schedules/requests'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setRequests(data.requests)
      }
    } catch (error) {
      console.error('Error loading requests:', error)
      toast.error('Erro ao carregar solicitações')
    } finally {
      setLoading(false)
    }
  }

  const handleReview = async (requestId: string, action: 'APPROVED' | 'REJECTED') => {
    try {
      setProcessing(requestId)
      const response = await fetch('/api/schedules/requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId,
          action,
          reviewNotes: reviewNotes || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao processar solicitação')
      }

      toast.success(action === 'APPROVED' ? 'Solicitação aprovada!' : 'Solicitação rejeitada')
      setDetailsOpen(false)
      setReviewNotes('')
      await loadRequests()
    } catch (error) {
      console.error('Error reviewing request:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao processar')
    } finally {
      setProcessing(null)
    }
  }

  const renderRequestData = (request: ScheduleRequest) => {
    const { requestType, requestData } = request

    switch (requestType) {
      case 'ADD_HOURS':
        return (
          <div className="space-y-2 bg-blue-50 p-3 rounded border border-blue-200">
            <div className="font-semibold text-blue-900">Adicionar Horário de Atendimento</div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><strong>Dia:</strong> {DAYS_OF_WEEK[requestData.dayOfWeek]}</div>
              <div><strong>Tipo:</strong> {requestData.serviceType === 'IN_PERSON' ? 'Presencial' : requestData.serviceType === 'REMOTE' ? 'Remoto' : 'Ambos'}</div>
              <div><strong>Início:</strong> {requestData.startTime}</div>
              <div><strong>Fim:</strong> {requestData.endTime}</div>
            </div>
          </div>
        )

      case 'BLOCK_DATES':
        const dates = requestData.dates || []
        return (
          <div className="space-y-2 bg-orange-50 p-3 rounded border border-orange-200">
            <div className="font-semibold text-orange-900">Bloquear Datas (Plantão/Férias)</div>
            <div className="text-sm">
              <strong>Tipo:</strong> {requestData.blockType || 'ON_CALL'}
            </div>
            {requestData.startTime && requestData.endTime && (
              <div className="text-sm">
                <strong>Horário:</strong> {requestData.startTime} - {requestData.endTime}
              </div>
            )}
            <div className="text-sm">
              <strong>Datas ({dates.length}):</strong>
              <div className="mt-1 max-h-32 overflow-y-auto grid grid-cols-3 gap-1">
                {dates.slice(0, 20).map((date: string, idx: number) => (
                  <div key={idx} className="bg-white px-2 py-1 rounded text-xs border">
                    {new Date(date).toLocaleDateString('pt-BR')}
                  </div>
                ))}
                {dates.length > 20 && (
                  <div className="text-xs font-semibold col-span-3">
                    ... e mais {dates.length - 20} datas
                  </div>
                )}
              </div>
            </div>
          </div>
        )

      default:
        return (
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <pre className="text-xs overflow-auto">{JSON.stringify(requestData, null, 2)}</pre>
          </div>
        )
    }
  }

  const pendingRequests = requests.filter((r) => r.status === 'PENDING')
  const reviewedRequests = requests.filter((r) => r.status !== 'PENDING')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Gerenciar Solicitações de Agenda
        </CardTitle>
        <CardDescription>
          Aprove ou rejeite solicitações de mudanças de agenda dos profissionais
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending">
              Pendentes ({pendingRequests.length})
            </TabsTrigger>
            <TabsTrigger value="reviewed">
              Revisadas ({reviewedRequests.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : pendingRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma solicitação pendente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border rounded-lg p-4 space-y-3 bg-white hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="font-semibold text-lg">{request.professional.name}</div>
                        <div className="text-sm text-gray-600">
                          {request.professional.speciality || request.professional.email}
                        </div>
                        <div className="text-xs text-gray-500">
                          Solicitado {format(new Date(request.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      </div>
                      <Badge className={STATUS_CONFIG[request.status].color}>
                        {REQUEST_TYPE_LABELS[request.requestType] || request.requestType}
                      </Badge>
                    </div>

                    {request.reason && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <strong>Motivo:</strong> {request.reason}
                        </AlertDescription>
                      </Alert>
                    )}

                    {renderRequestData(request)}

                    <div className="flex gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedRequest(request)
                          setDetailsOpen(true)
                        }}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Ver Detalhes
                      </Button>
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleReview(request.id, 'APPROVED')}
                        disabled={processing === request.id}
                      >
                        {processing === request.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Aprovar
                          </>
                        )}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setSelectedRequest(request)
                          setDetailsOpen(true)
                        }}
                        disabled={processing === request.id}
                      >
                        <XCircle className="h-4 w-4 mr-1" />
                        Rejeitar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reviewed" className="space-y-4">
            {reviewedRequests.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhuma solicitação revisada</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reviewedRequests.map((request) => (
                  <div
                    key={request.id}
                    className="border rounded-lg p-4 space-y-2 bg-gray-50"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{request.professional.name}</div>
                        <div className="text-sm text-gray-600">
                          {REQUEST_TYPE_LABELS[request.requestType]}
                        </div>
                      </div>
                      <Badge className={STATUS_CONFIG[request.status].color}>
                        {STATUS_CONFIG[request.status].label}
                      </Badge>
                    </div>
                    {request.reviewNotes && (
                      <div className="text-sm text-gray-600 bg-white p-2 rounded">
                        <strong>Observação:</strong> {request.reviewNotes}
                      </div>
                    )}
                    <div className="text-xs text-gray-500">
                      Revisado por {request.reviewer?.name} em{' '}
                      {request.reviewedAt && format(new Date(request.reviewedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Dialog de Detalhes/Rejeição */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Revisar Solicitação</DialogTitle>
              <DialogDescription>
                Analise os detalhes e adicione observações se necessário
              </DialogDescription>
            </DialogHeader>
            
            {selectedRequest && (
              <div className="space-y-4">
                <div>
                  <strong>Profissional:</strong> {selectedRequest.professional.name}
                </div>
                <div>
                  <strong>Tipo:</strong> {REQUEST_TYPE_LABELS[selectedRequest.requestType]}
                </div>
                
                {renderRequestData(selectedRequest)}

                <div className="space-y-2">
                  <Label htmlFor="review-notes">Observações (opcional)</Label>
                  <Textarea
                    id="review-notes"
                    placeholder="Adicione observações sobre esta decisão..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={() => handleReview(selectedRequest.id, 'APPROVED')}
                    disabled={!!processing}
                  >
                    {processing ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Aprovar
                  </Button>
                  <Button
                    className="flex-1"
                    variant="destructive"
                    onClick={() => handleReview(selectedRequest.id, 'REJECTED')}
                    disabled={!!processing}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Rejeitar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

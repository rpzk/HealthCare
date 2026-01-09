'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { ActionBar } from '@/components/navigation/action-bar'
import { ConfirmationDialog } from '@/components/dialogs/confirmation-dialog'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import {
  Stethoscope,
  User,
  Calendar,
  Clock,
  FileText,
  AlertTriangle,
  Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Referral {
  id: string
  specialty: string
  description: string
  priority: string
  status: string
  notes?: string
  createdAt: string
  updatedAt: string
  patient: {
    name: string
    id: string
  }
  doctor: {
    name: string
    id: string
    speciality?: string
  }
  consultation?: {
    id: string
    date: string
  }
}

const STATUS_LABELS: Record<string, string> = {
  'PENDING': 'Pendente',
  'ACCEPTED': 'Aceita',
  'IN_PROGRESS': 'Em Andamento',
  'COMPLETED': 'Concluída',
  'CANCELLED': 'Cancelada',
}

const PRIORITY_LABELS: Record<string, string> = {
  'LOW': 'Baixa',
  'NORMAL': 'Normal',
  'HIGH': 'Alta',
  'URGENT': 'Urgente',
}

export default function ReferralDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { toast } = useToast()
  
  const id = (params?.id as string) || ''
  const [referral, setReferral] = useState<Referral | null>(null)
  const [loading, setLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false)
  const [openCancelDialog, setOpenCancelDialog] = useState(false)

  useEffect(() => {
    const fetchReferral = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/referrals/${id}`)
        if (!response.ok) throw new Error('Falha ao carregar referência')
        
        const data = await response.json()
        setReferral(data.referral || data)
      } catch (err) {
        console.error('Erro ao buscar referência:', err)
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar a referência',
          variant: 'destructive'
        })
      } finally {
        setLoading(false)
      }
    }

    if (id) fetchReferral()
  }, [id, toast])

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/referrals/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Falha ao deletar')

      toast({
        title: 'Sucesso',
        description: 'Referência deletada com sucesso',
      })

      router.push('/referrals')
    } catch (err) {
      console.error('Erro ao deletar:', err)
      toast({
        title: 'Erro',
        description: 'Não foi possível deletar a referência',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/referrals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })

      if (!response.ok) throw new Error('Falha ao cancelar')

      toast({
        title: 'Sucesso',
        description: 'Referência cancelada com sucesso',
      })

      setReferral((prev) => prev ? { ...prev, status: 'CANCELLED' } : null)
    } catch (err) {
      console.error('Erro ao cancelar:', err)
      toast({
        title: 'Erro',
        description: 'Não foi possível cancelar a referência',
        variant: 'destructive'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300">
        <Header />
        <div className="flex pt-20">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          </main>
        </div>
      </div>
    )
  }

  if (!referral) {
    return (
      <div className="min-h-screen bg-background transition-colors duration-300">
        <Header />
        <div className="flex pt-20">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <div className="text-center py-12">
              <AlertTriangle className="h-12 w-12 text-yellow-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Referência não encontrada</h2>
              <Button onClick={() => router.push('/referrals')}>
                Voltar para Referências
              </Button>
            </div>
          </main>
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
            {/* Page Header */}
            <PageHeader
              title="Detalhes da Referência"
              description={`Encaminhamento para ${referral.specialty}`}
              breadcrumbs={[
                { label: 'Dashboard', href: '/' },
                { label: 'Referências', href: '/referrals' },
                { label: referral.specialty, href: `/referrals/${referral.id}` },
              ]}
            />

            {/* Action Bar */}
            <ActionBar
              title={`${referral.specialty} - ${PRIORITY_LABELS[referral.priority as keyof typeof PRIORITY_LABELS] || referral.priority}`}
              backUrl="/referrals"
              canCancel={referral.status !== 'CANCELLED' && referral.status !== 'COMPLETED'}
              onCancel={() => setOpenCancelDialog(true)}
              canDelete={true}
              onDelete={() => setOpenDeleteDialog(true)}
              isLoading={isDeleting}
            />

            {/* Status Info */}
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className="w-fit">
                      {STATUS_LABELS[referral.status as keyof typeof STATUS_LABELS] || referral.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Prioridade</p>
                    <Badge className="w-fit" variant="outline">
                      {PRIORITY_LABELS[referral.priority as keyof typeof PRIORITY_LABELS] || referral.priority}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Criada em</p>
                    <p className="font-medium">
                      {format(new Date(referral.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-3 gap-6">
              {/* Left: Details */}
              <div className="col-span-2 space-y-6">
                {/* Especialidade */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Stethoscope className="h-5 w-5" />
                      Especialidade Solicitada
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-lg font-semibold">{referral.specialty}</p>
                  </CardContent>
                </Card>

                {/* Descrição */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Motivo da Referência
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base whitespace-pre-wrap">
                      {referral.description}
                    </p>
                  </CardContent>
                </Card>

                {/* Notas */}
                {referral.notes && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Notas Adicionais</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                        {referral.notes}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right: Sidebar Info */}
              <div className="space-y-4">
                {/* Paciente */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Paciente
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{referral.patient.name}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ID: {referral.patient.id}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-4"
                      onClick={() => router.push(`/patients/${referral.patient.id}`)}
                    >
                      Ver Paciente
                    </Button>
                  </CardContent>
                </Card>

                {/* Médico Solicitante */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Stethoscope className="h-4 w-4" />
                      Médico Solicitante
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-medium">{referral.doctor.name}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {referral.doctor.speciality || 'Especialidade não informada'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      ID: {referral.doctor.id}
                    </p>
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Criada:</span>
                      <span className="font-medium">
                        {format(new Date(referral.createdAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Atualizada:</span>
                      <span className="font-medium">
                        {format(new Date(referral.updatedAt), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Dialogs */}
      <ConfirmationDialog
        open={openCancelDialog}
        onOpenChange={setOpenCancelDialog}
        title="Cancelar referência?"
        description="Ao cancelar a referência, ela não será mais considerada válida. Esta ação pode ser desfeita."
        confirmText="Cancelar Referência"
        cancelText="Manter"
        type="warning"
        isLoading={isDeleting}
        onConfirm={handleCancel}
      />

      <ConfirmationDialog
        open={openDeleteDialog}
        onOpenChange={setOpenDeleteDialog}
        title="Deletar referência?"
        description="Esta ação não pode ser desfeita. A referência será permanentemente removida do sistema."
        confirmText="Deletar"
        cancelText="Cancelar"
        type="danger"
        isLoading={isDeleting}
        onConfirm={handleDelete}
      />
    </div>
  )
}


'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { CertificateForm } from '@/components/certificates/certificate-form'
import { CertificatesList } from '@/components/certificates/certificates-list'
import { Plus, FileText, Loader2, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Certificate {
  id: string
  sequenceNumber: number
  year: number
  type: string
  title: string
  patient?: { id: string; name: string; email: string }
  doctor?: { id: string; name: string }
  startDate: string
  endDate?: string
  content: string
  issuedAt: string
  revokedAt?: string
  pdfPath?: string
}

export default function CertificatesPage() {
  return (
    <Suspense fallback={<div className="p-6 text-center">Carregando...</div>}>
      <CertificatesContent />
    </Suspense>
  )
}

function CertificatesContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(
    searchParams?.get('patientId') || null
  )

  // Carregar informações do usuário
  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await fetch('/api/profile')
        if (res.ok) {
          const data = await res.json()
          setUserRole(data.role)
          setUserId(data.id)
        }
      } catch (error) {
        console.error('Error fetching user info:', error)
      }
    }
    fetchUserInfo()
  }, [])

  // Carregar atestados
  useEffect(() => {
    const fetchCertificates = async () => {
      setLoading(true)
      try {
        let url = '/api/certificates'
        if (selectedPatientId) {
          url += `?patientId=${selectedPatientId}`
        }
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          setCertificates(data.certificates || data)
        }
      } catch (error) {
        console.error('Error fetching certificates:', error)
      } finally {
        setLoading(false)
      }
    }

    if (userId) {
      fetchCertificates()
    }
  }, [userId, selectedPatientId])

  const handleCertificateCreated = (newCertificate: Certificate) => {
    setCertificates([newCertificate, ...certificates])
    setShowForm(false)
  }

  const canCreateCertificates = ['DOCTOR', 'ADMIN'].includes(userRole || '')

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Atestados Médicos</h1>
          <p className="text-muted-foreground mt-2">
            Emita, gerencie e valide atestados médicos digitais
          </p>
        </div>
      </div>

      {/* Alertas Informativos */}
      {canCreateCertificates && (
        <Alert className="bg-blue-50 border-blue-200">
          <FileText className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-700">
            Atestados emitidos são numerados sequencialmente (001/2025, 002/2025, etc) e podem ser validados publicamente via QR Code.
          </AlertDescription>
        </Alert>
      )}

      {!canCreateCertificates && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-700">
            Você está visualizando seus atestados recebidos. Apenas médicos e administradores podem emitir atestados.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="list" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="list">
            <FileText className="h-4 w-4 mr-2" />
            Listagem
            {certificates.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {certificates.length}
              </Badge>
            )}
          </TabsTrigger>
          {canCreateCertificates && (
            <TabsTrigger value="create">
              <Plus className="h-4 w-4 mr-2" />
              Novo Atestado
            </TabsTrigger>
          )}
        </TabsList>

        {/* Aba de Listagem */}
        <TabsContent value="list" className="space-y-4">
          {loading ? (
            <Card>
              <CardContent className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-muted-foreground">Carregando atestados...</span>
              </CardContent>
            </Card>
          ) : certificates.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-10">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">
                  {canCreateCertificates
                    ? 'Nenhum atestado emitido ainda. Crie um novo para começar.'
                    : 'Você não tem atestados recebidos.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            <CertificatesList 
              patientId={selectedPatientId || undefined}
            />
          )}
        </TabsContent>

        {/* Aba de Criação */}
        {canCreateCertificates && (
          <TabsContent value="create" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Novo Atestado Médico</CardTitle>
                <CardDescription>
                  Preencha os dados do atestado. O documento será numerado automaticamente.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CertificateForm
                  patientId={selectedPatientId || ''}
                  patientName=""
                  onSuccess={handleCertificateCreated}
                />
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Resumo de Estatísticas */}
      {certificates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Atestados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{certificates.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Este Ano
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {certificates.filter(c => c.year === new Date().getFullYear()).length}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Revogados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {certificates.filter(c => c.revokedAt).length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { RefreshCw, ShieldCheck, KeyRound, FileCheck2, AlertTriangle, Eye, Power, Clock } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

type Certificate = {
  id: string
  userId: string
  certificateType: string
  issuer: string
  subject: string
  serialNumber: string
  notBefore: string
  notAfter: string
  isActive: boolean
  isHardwareToken: boolean
  tokenSerialNumber?: string | null
  lastUsedAt?: string | null
  usageCount: number
  createdAt: string
  revokedAt?: string | null
  revokedReason?: string | null
}

type Signature = {
  id: string
  documentType: string
  documentId: string
  signerId: string
  signatureAlgorithm: string
  signatureHash: string
  signedAt: string
  certificate: {
    id: string
    userId: string
    certificateType: string
    issuer: string
    subject: string
    serialNumber: string
    isActive: boolean
    notAfter: string
  }
  signer?: {
    id: string
    name?: string | null
    email?: string | null
  } | null
}

function formatDate(value?: string | null) {
  if (!value) return '-'
  const d = new Date(value)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString()
}

function validityBadge(notAfter: string, isActive: boolean) {
  const now = new Date()
  const end = new Date(notAfter)
  const diffMs = end.getTime() - now.getTime()
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (!isActive) return { label: 'Inativo', tone: 'outline' as const, days }
  if (days < 0) return { label: 'Expirado', tone: 'destructive' as const, days }
  if (days <= 30) return { label: `${days}d`, tone: 'secondary' as const, days }
  return { label: `${days}d`, tone: 'default' as const, days }
}

export default function DigitalSignaturesAdminPage() {
  const [certificates, setCertificates] = useState<Certificate[]>([])
  const [signatures, setSignatures] = useState<Signature[]>([])
  const [loading, setLoading] = useState(false)
  const [serialFilter, setSerialFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'inactive'>('all')
  const [docTypeFilter, setDocTypeFilter] = useState('')
  const [signerFilter, setSignerFilter] = useState('')
  const [fromDate, setFromDate] = useState('')
  const [toDate, setToDate] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [totalSignatures, setTotalSignatures] = useState(0)
  const [selectedSignature, setSelectedSignature] = useState<Signature | null>(null)
  const [validationResult, setValidationResult] = useState<any>(null)
  const [validating, setValidating] = useState(false)

  const loadData = async () => {
    try {
      setLoading(true)
      const certQuery = serialFilter ? `?serialNumber=${encodeURIComponent(serialFilter)}` : ''
      const sigParams = new URLSearchParams()
      if (docTypeFilter) sigParams.set('documentType', docTypeFilter)
      if (signerFilter) sigParams.set('signer', signerFilter)
      if (fromDate) sigParams.set('from', fromDate)
      if (toDate) sigParams.set('to', toDate)
      sigParams.set('limit', String(pageSize))
      sigParams.set('offset', String((page - 1) * pageSize))

      const [certRes, sigRes] = await Promise.all([
        fetch(`/api/digital-signatures/certificates${certQuery}`),
        fetch(`/api/digital-signatures/signatures${sigParams.toString() ? `?${sigParams.toString()}` : ''}`),
      ])

      if (certRes.ok) {
        const data = await certRes.json()
        setCertificates(data.certificates || [])
      }

      if (sigRes.ok) {
        const data = await sigRes.json()
        setSignatures(data.signatures || [])
        setTotalSignatures(data.total || 0)
      }
    } catch (error) {
      console.error('Erro ao carregar dados de assinaturas digitais:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serialFilter, docTypeFilter, signerFilter, fromDate, toDate, page])

  useEffect(() => {
    setPage(1)
  }, [serialFilter, docTypeFilter, signerFilter, fromDate, toDate])

  const stats = useMemo(() => {
    const activeCerts = certificates.filter((c) => c.isActive).length
    const expiredCerts = certificates.filter((c) => new Date(c.notAfter) < new Date()).length
    return {
      totalCerts: certificates.length,
      activeCerts,
      expiredCerts,
      totalSignatures: totalSignatures,
    }
  }, [certificates, totalSignatures])

  const filteredCertificates = useMemo(() => {
    return certificates.filter((c) => {
      const expired = new Date(c.notAfter) < new Date()
      if (statusFilter === 'active' && (!c.isActive || expired)) return false
      if (statusFilter === 'expired' && !expired) return false
      if (statusFilter === 'inactive' && c.isActive) return false
      return true
    })
  }, [certificates, statusFilter])

  const filteredSignatures = signatures

  const handleToggleCertificate = async (cert: Certificate) => {
    try {
      let revokeReason: string | undefined
      if (cert.isActive) {
        revokeReason = window.prompt('Motivo da revogação?', 'Revogado manualmente') || undefined
      }
      const res = await fetch(`/api/digital-signatures/certificates/${cert.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !cert.isActive, revokeReason }),
      })
      if (!res.ok) throw new Error('Falha ao atualizar certificado')
      await loadData()
    } catch (error) {
      console.error('Erro ao alternar certificado:', error)
    }
  }

  const handleDownloadPublicKey = async (cert: Certificate) => {
    try {
      const res = await fetch(`/api/digital-signatures/certificates/${cert.id}/public-key`)
      if (!res.ok) throw new Error('Falha ao baixar chave pública')
      const text = await res.text()
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `public-key-${cert.serialNumber}.pem`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Erro ao baixar chave pública:', error)
    }
  }

  const openSignature = (sig: Signature) => {
    setSelectedSignature(sig)
    setValidationResult(null)
  }

  const revalidateSignature = async () => {
    if (!selectedSignature) return
    try {
      setValidating(true)
      const res = await fetch(`/api/digital-signatures/validate/${selectedSignature.signatureHash}`)
      if (!res.ok) throw new Error('Falha ao validar assinatura')
      const data = await res.json()
      setValidationResult(data)
    } catch (error) {
      console.error('Erro ao validar assinatura:', error)
      setValidationResult({ valid: false, reason: 'Erro ao validar' })
    } finally {
      setValidating(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-6 space-y-6 transition-colors duration-300">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm text-muted-foreground">Governança & Segurança</p>
          <h1 className="text-2xl font-semibold text-foreground">Assinaturas Digitais</h1>
          <p className="text-sm text-muted-foreground">Certificados ICP-Brasil e documentos assinados</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Filtrar certificado por serial</p>
          <Input
            value={serialFilter}
            onChange={(e) => setSerialFilter(e.target.value)}
            placeholder="Buscar serial..."
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Status do certificado</p>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Ativos</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
              <SelectItem value="inactive">Inativos</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Tipo de documento (assinaturas)</p>
          <Input
            value={docTypeFilter}
            onChange={(e) => setDocTypeFilter(e.target.value)}
            placeholder="PRESCRIPTION, MEDICAL_CERTIFICATE..."
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Assinante (nome/email/id)</p>
          <Input
            value={signerFilter}
            onChange={(e) => setSignerFilter(e.target.value)}
            placeholder="Buscar assinante..."
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Assinado de</p>
          <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Assinado até</p>
          <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Certificados</CardTitle>
            <KeyRound className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCerts}</div>
            <p className="text-xs text-muted-foreground">Total cadastrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeCerts}</div>
            <p className="text-xs text-muted-foreground">Dentro da validade</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expirados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.expiredCerts}</div>
            <p className="text-xs text-muted-foreground">Fora da validade</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas</CardTitle>
            <FileCheck2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSignatures}</div>
            <p className="text-xs text-muted-foreground">Registros recentes</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Certificados</CardTitle>
              <p className="text-sm text-muted-foreground">ICP-Brasil (A1/A3/A4)</p>
            </div>
            <Badge variant="outline">{certificates.length}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Serial</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Emissor</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Uso</TableHead>
                    <TableHead className="text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCertificates
                    .slice()
                    .sort((a, b) => new Date(a.notAfter).getTime() - new Date(b.notAfter).getTime())
                    .map((c) => {
                      const badge = validityBadge(c.notAfter, c.isActive)
                      return (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono text-xs">{c.serialNumber}</TableCell>
                          <TableCell>{c.certificateType}</TableCell>
                          <TableCell>
                            <div className="text-sm font-medium">{c.issuer}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">{c.subject}</div>
                          </TableCell>
                          <TableCell>
                            <div className="text-xs">{formatDate(c.notBefore)}</div>
                            <div className="text-xs text-muted-foreground">até {formatDate(c.notAfter)}</div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Badge variant={badge.tone}>{badge.label}</Badge>
                              {c.revokedReason && (
                                <span className="text-[11px] text-muted-foreground">{c.revokedReason}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm">{c.usageCount}</TableCell>
                          <TableCell className="text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleCertificate(c)}
                              disabled={badge.label === 'Expirado'}
                            >
                              <Power className="h-4 w-4 mr-1" />
                              {c.isActive ? 'Desativar' : 'Ativar'}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadPublicKey(c)}
                            >
                              <Clock className="h-4 w-4 mr-1" />
                              Chave pública
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  {filteredCertificates.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-6">
                        Nenhum certificado encontrado.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Assinaturas Registradas</CardTitle>
              <p className="text-sm text-muted-foreground">Últimas operações</p>
            </div>
            <Badge variant="outline">{totalSignatures}</Badge>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Assinante</TableHead>
                    <TableHead>Certificado</TableHead>
                    <TableHead>Hash</TableHead>
                    <TableHead>Assinado em</TableHead>
                    <TableHead className="text-right">Detalhes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSignatures.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell>
                        <div className="text-sm font-medium">{s.documentType}</div>
                        <div className="text-xs text-muted-foreground">ID: {s.documentId}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm font-medium">{s.signer?.name || 'Usuário'}</div>
                        <div className="text-xs text-muted-foreground">{s.signer?.email || s.signerId}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-mono">{s.certificate.serialNumber}</div>
                        <div className="text-xs text-muted-foreground">{s.certificate.certificateType}</div>
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        <div className="text-xs font-mono line-clamp-1">{s.signatureHash}</div>
                        <div className="text-[11px] text-muted-foreground">{s.signatureAlgorithm}</div>
                      </TableCell>
                      <TableCell>
                        <div className="text-xs">{formatDate(s.signedAt)}</div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => openSignature(s)}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredSignatures.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">
                        Nenhuma assinatura encontrada.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="flex items-center justify-between p-3 text-sm text-muted-foreground">
              <div>
                Página {page} — mostrando {filteredSignatures.length} de {totalSignatures}
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading || page * pageSize >= totalSignatures}
                >
                  Próxima
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog
        open={Boolean(selectedSignature)}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedSignature(null)
            setValidationResult(null)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalhes da Assinatura</DialogTitle>
            <DialogDescription>Metadados e validação</DialogDescription>
          </DialogHeader>

          {selectedSignature && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-muted-foreground text-xs">Documento</p>
                  <p className="font-medium">{selectedSignature.documentType}</p>
                  <p className="text-xs text-muted-foreground">ID: {selectedSignature.documentId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Assinante</p>
                  <p className="font-medium">{selectedSignature.signer?.name || 'Usuário'}</p>
                  <p className="text-xs text-muted-foreground">{selectedSignature.signer?.email || selectedSignature.signerId}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Certificado</p>
                  <p className="font-mono text-xs">{selectedSignature.certificate.serialNumber}</p>
                  <p className="text-xs text-muted-foreground">{selectedSignature.certificate.certificateType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Hash</p>
                  <p className="font-mono text-xs break-all">{selectedSignature.signatureHash}</p>
                  <p className="text-[11px] text-muted-foreground">{selectedSignature.signatureAlgorithm}</p>
                </div>
                <div>
                  <p className="text-muted-foreground text-xs">Assinado em</p>
                  <p>{formatDate(selectedSignature.signedAt)}</p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-xs text-muted-foreground">Validação</p>
                  <p className="text-sm">
                    {validationResult
                      ? validationResult.valid
                        ? 'Assinatura válida (janela e metadados)'
                        : 'Assinatura inválida'
                      : 'Revalide para checar'}
                  </p>
                  {validationResult?.certificate && (
                    <p className="text-xs text-muted-foreground">Cert: {validationResult.certificate.serialNumber}</p>
                  )}
                  {validationResult?.certificate?.revokedReason && (
                    <p className="text-xs text-muted-foreground">Motivo: {validationResult.certificate.revokedReason}</p>
                  )}
                </div>
                <Button size="sm" onClick={revalidateSignature} disabled={validating}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${validating ? 'animate-spin' : ''}`} />
                  Revalidar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

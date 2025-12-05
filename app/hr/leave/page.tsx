'use client'

import { useState } from 'react'
import { 
  Calendar,
  Plane,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  Loader2,
  Users
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/hooks/use-toast'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface LeaveRequest {
  id: string
  staffId: string
  staffName: string
  role: string
  type: 'vacation' | 'sick' | 'personal' | 'maternity' | 'other'
  startDate: string
  endDate: string
  status: 'pending' | 'approved' | 'rejected'
  reason?: string
  createdAt: string
}

const LEAVE_TYPES = {
  vacation: { label: 'Férias', color: 'bg-blue-100 text-blue-800' },
  sick: { label: 'Licença Médica', color: 'bg-red-100 text-red-800' },
  personal: { label: 'Pessoal', color: 'bg-purple-100 text-purple-800' },
  maternity: { label: 'Maternidade/Paternidade', color: 'bg-pink-100 text-pink-800' },
  other: { label: 'Outro', color: 'bg-gray-100 text-gray-800' },
}

const STATUS_CONFIG = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800', icon: AlertCircle },
  approved: { label: 'Aprovado', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  rejected: { label: 'Rejeitado', color: 'bg-red-100 text-red-800', icon: XCircle },
}

export default function HRLeavePage() {
  const [requests, setRequests] = useState<LeaveRequest[]>([
    {
      id: '1',
      staffId: '1',
      staffName: 'Dr. João Santos',
      role: 'Médico',
      type: 'vacation',
      startDate: '2025-01-15',
      endDate: '2025-01-30',
      status: 'pending',
      reason: 'Férias anuais',
      createdAt: '2024-12-01'
    },
    {
      id: '2',
      staffId: '2',
      staffName: 'Enf. Maria Silva',
      role: 'Enfermeira',
      type: 'sick',
      startDate: '2024-12-10',
      endDate: '2024-12-12',
      status: 'approved',
      reason: 'Atestado médico',
      createdAt: '2024-12-09'
    },
    {
      id: '3',
      staffId: '3',
      staffName: 'Dra. Ana Costa',
      role: 'Médica',
      type: 'personal',
      startDate: '2024-12-20',
      endDate: '2024-12-20',
      status: 'approved',
      reason: 'Compromisso pessoal',
      createdAt: '2024-12-05'
    }
  ])

  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)

  const handleApprove = (id: string) => {
    setRequests(prev => prev.map(r => 
      r.id === id ? { ...r, status: 'approved' as const } : r
    ))
    toast({ title: 'Solicitação aprovada' })
  }

  const handleReject = (id: string) => {
    setRequests(prev => prev.map(r => 
      r.id === id ? { ...r, status: 'rejected' as const } : r
    ))
    toast({ title: 'Solicitação rejeitada' })
  }

  const filteredRequests = requests.filter(r => {
    const matchesSearch = r.staffName.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === 'all' || r.status === statusFilter
    const matchesType = typeFilter === 'all' || r.type === typeFilter
    return matchesSearch && matchesStatus && matchesType
  })

  const stats = {
    pending: requests.filter(r => r.status === 'pending').length,
    approved: requests.filter(r => r.status === 'approved').length,
    totalDays: requests
      .filter(r => r.status === 'approved')
      .reduce((acc, r) => acc + differenceInDays(new Date(r.endDate), new Date(r.startDate)) + 1, 0)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Férias e Ausências</h1>
          <p className="text-muted-foreground">
            Gerencie solicitações de férias, licenças e ausências
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Solicitação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Aprovadas</p>
                <p className="text-2xl font-bold">{stats.approved}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Dias Aprovados</p>
                <p className="text-2xl font-bold">{stats.totalDays}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{requests.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(LEAVE_TYPES).map(([key, config]) => (
                  <SelectItem key={key} value={key}>{config.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Solicitações ({filteredRequests.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredRequests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Plane className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma solicitação encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRequests.map((request) => {
                  const days = differenceInDays(new Date(request.endDate), new Date(request.startDate)) + 1
                  const StatusIcon = STATUS_CONFIG[request.status].icon
                  return (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarFallback>{getInitials(request.staffName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{request.staffName}</p>
                            <p className="text-sm text-muted-foreground">{request.role}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={LEAVE_TYPES[request.type].color}>
                          {LEAVE_TYPES[request.type].label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p>{format(new Date(request.startDate), "dd/MM/yyyy", { locale: ptBR })}</p>
                          <p className="text-sm text-muted-foreground">
                            até {format(new Date(request.endDate), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{days} {days === 1 ? 'dia' : 'dias'}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_CONFIG[request.status].color}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {STATUS_CONFIG[request.status].label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {request.status === 'pending' && (
                          <div className="flex justify-end gap-2">
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-green-600"
                              onClick={() => handleApprove(request.id)}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Aprovar
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-red-600"
                              onClick={() => handleReject(request.id)}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Rejeitar
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog - Nova Solicitação */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Solicitação</DialogTitle>
            <DialogDescription>
              Registre uma solicitação de férias ou ausência
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select defaultValue="vacation">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAVE_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input type="date" />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input type="date" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea placeholder="Descreva o motivo da solicitação..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={() => {
              toast({ title: 'Solicitação registrada' })
              setDialogOpen(false)
            }}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

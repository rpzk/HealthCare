'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  Building2,
  Wrench,
  Plus,
  Search,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Settings,
  Calendar
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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

interface Resource {
  id: string
  name: string
  description?: string
  type: 'ROOM' | 'EQUIPMENT'
  category: string
  location?: string
  status: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'INACTIVE'
  capacity?: number
  floor?: string
  model?: string
  serialNumber?: string
  manufacturer?: string
  isBookable: boolean
  _count?: { bookings: number; maintenances: number }
}

const CATEGORIES = {
  ROOM: [
    { id: 'consultorio', name: 'Consultório' },
    { id: 'procedimento', name: 'Sala de Procedimentos' },
    { id: 'exame', name: 'Sala de Exames' },
    { id: 'triagem', name: 'Triagem' },
    { id: 'espera', name: 'Sala de Espera' },
    { id: 'reuniao', name: 'Sala de Reunião' },
    { id: 'administrativo', name: 'Administrativo' },
  ],
  EQUIPMENT: [
    { id: 'diagnostico', name: 'Diagnóstico' },
    { id: 'tratamento', name: 'Tratamento' },
    { id: 'monitoramento', name: 'Monitoramento' },
    { id: 'informatica', name: 'Informática' },
    { id: 'laboratorio', name: 'Laboratório' },
    { id: 'imagem', name: 'Imagem' },
  ]
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  AVAILABLE: { label: 'Disponível', color: 'bg-green-100 text-green-800' },
  IN_USE: { label: 'Em Uso', color: 'bg-blue-100 text-blue-800' },
  MAINTENANCE: { label: 'Manutenção', color: 'bg-yellow-100 text-yellow-800' },
  INACTIVE: { label: 'Inativo', color: 'bg-gray-100 text-gray-800' },
}

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'ROOM' | 'EQUIPMENT'>('ROOM')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: 'ROOM' as 'ROOM' | 'EQUIPMENT',
    category: '',
    location: '',
    status: 'AVAILABLE' as Resource['status'],
    capacity: 3,
    floor: '',
    model: '',
    serialNumber: '',
    manufacturer: '',
    isBookable: true,
  })

  const fetchResources = useCallback(async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('type', activeTab)
      if (search) params.set('search', search)
      
      const res = await fetch(`/api/resources?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar recursos')
      
      const json = await res.json()
      setResources(json.data || [])
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar os recursos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [activeTab, search])

  useEffect(() => {
    fetchResources()
  }, [fetchResources])

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      type: activeTab,
      category: '',
      location: '',
      status: 'AVAILABLE',
      capacity: 3,
      floor: '',
      model: '',
      serialNumber: '',
      manufacturer: '',
      isBookable: true,
    })
    setEditingResource(null)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.category) {
      toast({ title: 'Erro', description: 'Preencha nome e categoria', variant: 'destructive' })
      return
    }

    try {
      setSubmitting(true)
      
      const url = editingResource 
        ? `/api/resources/${editingResource.id}`
        : '/api/resources'
      
      const method = editingResource ? 'PATCH' : 'POST'
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          capacity: formData.type === 'ROOM' ? formData.capacity : undefined,
        })
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar')
      }

      toast({ title: editingResource ? 'Recurso atualizado' : 'Recurso criado' })
      setDialogOpen(false)
      resetForm()
      fetchResources()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido'
      toast({ title: 'Erro', description: message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource)
    setFormData({
      name: resource.name,
      description: resource.description || '',
      type: resource.type,
      category: resource.category,
      location: resource.location || '',
      status: resource.status,
      capacity: resource.capacity || 3,
      floor: resource.floor || '',
      model: resource.model || '',
      serialNumber: resource.serialNumber || '',
      manufacturer: resource.manufacturer || '',
      isBookable: resource.isBookable,
    })
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este recurso?')) return

    try {
      const res = await fetch(`/api/resources/${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao excluir')
      }
      toast({ title: 'Recurso excluído' })
      fetchResources()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro desconhecido'
      toast({ title: 'Erro', description: message, variant: 'destructive' })
    }
  }

  const filteredResources = resources.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.location?.toLowerCase().includes(search.toLowerCase())
  )

  const stats = {
    total: resources.length,
    available: resources.filter(r => r.status === 'AVAILABLE').length,
    inUse: resources.filter(r => r.status === 'IN_USE').length,
    maintenance: resources.filter(r => r.status === 'MAINTENANCE').length,
  }

  if (loading && resources.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recursos</h1>
          <p className="text-muted-foreground">
            Gerencie salas e equipamentos da clínica
          </p>
        </div>
        <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Recurso
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                {activeTab === 'ROOM' ? <Building2 className="h-6 w-6 text-blue-600" /> : <Wrench className="h-6 w-6 text-blue-600" />}
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{stats.total}</p>
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
                <p className="text-sm text-muted-foreground">Disponíveis</p>
                <p className="text-2xl font-bold">{stats.available}</p>
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
                <p className="text-sm text-muted-foreground">Em Uso</p>
                <p className="text-2xl font-bold">{stats.inUse}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                <Settings className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Manutenção</p>
                <p className="text-2xl font-bold">{stats.maintenance}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs and Filter */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'ROOM' | 'EQUIPMENT')}>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <TabsList>
            <TabsTrigger value="ROOM" className="gap-2">
              <Building2 className="h-4 w-4" />
              Salas
            </TabsTrigger>
            <TabsTrigger value="EQUIPMENT" className="gap-2">
              <Wrench className="h-4 w-4" />
              Equipamentos
            </TabsTrigger>
          </TabsList>
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{activeTab === 'ROOM' ? 'Salas' : 'Equipamentos'} ({filteredResources.length})</CardTitle>
              <CardDescription>
                {activeTab === 'ROOM' ? 'Consultórios, salas de procedimento e outros espaços' : 'Equipamentos médicos e de diagnóstico'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {filteredResources.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {activeTab === 'ROOM' ? <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" /> : <Wrench className="h-12 w-12 mx-auto mb-4 opacity-50" />}
                  <p>Nenhum {activeTab === 'ROOM' ? 'sala' : 'equipamento'} cadastrado</p>
                  <Button variant="outline" className="mt-4" onClick={() => { resetForm(); setDialogOpen(true); }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Categoria</TableHead>
                      <TableHead>Localização</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reservas</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredResources.map((resource) => (
                      <TableRow key={resource.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{resource.name}</p>
                            {resource.description && (
                              <p className="text-sm text-muted-foreground">{resource.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {CATEGORIES[resource.type]?.find(c => c.id === resource.category)?.name || resource.category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {resource.location || '-'}
                          {resource.floor && <span className="text-muted-foreground"> ({resource.floor})</span>}
                        </TableCell>
                        <TableCell>
                          <Badge className={STATUS_CONFIG[resource.status]?.color || ''}>
                            {STATUS_CONFIG[resource.status]?.label || resource.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {resource._count?.bookings || 0} agendadas
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="ghost" onClick={() => handleEdit(resource)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => handleDelete(resource.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingResource ? 'Editar' : 'Novo'} Recurso</DialogTitle>
            <DialogDescription>
              {formData.type === 'ROOM' ? 'Cadastre uma sala ou espaço' : 'Cadastre um equipamento'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData(prev => ({ ...prev, type: v as 'ROOM' | 'EQUIPMENT', category: '' }))}
                disabled={!!editingResource}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ROOM">Sala</SelectItem>
                  <SelectItem value="EQUIPMENT">Equipamento</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                placeholder={formData.type === 'ROOM' ? 'Ex: Consultório 01' : 'Ex: Eletrocardiografo'}
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Categoria *</Label>
              <Select
                value={formData.category}
                onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES[formData.type]?.map(cat => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Localização</Label>
                <Input
                  placeholder="Ex: Térreo, Bloco A"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, status: v as Resource['status'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                      <SelectItem key={key} value={key}>{config.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formData.type === 'ROOM' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Capacidade</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.capacity}
                    onChange={(e) => setFormData(prev => ({ ...prev, capacity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Andar</Label>
                  <Input
                    placeholder="Ex: Térreo, 1º andar"
                    value={formData.floor}
                    onChange={(e) => setFormData(prev => ({ ...prev, floor: e.target.value }))}
                  />
                </div>
              </div>
            )}

            {formData.type === 'EQUIPMENT' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Fabricante</Label>
                    <Input
                      placeholder="Ex: Philips, GE"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Modelo</Label>
                    <Input
                      placeholder="Ex: PageWriter TC30"
                      value={formData.model}
                      onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Número de Série</Label>
                  <Input
                    placeholder="Ex: SN123456789"
                    value={formData.serialNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                placeholder="Observações adicionais..."
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setDialogOpen(false); resetForm(); }} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingResource ? 'Salvar' : 'Criar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

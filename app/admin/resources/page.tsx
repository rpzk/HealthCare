'use client'

import { useState } from 'react'
import { 
  Monitor,
  Laptop,
  Bed,
  Stethoscope,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  Building2,
  Wrench
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import { toast } from '@/hooks/use-toast'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface Resource {
  id: string
  name: string
  type: 'room' | 'equipment'
  category: string
  location: string
  status: 'available' | 'in_use' | 'maintenance' | 'inactive'
  capacity?: number
  lastMaintenance?: string
}

const RESOURCE_TYPES = {
  room: { label: 'Salas', icon: Building2 },
  equipment: { label: 'Equipamentos', icon: Monitor }
}

const CATEGORIES = {
  room: [
    { id: 'consultorio', name: 'Consultório' },
    { id: 'procedimento', name: 'Sala de Procedimentos' },
    { id: 'exame', name: 'Sala de Exames' },
    { id: 'triagem', name: 'Triagem' },
    { id: 'espera', name: 'Sala de Espera' },
    { id: 'reuniao', name: 'Sala de Reunião' },
  ],
  equipment: [
    { id: 'diagnostico', name: 'Diagnóstico' },
    { id: 'tratamento', name: 'Tratamento' },
    { id: 'monitoramento', name: 'Monitoramento' },
    { id: 'informatica', name: 'Informática' },
    { id: 'laboratorio', name: 'Laboratório' },
  ]
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  available: { label: 'Disponível', color: 'bg-green-100 text-green-800' },
  in_use: { label: 'Em Uso', color: 'bg-blue-100 text-blue-800' },
  maintenance: { label: 'Manutenção', color: 'bg-yellow-100 text-yellow-800' },
  inactive: { label: 'Inativo', color: 'bg-gray-100 text-gray-800' },
}

export default function AdminResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([
    { id: '1', name: 'Consultório 01', type: 'room', category: 'consultorio', location: 'Térreo', status: 'available', capacity: 3 },
    { id: '2', name: 'Consultório 02', type: 'room', category: 'consultorio', location: 'Térreo', status: 'in_use', capacity: 3 },
    { id: '3', name: 'Sala de Triagem', type: 'room', category: 'triagem', location: 'Térreo', status: 'available', capacity: 5 },
    { id: '4', name: 'Eletrocardiografo', type: 'equipment', category: 'diagnostico', location: 'Sala Exames', status: 'available' },
    { id: '5', name: 'Oxímetro', type: 'equipment', category: 'monitoramento', location: 'Consultório 01', status: 'maintenance' },
  ])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'room' | 'equipment'>('room')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingResource, setEditingResource] = useState<Resource | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    type: 'room' as 'room' | 'equipment',
    category: '',
    location: '',
    status: 'available' as Resource['status'],
    capacity: 3
  })

  const handleSubmit = async () => {
    if (!formData.name) {
      toast({ title: 'Erro', description: 'Preencha o nome', variant: 'destructive' })
      return
    }

    if (editingResource) {
      setResources(prev => prev.map(r => 
        r.id === editingResource.id ? { ...r, ...formData } : r
      ))
      toast({ title: 'Recurso atualizado' })
    } else {
      const newResource: Resource = {
        id: Date.now().toString(),
        ...formData
      }
      setResources(prev => [...prev, newResource])
      toast({ title: 'Recurso criado' })
    }
    
    setDialogOpen(false)
    resetForm()
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: activeTab,
      category: '',
      location: '',
      status: 'available',
      capacity: 3
    })
    setEditingResource(null)
  }

  const handleEdit = (resource: Resource) => {
    setEditingResource(resource)
    setFormData({
      name: resource.name,
      type: resource.type,
      category: resource.category,
      location: resource.location,
      status: resource.status,
      capacity: resource.capacity || 3
    })
    setDialogOpen(true)
  }

  const handleDelete = (id: string) => {
    setResources(prev => prev.filter(r => r.id !== id))
    toast({ title: 'Recurso removido' })
  }

  const filteredResources = resources.filter(r => 
    r.type === activeTab &&
    (r.name.toLowerCase().includes(search.toLowerCase()) ||
     r.location.toLowerCase().includes(search.toLowerCase()))
  )

  const stats = {
    rooms: resources.filter(r => r.type === 'room').length,
    equipment: resources.filter(r => r.type === 'equipment').length,
    available: resources.filter(r => r.status === 'available').length,
    maintenance: resources.filter(r => r.status === 'maintenance').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Salas e Equipamentos</h1>
          <p className="text-muted-foreground">
            Gerencie os recursos físicos das unidades
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
                <Building2 className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Salas</p>
                <p className="text-2xl font-bold">{stats.rooms}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-full">
                <Monitor className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Equipamentos</p>
                <p className="text-2xl font-bold">{stats.equipment}</p>
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
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-full">
                <Wrench className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Manutenção</p>
                <p className="text-2xl font-bold">{stats.maintenance}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'room' | 'equipment')}>
        <TabsList>
          <TabsTrigger value="room" className="gap-2">
            <Building2 className="h-4 w-4" />
            Salas
          </TabsTrigger>
          <TabsTrigger value="equipment" className="gap-2">
            <Monitor className="h-4 w-4" />
            Equipamentos
          </TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardContent className="pt-6">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>

            {filteredResources.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum recurso encontrado</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Localização</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResources.map((resource) => (
                    <TableRow key={resource.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            {resource.type === 'room' ? (
                              <Building2 className="h-5 w-5 text-primary" />
                            ) : (
                              <Monitor className="h-5 w-5 text-primary" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{resource.name}</p>
                            {resource.capacity && (
                              <p className="text-sm text-muted-foreground">
                                Capacidade: {resource.capacity}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{resource.category}</Badge>
                      </TableCell>
                      <TableCell>{resource.location}</TableCell>
                      <TableCell>
                        <Badge className={STATUS_CONFIG[resource.status]?.color}>
                          {STATUS_CONFIG[resource.status]?.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(resource)}>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDelete(resource.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </Tabs>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingResource ? 'Editar Recurso' : 'Novo Recurso'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData({ ...formData, type: v as 'room' | 'equipment', category: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="room">Sala</SelectItem>
                  <SelectItem value="equipment">Equipamento</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Consultório 01"
              />
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select 
                value={formData.category} 
                onValueChange={(v) => setFormData({ ...formData, category: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES[formData.type].map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Localização</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ex: Térreo, Sala 101"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select 
                value={formData.status} 
                onValueChange={(v) => setFormData({ ...formData, status: v as Resource['status'] })}
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
            {formData.type === 'room' && (
              <div className="space-y-2">
                <Label>Capacidade</Label>
                <Input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
                  min={1}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

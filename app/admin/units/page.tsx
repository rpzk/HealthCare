'use client'

import { useEffect, useState } from 'react'
import { 
  Building2, 
  MapPin,
  Phone,
  Clock,
  Users,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
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
import { toast } from '@/hooks/use-toast'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'

interface HealthUnit {
  id: string
  name: string
  type: string
  address: string
  city: string
  state: string
  phone?: string
  email?: string
  isActive: boolean
  staffCount: number
  createdAt: string
}

const UNIT_TYPES = [
  { id: 'UBS', name: 'UBS - Unidade Básica de Saúde' },
  { id: 'USF', name: 'USF - Unidade de Saúde da Família' },
  { id: 'UPA', name: 'UPA - Unidade de Pronto Atendimento' },
  { id: 'HOSPITAL', name: 'Hospital' },
  { id: 'CLINICA', name: 'Clínica' },
  { id: 'LABORATORIO', name: 'Laboratório' },
  { id: 'FARMACIA', name: 'Farmácia Popular' },
]

export default function AdminUnitsPage() {
  const [units, setUnits] = useState<HealthUnit[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingUnit, setEditingUnit] = useState<HealthUnit | null>(null)
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'UBS',
    address: '',
    city: '',
    state: '',
    phone: '',
    email: '',
    isActive: true
  })

  useEffect(() => {
    fetchUnits()
  }, [])

  const fetchUnits = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/units')
      if (response.ok) {
        const data = await response.json()
        setUnits(data.units || [])
      } else {
        setUnits([])
      }
    } catch (error) {
      console.error('Erro:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.address) {
      toast({
        title: 'Erro',
        description: 'Preencha os campos obrigatórios',
        variant: 'destructive'
      })
      return
    }

    setSaving(true)
    try {
      // Simular save
      await new Promise(r => setTimeout(r, 1000))
      
      if (editingUnit) {
        setUnits(prev => prev.map(u => 
          u.id === editingUnit.id 
            ? { ...u, ...formData }
            : u
        ))
        toast({ title: 'Unidade atualizada', description: 'Dados salvos com sucesso' })
      } else {
        const newUnit: HealthUnit = {
          id: Date.now().toString(),
          ...formData,
          staffCount: 0,
          createdAt: new Date().toISOString()
        }
        setUnits(prev => [...prev, newUnit])
        toast({ title: 'Unidade criada', description: 'Nova unidade cadastrada com sucesso' })
      }
      
      setDialogOpen(false)
      resetForm()
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível salvar',
        variant: 'destructive'
      })
    } finally {
      setSaving(false)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'UBS',
      address: '',
      city: '',
      state: '',
      phone: '',
      email: '',
      isActive: true
    })
    setEditingUnit(null)
  }

  const handleEdit = (unit: HealthUnit) => {
    setEditingUnit(unit)
    setFormData({
      name: unit.name,
      type: unit.type,
      address: unit.address,
      city: unit.city,
      state: unit.state,
      phone: unit.phone || '',
      email: unit.email || '',
      isActive: unit.isActive
    })
    setDialogOpen(true)
  }

  const filteredUnits = units.filter(unit =>
    unit.name.toLowerCase().includes(search.toLowerCase()) ||
    unit.address.toLowerCase().includes(search.toLowerCase()) ||
    unit.city.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Unidades de Saúde</h1>
          <p className="text-muted-foreground">
            Gerencie as unidades de saúde cadastradas
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchUnits}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Unidade
          </Button>
        </div>
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
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{units.length}</p>
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
                <p className="text-sm text-muted-foreground">Ativas</p>
                <p className="text-2xl font-bold">{units.filter(u => u.isActive).length}</p>
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
                <p className="text-sm text-muted-foreground">Profissionais</p>
                <p className="text-2xl font-bold">{units.reduce((a, u) => a + u.staffCount, 0)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full">
                <MapPin className="h-6 w-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Cidades</p>
                <p className="text-2xl font-bold">{new Set(units.map(u => u.city)).size}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, endereço ou cidade..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Unidades ({filteredUnits.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma unidade encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Unidade</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUnits.map((unit) => (
                  <TableRow key={unit.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{unit.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {unit.staffCount} profissionais
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{unit.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{unit.address}</p>
                        <p className="text-sm text-muted-foreground">
                          {unit.city}, {unit.state}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {unit.phone && (
                        <p className="text-sm">{unit.phone}</p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={unit.isActive ? 'default' : 'secondary'}>
                        {unit.isActive ? 'Ativa' : 'Inativa'}
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
                          <DropdownMenuItem onClick={() => handleEdit(unit)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600">
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingUnit ? 'Editar Unidade' : 'Nova Unidade de Saúde'}
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da unidade de saúde
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Unidade *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: UBS Central"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full p-2 border rounded-md bg-background"
              >
                {UNIT_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label>Endereço *</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="Rua, número, bairro"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cidade</Label>
                <Input
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Input
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                  placeholder="SP"
                  maxLength={2}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="(11) 3333-4444"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Unidade Ativa</Label>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Building2, Plus, Users, DollarSign, Phone, Mail } from 'lucide-react'

interface Insurance {
  id: string
  name: string
  type: string
  code?: string
  contactPhone?: string
  contactEmail?: string
  coveragePercentage: number
  copayAmount?: number
  isActive: boolean
  _count: {
    patients: number
    transactions: number
  }
}

export default function InsurancesPage() {
  const [insurances, setInsurances] = useState<Insurance[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    type: 'PRIVATE',
    code: '',
    contactPhone: '',
    contactEmail: '',
    coveragePercentage: 100,
    copayAmount: 0
  })
  const { toast } = useToast()

  useEffect(() => {
    fetchInsurances()
  }, [])

  const fetchInsurances = async () => {
    try {
      const res = await fetch('/api/financial/insurances')
      const data = await res.json()
      setInsurances(data.data || [])
    } catch (error) {
      console.error('Error fetching insurances:', error)
    }
  }

  const handleCreate = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/financial/insurances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao criar convênio')
      }

      toast({
        title: 'Sucesso',
        description: 'Convênio criado com sucesso'
      })

      fetchInsurances()
      setIsDialogOpen(false)
      setFormData({
        name: '',
        type: 'PRIVATE',
        code: '',
        contactPhone: '',
        contactEmail: '',
        coveragePercentage: 100,
        copayAmount: 0
      })
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const getTypeBadge = (type: string) => {
    const types: Record<string, { label: string; variant: any }> = {
      PRIVATE: { label: 'Particular', variant: 'default' },
      SUS: { label: 'SUS', variant: 'secondary' },
      CORPORATE: { label: 'Empresarial', variant: 'outline' },
      OTHER: { label: 'Outro', variant: 'outline' }
    }
    
    const { label, variant } = types[type] || { label: type, variant: 'default' }
    return <Badge variant={variant}>{label}</Badge>
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Convênios e Seguradoras</h1>
          <p className="text-muted-foreground">Gerencie planos de saúde aceitos pela clínica</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Novo Convênio
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Cadastrar Novo Convênio</DialogTitle>
              <DialogDescription>
                Adicione um plano de saúde ou convênio aceito pela clínica
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="col-span-2 space-y-2">
                <Label>Nome do Convênio *</Label>
                <Input
                  placeholder="Ex: Unimed, SulAmérica, Bradesco Saúde"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PRIVATE">Particular</SelectItem>
                    <SelectItem value="SUS">SUS</SelectItem>
                    <SelectItem value="CORPORATE">Empresarial</SelectItem>
                    <SelectItem value="OTHER">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Código ANS (opcional)</Label>
                <Input
                  placeholder="Ex: 12345"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Telefone de Contato</Label>
                <Input
                  placeholder="(11) 99999-9999"
                  value={formData.contactPhone}
                  onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>E-mail de Contato</Label>
                <Input
                  type="email"
                  placeholder="contato@convenio.com.br"
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Cobertura (%)</Label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={formData.coveragePercentage}
                  onChange={(e) => setFormData({ ...formData, coveragePercentage: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>Valor Coparticipação (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.copayAmount}
                  onChange={(e) => setFormData({ ...formData, copayAmount: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreate} disabled={loading || !formData.name}>
                {loading ? 'Salvando...' : 'Salvar Convênio'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Insurances Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {insurances.map(insurance => (
          <Card key={insurance.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <CardTitle className="text-lg">{insurance.name}</CardTitle>
                </div>
                {getTypeBadge(insurance.type)}
              </div>
              {insurance.code && (
                <CardDescription>Código ANS: {insurance.code}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{insurance._count.patients} pacientes</span>
                </div>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <span>{insurance._count.transactions} transações</span>
                </div>
              </div>

              {insurance.contactPhone && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-4 w-4" />
                  <span>{insurance.contactPhone}</span>
                </div>
              )}

              {insurance.contactEmail && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-4 w-4" />
                  <span className="truncate">{insurance.contactEmail}</span>
                </div>
              )}

              <div className="pt-2 border-t space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Cobertura:</span>
                  <span className="font-medium">{insurance.coveragePercentage}%</span>
                </div>
                {insurance.copayAmount && insurance.copayAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Coparticipação:</span>
                    <span className="font-medium">
                      R$ {insurance.copayAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )}
              </div>

              <Badge variant={insurance.isActive ? 'default' : 'destructive'} className="w-full justify-center">
                {insurance.isActive ? 'Ativo' : 'Inativo'}
              </Badge>
            </CardContent>
          </Card>
        ))}
      </div>

      {insurances.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">Nenhum convênio cadastrado ainda</p>
            <p className="text-sm text-muted-foreground mt-2">
              Clique em "Novo Convênio" para adicionar o primeiro
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

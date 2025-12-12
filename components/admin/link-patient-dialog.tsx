'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { Loader2, UserPlus, Link2, Search, User, Calendar } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'

interface LinkPatientDialogProps {
  userId: string
  userName: string
  userEmail?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

interface ExistingPatient {
  id: string
  name: string
  cpf?: string
  birthDate?: string
  phone?: string
}

export function LinkPatientDialog({
  userId,
  userName,
  open,
  onOpenChange,
  onSuccess
}: LinkPatientDialogProps) {
  const [mode, setMode] = useState<'create' | 'link'>('create')
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [existingPatients, setExistingPatients] = useState<ExistingPatient[]>([])
  const [selectedPatientId, setSelectedPatientId] = useState<string>('')

  // Form para criar novo paciente
  const [formData, setFormData] = useState({
    name: userName,
    cpf: '',
    birthDate: '',
    gender: 'OTHER' as 'MALE' | 'FEMALE' | 'OTHER',
    phone: '',
    address: ''
  })

  useEffect(() => {
    if (open) {
      setFormData(prev => ({ ...prev, name: userName }))
      setMode('create')
      setSearchQuery('')
      setExistingPatients([])
      setSelectedPatientId('')
    }
  }, [open, userName])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return

    try {
      setSearching(true)
      const response = await fetch(`/api/patients?search=${encodeURIComponent(searchQuery)}&limit=10`)
      
      if (response.ok) {
        const data = await response.json()
        setExistingPatients(data.patients || [])
      }
    } catch (error) {
      console.error('Erro na busca:', error)
    } finally {
      setSearching(false)
    }
  }

  const handleSubmit = async () => {
    try {
      setLoading(true)

      if (mode === 'create') {
        // Criar novo paciente e vincular ao usuário
        const response = await fetch('/api/admin/users/link-patient', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            action: 'create',
            patientData: formData
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erro ao criar paciente')
        }

        toast({
          title: 'Sucesso!',
          description: 'Paciente criado e vinculado ao usuário.'
        })
      } else {
        // Vincular paciente existente
        if (!selectedPatientId) {
          toast({
            title: 'Selecione um paciente',
            description: 'Escolha um paciente existente para vincular.',
            variant: 'destructive'
          })
          return
        }

        const response = await fetch('/api/admin/users/link-patient', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            action: 'link',
            patientId: selectedPatientId
          })
        })

        if (!response.ok) {
          const error = await response.json()
          throw new Error(error.error || 'Erro ao vincular paciente')
        }

        toast({
          title: 'Sucesso!',
          description: 'Paciente vinculado ao usuário.'
        })
      }

      onOpenChange(false)
      onSuccess?.()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Não foi possível completar a operação.'
      toast({
        title: 'Erro',
        description: message,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Vincular Cadastro de Paciente
          </DialogTitle>
          <DialogDescription>
            Vincule este usuário a um cadastro de paciente para que ele possa acessar a área 'Minha Saúde'.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Seleção de modo */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setMode('create')}
              className={cn(
                "flex flex-col items-center justify-between rounded-lg border-2 p-4 transition-colors cursor-pointer",
                mode === 'create' 
                  ? "border-primary bg-primary/5" 
                  : "border-muted bg-popover hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <UserPlus className="mb-3 h-6 w-6" />
              <span className="text-sm font-medium">Criar Novo</span>
              <span className="text-xs text-muted-foreground text-center mt-1">
                Criar cadastro de paciente
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode('link')}
              className={cn(
                "flex flex-col items-center justify-between rounded-lg border-2 p-4 transition-colors cursor-pointer",
                mode === 'link' 
                  ? "border-primary bg-primary/5" 
                  : "border-muted bg-popover hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Link2 className="mb-3 h-6 w-6" />
              <span className="text-sm font-medium">Vincular Existente</span>
              <span className="text-xs text-muted-foreground text-center mt-1">
                Buscar paciente cadastrado
              </span>
            </button>
          </div>

          {mode === 'create' ? (
            /* Formulário de criação */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <Label>Nome Completo</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome do paciente"
                  />
                </div>
                <div>
                  <Label>CPF</Label>
                  <Input
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                    placeholder="000.000.000-00"
                  />
                </div>
                <div>
                  <Label>Data de Nascimento</Label>
                  <Input
                    type="date"
                    value={formData.birthDate}
                    onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Gênero</Label>
                  <Select value={formData.gender} onValueChange={(v: 'MALE' | 'FEMALE' | 'OTHER') => setFormData({ ...formData, gender: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Masculino</SelectItem>
                      <SelectItem value="FEMALE">Feminino</SelectItem>
                      <SelectItem value="OTHER">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Telefone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div className="col-span-2">
                  <Label>Endereço</Label>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Endereço completo"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Busca de paciente existente */
            <div className="space-y-4">
              <div className="flex gap-2">
                <Input
                  placeholder="Buscar por nome ou CPF..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>

              {existingPatients.length > 0 ? (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {existingPatients.map((patient) => (
                    <div
                      key={patient.id}
                      onClick={() => setSelectedPatientId(patient.id)}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPatientId === patient.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">{patient.name}</p>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            {patient.cpf && <span>CPF: {patient.cpf}</span>}
                            {patient.birthDate && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(patient.birthDate), 'dd/MM/yyyy')}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : searchQuery && !searching ? (
                <div className="text-center py-8 text-muted-foreground">
                  <User className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Nenhum paciente encontrado</p>
                  <p className="text-xs">Tente outro termo de busca ou crie um novo</p>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-10 w-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Busque um paciente existente</p>
                  <p className="text-xs">Digite o nome ou CPF e clique em buscar</p>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {mode === 'create' ? 'Criar e Vincular' : 'Vincular Paciente'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

"use client"

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  BookMarked, 
  Search, 
  Pill, 
  FlaskConical, 
  Send, 
  FileText,
  Loader2,
  Star,
  Clock
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

interface Protocol {
  id: string
  name: string
  description: string
  category: string
  usageCount: number
  isPublic: boolean
  specialty: string
  doctor: { name: string }
  prescriptions: Array<{
    medicationName: string
    dosage: string
    frequency: string
    duration: string
  }>
  exams: Array<{
    examName: string
    description: string
    priority: string
  }>
  referrals: Array<{
    specialty: string
    description: string
    priority: string
  }>
  diagnoses: Array<{
    cidCode: string
    description: string
  }>
}

interface ProtocolData {
  prescriptions: Protocol['prescriptions']
  exams: Protocol['exams']
  referrals: Protocol['referrals']
  diagnoses: Protocol['diagnoses']
}

interface ProtocolSelectorProps {
  onApply: (data: ProtocolData) => void
  triggerClassName?: string
}

const CATEGORY_LABELS: Record<string, string> = {
  'HYPERTENSION': 'Hipertensão',
  'DIABETES': 'Diabetes',
  'PRENATAL': 'Pré-natal',
  'CHILDCARE': 'Puericultura',
  'MENTAL_HEALTH': 'Saúde Mental',
  'RESPIRATORY': 'Respiratórias',
  'INFECTIOUS': 'Infecciosas',
  'CHRONIC': 'Crônicas',
  'PREVENTIVE': 'Preventivo',
  'EMERGENCY': 'Urgência',
  'CUSTOM': 'Personalizado'
}

const CATEGORY_COLORS: Record<string, string> = {
  'HYPERTENSION': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  'DIABETES': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'PRENATAL': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  'CHILDCARE': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  'MENTAL_HEALTH': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'RESPIRATORY': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  'INFECTIOUS': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  'CHRONIC': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  'PREVENTIVE': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  'EMERGENCY': 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  'CUSTOM': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200'
}

export function ProtocolSelector({ onApply, triggerClassName }: ProtocolSelectorProps) {
  const [open, setOpen] = useState(false)
  const [protocols, setProtocols] = useState<Protocol[]>([])
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  useEffect(() => {
    if (open) {
      fetchProtocols()
    }
  }, [open])

  const fetchProtocols = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/protocols?includePublic=true')
      if (res.ok) {
        const data = await res.json()
        setProtocols(data.protocols || [])
      }
    } catch (error) {
      logger.error('Erro ao carregar protocolos:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = async (protocol: Protocol) => {
    setApplying(protocol.id)
    try {
      const res = await fetch(`/api/protocols/${protocol.id}/apply`, {
        method: 'POST'
      })
      
      if (res.ok) {
        const { data } = await res.json()
        onApply(data)
        setOpen(false)
        toast({
          title: "Protocolo aplicado",
          description: `${protocol.name} foi aplicado à consulta`
        })
      } else {
        throw new Error('Falha ao aplicar protocolo')
      }
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível aplicar o protocolo",
        variant: "destructive"
      })
    } finally {
      setApplying(null)
    }
  }

  const filteredProtocols = protocols.filter(p => {
    const matchesSearch = search.length < 2 || 
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description?.toLowerCase().includes(search.toLowerCase())
    
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const categories = Array.from(new Set(protocols.map(p => p.category)))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className={triggerClassName}>
          <BookMarked className="h-4 w-4 mr-2" />
          Protocolos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookMarked className="h-5 w-5" />
            Protocolos e Preferências
          </DialogTitle>
          <DialogDescription>
            Selecione um protocolo para preencher automaticamente prescrições, exames e encaminhamentos
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar protocolo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtro por categoria */}
          <div className="flex flex-wrap gap-2">
            <Badge
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setSelectedCategory('all')}
            >
              Todos
            </Badge>
            {categories.map(cat => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer',
                  selectedCategory === cat && CATEGORY_COLORS[cat]
                )}
                onClick={() => setSelectedCategory(cat)}
              >
                {CATEGORY_LABELS[cat] || cat}
              </Badge>
            ))}
          </div>

          {/* Lista de protocolos */}
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : filteredProtocols.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {protocols.length === 0 ? (
                  <>
                    <BookMarked className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum protocolo cadastrado</p>
                    <p className="text-sm mt-2">
                      Crie protocolos para reutilizar prescrições e exames comuns
                    </p>
                  </>
                ) : (
                  <p>Nenhum protocolo encontrado para esta busca</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredProtocols.map(protocol => (
                  <div
                    key={protocol.id}
                    className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-foreground">
                            {protocol.name}
                          </h3>
                          <Badge className={cn('text-xs', CATEGORY_COLORS[protocol.category])}>
                            {CATEGORY_LABELS[protocol.category]}
                          </Badge>
                          {protocol.isPublic && (
                            <Badge variant="outline" className="text-xs">
                              <Star className="h-3 w-3 mr-1" />
                              Público
                            </Badge>
                          )}
                        </div>
                        
                        {protocol.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {protocol.description}
                          </p>
                        )}

                        {/* Resumo do conteúdo */}
                        <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted-foreground">
                          {protocol.prescriptions.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Pill className="h-3 w-3" />
                              {protocol.prescriptions.length} medicação(ões)
                            </span>
                          )}
                          {protocol.exams.length > 0 && (
                            <span className="flex items-center gap-1">
                              <FlaskConical className="h-3 w-3" />
                              {protocol.exams.length} exame(s)
                            </span>
                          )}
                          {protocol.referrals.length > 0 && (
                            <span className="flex items-center gap-1">
                              <Send className="h-3 w-3" />
                              {protocol.referrals.length} encaminhamento(s)
                            </span>
                          )}
                          {protocol.diagnoses.length > 0 && (
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {protocol.diagnoses.length} CID(s)
                            </span>
                          )}
                        </div>

                        {/* Detalhes expandidos */}
                        <div className="mt-3 space-y-2">
                          {protocol.prescriptions.length > 0 && (
                            <div className="text-xs">
                              <span className="font-medium">Medicações: </span>
                              <span className="text-muted-foreground">
                                {protocol.prescriptions.map(p => p.medicationName).join(', ')}
                              </span>
                            </div>
                          )}
                          {protocol.exams.length > 0 && (
                            <div className="text-xs">
                              <span className="font-medium">Exames: </span>
                              <span className="text-muted-foreground">
                                {protocol.exams.map(e => e.examName).join(', ')}
                              </span>
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Usado {protocol.usageCount}x
                          </span>
                          <span>por {protocol.doctor.name}</span>
                        </div>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => handleApply(protocol)}
                        disabled={applying === protocol.id}
                      >
                        {applying === protocol.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Aplicar'
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  )
}

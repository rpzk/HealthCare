'use client'

import { useState } from 'react'
import { 
  Calendar,
  Clock,
  Settings,
  Plus,
  MoreHorizontal,
  Edit,
  Trash2,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { toast } from '@/hooks/use-toast'

interface BookingRule {
  id: string
  name: string
  description?: string
  type: 'time' | 'capacity' | 'restriction' | 'notification'
  isActive: boolean
  config: Record<string, any>
}

const RULE_TYPES = {
  time: { label: 'Tempo', description: 'Regras de horário e antecedência' },
  capacity: { label: 'Capacidade', description: 'Limites de agendamentos' },
  restriction: { label: 'Restrição', description: 'Bloqueios e exceções' },
  notification: { label: 'Notificação', description: 'Lembretes e confirmações' },
}

export default function AdminBookingRulesPage() {
  const [rules, setRules] = useState<BookingRule[]>([
    {
      id: '1',
      name: 'Antecedência mínima',
      description: 'Tempo mínimo para agendamento',
      type: 'time',
      isActive: true,
      config: { minHours: 2 }
    },
    {
      id: '2',
      name: 'Antecedência máxima',
      description: 'Limite de agendamento futuro',
      type: 'time',
      isActive: true,
      config: { maxDays: 60 }
    },
    {
      id: '3',
      name: 'Limite diário por paciente',
      description: 'Máximo de consultas por dia por paciente',
      type: 'capacity',
      isActive: true,
      config: { maxPerDay: 1 }
    },
    {
      id: '4',
      name: 'Limite mensal por paciente',
      description: 'Máximo de consultas por mês por paciente',
      type: 'capacity',
      isActive: false,
      config: { maxPerMonth: 4 }
    },
    {
      id: '5',
      name: 'Lembrete 24h',
      description: 'Enviar lembrete 24h antes',
      type: 'notification',
      isActive: true,
      config: { hoursBefore: 24, channels: ['email', 'sms'] }
    },
    {
      id: '6',
      name: 'Confirmação obrigatória',
      description: 'Paciente deve confirmar antes da consulta',
      type: 'notification',
      isActive: true,
      config: { requireConfirmation: true, hoursToConfirm: 48 }
    },
  ])

  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<BookingRule | null>(null)

  const [generalSettings, setGeneralSettings] = useState({
    allowOnlineBooking: true,
    allowSameDayBooking: false,
    autoConfirmBookings: false,
    requirePhone: true,
    defaultDuration: 30,
    bufferBetweenSlots: 5,
    workingHoursStart: '08:00',
    workingHoursEnd: '18:00',
    allowWeekendBooking: false,
  })

  const toggleRule = (ruleId: string) => {
    setRules(prev => prev.map(rule => 
      rule.id === ruleId ? { ...rule, isActive: !rule.isActive } : rule
    ))
  }

  const handleSaveSettings = async () => {
    setSaving(true)
    await new Promise(r => setTimeout(r, 1000))
    toast({
      title: 'Configurações salvas',
      description: 'As regras de agendamento foram atualizadas'
    })
    setSaving(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Regras de Agendamento</h1>
          <p className="text-muted-foreground">
            Configure as regras e políticas de agendamento
          </p>
        </div>
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configurações Gerais
          </CardTitle>
          <CardDescription>
            Configurações básicas do sistema de agendamento
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Agendamento Online</Label>
                <p className="text-sm text-muted-foreground">
                  Permitir que pacientes agendem pelo portal
                </p>
              </div>
              <Switch
                checked={generalSettings.allowOnlineBooking}
                onCheckedChange={(v) => setGeneralSettings({ ...generalSettings, allowOnlineBooking: v })}
              />
            </div>
            
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Agendamento no mesmo dia</Label>
                <p className="text-sm text-muted-foreground">
                  Permitir agendamentos para o dia atual
                </p>
              </div>
              <Switch
                checked={generalSettings.allowSameDayBooking}
                onCheckedChange={(v) => setGeneralSettings({ ...generalSettings, allowSameDayBooking: v })}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Confirmação automática</Label>
                <p className="text-sm text-muted-foreground">
                  Confirmar agendamentos automaticamente
                </p>
              </div>
              <Switch
                checked={generalSettings.autoConfirmBookings}
                onCheckedChange={(v) => setGeneralSettings({ ...generalSettings, autoConfirmBookings: v })}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label>Telefone obrigatório</Label>
                <p className="text-sm text-muted-foreground">
                  Exigir telefone para agendamento
                </p>
              </div>
              <Switch
                checked={generalSettings.requirePhone}
                onCheckedChange={(v) => setGeneralSettings({ ...generalSettings, requirePhone: v })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Duração padrão (minutos)</Label>
              <Input
                type="number"
                value={generalSettings.defaultDuration}
                onChange={(e) => setGeneralSettings({ ...generalSettings, defaultDuration: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Intervalo entre slots (minutos)</Label>
              <Input
                type="number"
                value={generalSettings.bufferBetweenSlots}
                onChange={(e) => setGeneralSettings({ ...generalSettings, bufferBetweenSlots: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label>Horário de funcionamento</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="time"
                  value={generalSettings.workingHoursStart}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, workingHoursStart: e.target.value })}
                />
                <span>até</span>
                <Input
                  type="time"
                  value={generalSettings.workingHoursEnd}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, workingHoursEnd: e.target.value })}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Regras Ativas
              </CardTitle>
              <CardDescription>
                Regras que controlam o comportamento dos agendamentos
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nova Regra
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {Object.entries(RULE_TYPES).map(([type, config]) => {
              const typeRules = rules.filter(r => r.type === type)
              return (
                <AccordionItem key={type} value={type}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{config.label}</span>
                      <Badge variant="outline">{typeRules.length} regras</Badge>
                      <Badge variant={typeRules.some(r => r.isActive) ? 'default' : 'secondary'}>
                        {typeRules.filter(r => r.isActive).length} ativas
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-sm text-muted-foreground mb-4">{config.description}</p>
                    <div className="space-y-3">
                      {typeRules.map(rule => (
                        <div 
                          key={rule.id}
                          className={`flex items-center justify-between p-4 border rounded-lg ${
                            rule.isActive ? 'bg-card' : 'bg-muted/30'
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <Switch
                              checked={rule.isActive}
                              onCheckedChange={() => toggleRule(rule.id)}
                            />
                            <div>
                              <p className={`font-medium ${!rule.isActive && 'text-muted-foreground'}`}>
                                {rule.name}
                              </p>
                              {rule.description && (
                                <p className="text-sm text-muted-foreground">{rule.description}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {rule.isActive && (
                              <Badge variant="secondary">
                                {Object.entries(rule.config).map(([k, v]) => 
                                  `${k}: ${v}`
                                ).join(', ')}
                              </Badge>
                            )}
                            <Button variant="ghost" size="icon">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Warning */}
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardContent className="pt-6">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Atenção
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Alterações nas regras de agendamento afetam imediatamente todos os novos agendamentos.
                Agendamentos existentes não são afetados por mudanças nas regras.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

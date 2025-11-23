"use client"

import { useEffect, useRef, useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar, CheckCircle, FileText, FlaskConical, Send, User, XCircle, UserX } from 'lucide-react'

type Consultation = {
  id: string
  scheduledDate?: string
  status?: string
  type?: string
  duration?: number
  description?: string
  notes?: string
  patient?: { id: string; name: string; phone?: string }
  doctor?: { id: string; name: string }
}

export function ConsultationWorkspace({ consultationId }: { consultationId: string }) {
  const [consultation, setConsultation] = useState<Consultation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('notes')
  const [saving, setSaving] = useState(false)
  const [notesText, setNotesText] = useState('')
  const [activityLog, setActivityLog] = useState<Array<{ id: string; time: string; type: string; message: string }>>([])
  const activityRef = useRef<HTMLDivElement | null>(null)
  const [highlightActivity, setHighlightActivity] = useState(false)

  const bounceToActivity = () => {
    if (activityRef.current) {
      activityRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setHighlightActivity(true)
      setTimeout(() => setHighlightActivity(false), 1500)
    }
  }
  const [rx, setRx] = useState({
    name: '',
    dosage: '',
    frequency: '',
    duration: '',
    instructions: '',
    observations: ''
  })
  const [exam, setExam] = useState({
    examType: '',
    description: '',
    priority: 'NORMAL',
    notes: '',
    scheduledDate: ''
  })
  const [referral, setReferral] = useState({
    specialty: '',
    description: '',
    priority: 'NORMAL',
    notes: ''
  })

  useEffect(() => {
    fetchConsultation()
  }, [consultationId])

  const fetchConsultation = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch(`/api/consultations/${consultationId}`)
      if (!res.ok) throw new Error('Falha ao carregar consulta')
      const data = await res.json()
      const c = data.consultation || data
      setConsultation(c)
      setNotesText(c?.notes || '')
    } catch (e: any) {
      console.error('Erro ao carregar consulta:', e)
      setError(e.message || 'Erro ao carregar consulta')
    } finally {
      setLoading(false)
    }
  }

  const runAction = async (action: 'start' | 'complete' | 'cancel' | 'no-show', payload?: any) => {
    try {
      setSaving(true)
      const res = await fetch(`/api/consultations/${consultationId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...(payload || {}) })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao executar ação')
      }
      await fetchConsultation()
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      const messages: Record<typeof action, string> = {
        start: 'Consulta iniciada',
        complete: 'Consulta finalizada',
        cancel: 'Consulta cancelada',
        'no-show': 'Paciente faltou'
      }
  setActivityLog(prev => [{ id: crypto.randomUUID?.() || String(Date.now()), time: now, type: 'Ação', message: messages[action] }, ...prev].slice(0, 10))
  bounceToActivity()
    } catch (e: any) {
      alert(e.message || 'Erro ao executar ação')
    } finally {
      setSaving(false)
    }
  }

  const saveNotes = async (notes: string) => {
    try {
      if (!consultation?.patient?.id) throw new Error('Paciente não encontrado na consulta')
      const title = 'Evolução da consulta'
      const description = notes?.trim() || 'Evolução registrada durante a consulta'
      setSaving(true)
      const res = await fetch('/api/medical-records', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          diagnosis: undefined,
          treatment: undefined,
          notes,
          recordType: 'FOLLOW_UP',
          priority: 'NORMAL',
          patientId: String(consultation.patient.id)
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao salvar evolução')
      }
      setConsultation(prev => (prev ? { ...prev, notes } : prev))
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  setActivityLog(prev => [{ id: crypto.randomUUID?.() || String(Date.now()), time: now, type: 'Evolução', message: 'Evolução salva' }, ...prev].slice(0, 10))
  bounceToActivity()
      alert('Evolução salva com sucesso')
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar evolução')
    } finally {
      setSaving(false)
    }
  }

  const savePrescription = async () => {
    try {
      if (!consultation?.patient?.id) throw new Error('Paciente não encontrado na consulta')
      if (!rx.name || !rx.dosage || !rx.frequency || !rx.duration) {
        throw new Error('Preencha nome, dosagem, frequência e duração')
      }
      setSaving(true)
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: consultation.patient.id,
          medications: [
            {
              name: rx.name,
              dosage: rx.dosage,
              frequency: rx.frequency,
              duration: rx.duration,
              instructions: rx.instructions || undefined
            }
          ],
          observations: rx.observations || undefined
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao salvar prescrição')
      }
      alert('Prescrição criada com sucesso')
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  setActivityLog(prev => [{ id: crypto.randomUUID?.() || String(Date.now()), time: now, type: 'Prescrição', message: `Prescrição salva: ${rx.name}` }, ...prev].slice(0, 10))
  bounceToActivity()
      setRx({ name: '', dosage: '', frequency: '', duration: '', instructions: '', observations: '' })
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar prescrição')
    } finally {
      setSaving(false)
    }
  }

  const saveExamRequest = async () => {
    try {
      if (!consultation?.patient?.id) throw new Error('Paciente não encontrado na consulta')
      if (!exam.examType || !exam.description) throw new Error('Informe tipo de exame e descrição')
      setSaving(true)
      const res = await fetch('/api/exam-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: String(consultation.patient.id),
          examType: exam.examType,
          description: exam.description,
          priority: exam.priority,
          notes: exam.notes || undefined,
          scheduledDate: exam.scheduledDate || undefined
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao salvar solicitação de exame')
      }
      alert('Solicitação de exame criada com sucesso')
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  setActivityLog(prev => [{ id: crypto.randomUUID?.() || String(Date.now()), time: now, type: 'Exame', message: `Exame solicitado: ${exam.examType}` }, ...prev].slice(0, 10))
  bounceToActivity()
      setExam({ examType: '', description: '', priority: 'NORMAL', notes: '', scheduledDate: '' })
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar solicitação de exame')
    } finally {
      setSaving(false)
    }
  }

  const saveReferral = async () => {
    try {
      if (!consultation?.patient?.id) throw new Error('Paciente não encontrado na consulta')
      if (!referral.specialty || !referral.description) throw new Error('Informe a especialidade e a descrição do encaminhamento')
      setSaving(true)
      const res = await fetch('/api/referrals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId: String(consultation.patient.id),
          specialty: referral.specialty,
          description: referral.description,
          priority: referral.priority,
          notes: referral.notes || undefined
        })
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao salvar encaminhamento')
      }
      alert('Encaminhamento criado com sucesso')
      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  setActivityLog(prev => [{ id: crypto.randomUUID?.() || String(Date.now()), time: now, type: 'Encaminhamento', message: `Encaminhamento: ${referral.specialty}` }, ...prev].slice(0, 10))
  bounceToActivity()
      setReferral({ specialty: '', description: '', priority: 'NORMAL', notes: '' })
    } catch (e: any) {
      alert(e.message || 'Erro ao salvar encaminhamento')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="p-6">Carregando consulta...</div>
  if (error) return <div className="p-6 text-red-600">{error}</div>
  if (!consultation) return <div className="p-6">Consulta não encontrada</div>

  const { date, time } = (() => {
    if (!consultation.scheduledDate) return { date: '', time: '' }
    const d = new Date(consultation.scheduledDate)
    return {
      date: d.toLocaleDateString('pt-BR'),
      time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    }
  })()

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 bg-medical-primary rounded-full flex items-center justify-center">
              <User className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h2 className="text-xl font-semibold text-foreground">{consultation.patient?.name || 'Paciente'}</h2>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">{consultation.status}</span>
                {consultation.type && (
                  <span className="px-2 py-1 bg-muted text-foreground text-xs font-medium rounded-full">{consultation.type}</span>
                )}
              </div>
              <div className="flex items-center space-x-4 mt-1 text-sm text-muted-foreground">
                {consultation.scheduledDate && (
                  <>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{date}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4" />
                      <span>{time}{consultation.duration ? ` (${consultation.duration}min)` : ''}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {consultation.status === 'SCHEDULED' && (
              <Button variant="outline" disabled={saving} onClick={() => runAction('start')}>
                <CheckCircle className="h-4 w-4 mr-1" /> Iniciar
              </Button>
            )}
            {consultation.status === 'IN_PROGRESS' && (
              <Button variant="outline" disabled={saving} onClick={() => runAction('complete', { notes: 'Consulta finalizada' })}>
                <FileText className="h-4 w-4 mr-1" /> Finalizar
              </Button>
            )}
            {consultation.status === 'SCHEDULED' && (
              <Button variant="outline" className="text-orange-700" disabled={saving} onClick={() => runAction('no-show')}>
                <UserX className="h-4 w-4 mr-1" /> Faltou
              </Button>
            )}
            <Button variant="outline" className="text-red-700" disabled={saving} onClick={() => runAction('cancel', { reason: 'Cancelada no atendimento' })}>
              <XCircle className="h-4 w-4 mr-1" /> Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList>
              <TabsTrigger value="notes">Evolução</TabsTrigger>
              <TabsTrigger value="prescriptions">Prescrições</TabsTrigger>
              <TabsTrigger value="exams">Solicitar Exames</TabsTrigger>
              <TabsTrigger value="referrals">Encaminhamentos</TabsTrigger>
              <TabsTrigger value="attachments">Anexos</TabsTrigger>
            </TabsList>

            <TabsContent value="notes" className="pt-4">
              <textarea
                className="w-full border rounded p-3 h-48"
                placeholder="Evolução/Notas da consulta..."
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
              />
              <div className="flex justify-end mt-3">
                <Button variant="medical" disabled={saving} onClick={() => saveNotes(notesText)}>Salvar Evolução</Button>
              </div>
            </TabsContent>

            <TabsContent value="prescriptions" className="pt-4 space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-foreground">Medicamento</label>
                  <input className="w-full border rounded p-2" value={rx.name} onChange={e => setRx({ ...rx, name: e.target.value })} placeholder="Dipirona 500mg comprimido" />
                </div>
                <div>
                  <label className="text-sm text-foreground">Dosagem</label>
                  <input className="w-full border rounded p-2" value={rx.dosage} onChange={e => setRx({ ...rx, dosage: e.target.value })} placeholder="1 comprimido" />
                </div>
                <div>
                  <label className="text-sm text-foreground">Frequência</label>
                  <input className="w-full border rounded p-2" value={rx.frequency} onChange={e => setRx({ ...rx, frequency: e.target.value })} placeholder="a cada 8h" />
                </div>
                <div>
                  <label className="text-sm text-foreground">Duração</label>
                  <input className="w-full border rounded p-2" value={rx.duration} onChange={e => setRx({ ...rx, duration: e.target.value })} placeholder="por 5 dias" />
                </div>
              </div>
              <div>
                <label className="text-sm text-foreground">Instruções</label>
                <input className="w-full border rounded p-2" value={rx.instructions} onChange={e => setRx({ ...rx, instructions: e.target.value })} placeholder="não ingerir em jejum" />
              </div>
              <div>
                <label className="text-sm text-foreground">Observações</label>
                <textarea className="w-full border rounded p-2 h-24" value={rx.observations} onChange={e => setRx({ ...rx, observations: e.target.value })} placeholder="Orientações adicionais..." />
              </div>
              <div className="flex justify-end">
                <Button variant="medical" disabled={saving} onClick={savePrescription}>
                  <Send className="h-4 w-4 mr-1" /> Salvar Prescrição
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="exams" className="pt-4 space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-foreground">Tipo de Exame</label>
                  <input className="w-full border rounded p-2" value={exam.examType} onChange={e => setExam({ ...exam, examType: e.target.value })} placeholder="Hemograma, Raio-X, ECG..." />
                </div>
                <div>
                  <label className="text-sm text-foreground">Prioridade</label>
                  <select className="w-full border rounded p-2" value={exam.priority} onChange={e => setExam({ ...exam, priority: e.target.value })}>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-foreground">Descrição</label>
                <input className="w-full border rounded p-2" value={exam.description} onChange={e => setExam({ ...exam, description: e.target.value })} placeholder="Detalhes da solicitação" />
              </div>
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-foreground">Notas</label>
                  <input className="w-full border rounded p-2" value={exam.notes} onChange={e => setExam({ ...exam, notes: e.target.value })} placeholder="Instruções adicionais" />
                </div>
                <div>
                  <label className="text-sm text-foreground">Data agendada (opcional)</label>
                  <input type="datetime-local" className="w-full border rounded p-2" value={exam.scheduledDate} onChange={e => setExam({ ...exam, scheduledDate: e.target.value })} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button variant="medical" disabled={saving} onClick={saveExamRequest}>
                  <FlaskConical className="h-4 w-4 mr-1" /> Salvar Solicitação
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="referrals" className="pt-4 space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-foreground">Especialidade/Serviço</label>
                  <input className="w-full border rounded p-2" value={referral.specialty} onChange={e => setReferral({ ...referral, specialty: e.target.value })} placeholder="Cardiologia, Fisioterapia, etc." />
                </div>
                <div>
                  <label className="text-sm text-foreground">Prioridade</label>
                  <select className="w-full border rounded p-2" value={referral.priority} onChange={e => setReferral({ ...referral, priority: e.target.value })}>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">Alta</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="text-sm text-foreground">Descrição do Encaminhamento</label>
                <input className="w-full border rounded p-2" value={referral.description} onChange={e => setReferral({ ...referral, description: e.target.value })} placeholder="Motivo e orientações do encaminhamento" />
              </div>
              <div>
                <label className="text-sm text-foreground">Notas</label>
                <input className="w-full border rounded p-2" value={referral.notes} onChange={e => setReferral({ ...referral, notes: e.target.value })} placeholder="Observações adicionais (opcional)" />
              </div>
              <div className="flex justify-end">
                <Button variant="medical" disabled={saving} onClick={saveReferral}>
                  <Send className="h-4 w-4 mr-1" /> Salvar Encaminhamento
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="attachments" className="pt-4">
              <div className="text-muted-foreground">Gerencie anexos aqui</div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Atividade em tempo real para evidenciar mudanças */}
      <Card ref={activityRef} className={highlightActivity ? 'ring-2 ring-medical-primary transition' : ''}>
        <CardHeader>
          <CardTitle>Atividade do Atendimento</CardTitle>
        </CardHeader>
        <CardContent>
          {activityLog.length === 0 ? (
            <div className="text-sm text-muted-foreground">Nenhuma atividade registrada ainda. Execute ações (Iniciar/Finalizar/Cancelar) ou salve nas abas para ver aqui.</div>
          ) : (
            <ul className="space-y-2">
              {activityLog.map((it) => (
                <li key={it.id} className="flex items-center justify-between rounded border p-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-medical-primary/10 px-2 py-0.5 text-xs text-medical-primary">{it.type}</span>
                    <span className="text-sm text-foreground">{it.message}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{it.time}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Botão flutuante para enfatizar onde ver as mudanças */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button variant="medical" onClick={bounceToActivity} title="Rolar até as mudanças (Atividade do Atendimento)">
          Ver mudanças
        </Button>
      </div>
    </div>
  )
}

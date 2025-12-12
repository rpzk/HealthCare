'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  User, 
  FlaskConical, 
  Loader2, 
  Search,
  X,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Package,
  Plus,
  Trash2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Patient {
  id: string
  name: string
  cpf: string | null
  birthDate: string | null
  gender: string | null
}

interface ExamSuggestion {
  id: string
  name: string
  abbreviation: string
  description: string
  category: string
  categoryLabel: string
  susCode: string
  preparation: string
  label: string
  hasRestrictions: boolean
  restrictions: string[]
}

interface ExamComboItem {
  exam: {
    id: string
    name: string
    abbreviation: string
    examCategory: string
  }
}

interface ExamCombo {
  id: string
  name: string
  description: string | null
  category: string | null
  usageCount: number
  items: ExamComboItem[]
}

interface SelectedExam extends ExamSuggestion {
  notes?: string
  fromCombo?: string
}

export default function NewExamRequestForm() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'individual' | 'combo'>('individual')
  
  // Patient search
  const [patientSearch, setPatientSearch] = useState('')
  const [patients, setPatients] = useState<Patient[]>([])
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null)
  const [patientLoading, setPatientLoading] = useState(false)
  const [showPatientDropdown, setShowPatientDropdown] = useState(false)
  const patientRef = useRef<HTMLDivElement>(null)
  const patientDebounceRef = useRef<NodeJS.Timeout>()

  // Exam search  
  const [examSearch, setExamSearch] = useState('')
  const [exams, setExams] = useState<ExamSuggestion[]>([])
  const [selectedExams, setSelectedExams] = useState<SelectedExam[]>([])
  const [examLoading, setExamLoading] = useState(false)
  const [showExamDropdown, setShowExamDropdown] = useState(false)
  const examRef = useRef<HTMLDivElement>(null)
  const examDebounceRef = useRef<NodeJS.Timeout>()

  // Combo search
  const [comboSearch, setComboSearch] = useState('')
  const [combos, setCombos] = useState<ExamCombo[]>([])
  const [comboLoading, setComboLoading] = useState(false)
  const [showComboDropdown, setShowComboDropdown] = useState(false)
  const comboRef = useRef<HTMLDivElement>(null)
  const comboDebounceRef = useRef<NodeJS.Timeout>()

  // Form data
  const [form, setForm] = useState({
    description: '',
    priority: 'NORMAL',
    notes: '',
    scheduledDate: ''
  })

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (patientRef.current && !patientRef.current.contains(event.target as Node)) {
        setShowPatientDropdown(false)
      }
      if (examRef.current && !examRef.current.contains(event.target as Node)) {
        setShowExamDropdown(false)
      }
      if (comboRef.current && !comboRef.current.contains(event.target as Node)) {
        setShowComboDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Patient search
  const searchPatients = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPatients([])
      return
    }
    setPatientLoading(true)
    try {
      const res = await fetch(`/api/patients?search=${encodeURIComponent(query)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setPatients(data.patients || data || [])
      }
    } catch (error) {
      console.error('Erro ao buscar pacientes:', error)
    } finally {
      setPatientLoading(false)
    }
  }, [])

  useEffect(() => {
    if (patientDebounceRef.current) clearTimeout(patientDebounceRef.current)
    if (patientSearch.length >= 2 && !selectedPatient) {
      patientDebounceRef.current = setTimeout(() => searchPatients(patientSearch), 300)
    } else {
      setPatients([])
    }
    return () => { if (patientDebounceRef.current) clearTimeout(patientDebounceRef.current) }
  }, [patientSearch, selectedPatient, searchPatients])

  // Exam search
  const searchExams = useCallback(async (query: string) => {
    if (query.length < 2) {
      setExams([])
      return
    }
    setExamLoading(true)
    try {
      const params = new URLSearchParams({ q: query })
      if (selectedPatient?.gender) params.set('patientSex', selectedPatient.gender)
      if (selectedPatient?.birthDate) {
        const age = Math.floor((Date.now() - new Date(selectedPatient.birthDate).getTime()) / (365.25 * 24 * 60 * 60 * 1000))
        params.set('patientAge', String(age))
      }
      const res = await fetch(`/api/exams/autocomplete?${params}`)
      if (res.ok) {
        const data = await res.json()
        setExams(data)
      }
    } catch (error) {
      console.error('Erro ao buscar exames:', error)
    } finally {
      setExamLoading(false)
    }
  }, [selectedPatient])

  useEffect(() => {
    if (examDebounceRef.current) clearTimeout(examDebounceRef.current)
    if (examSearch.length >= 2) {
      examDebounceRef.current = setTimeout(() => searchExams(examSearch), 300)
    } else {
      setExams([])
    }
    return () => { if (examDebounceRef.current) clearTimeout(examDebounceRef.current) }
  }, [examSearch, searchExams])

  // Combo search
  const searchCombos = useCallback(async (query: string) => {
    setComboLoading(true)
    try {
      const res = await fetch(`/api/exam-combos/autocomplete?query=${encodeURIComponent(query)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setCombos(data)
      }
    } catch (error) {
      console.error('Erro ao buscar combos:', error)
    } finally {
      setComboLoading(false)
    }
  }, [])

  useEffect(() => {
    if (comboDebounceRef.current) clearTimeout(comboDebounceRef.current)
    comboDebounceRef.current = setTimeout(() => searchCombos(comboSearch), 300)
    return () => { if (comboDebounceRef.current) clearTimeout(comboDebounceRef.current) }
  }, [comboSearch, searchCombos])

  // Load popular combos on mount
  useEffect(() => {
    searchCombos('')
  }, [searchCombos])

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient)
    setPatientSearch(patient.name)
    setShowPatientDropdown(false)
    setPatients([])
  }

  const clearPatient = () => {
    setSelectedPatient(null)
    setPatientSearch('')
  }

  const addExam = (exam: ExamSuggestion) => {
    if (!selectedExams.find(e => e.id === exam.id)) {
      setSelectedExams(prev => [...prev, exam])
    }
    setExamSearch('')
    setShowExamDropdown(false)
    setExams([])
  }

  const removeExam = (examId: string) => {
    setSelectedExams(prev => prev.filter(e => e.id !== examId))
  }

  const selectCombo = async (combo: ExamCombo) => {
    // Fetch full exam details for combo items
    const examIds = combo.items.map(item => item.exam.id)
    
    try {
      // Add exams from combo
      const params = new URLSearchParams()
      examIds.forEach(id => params.append('ids', id))
      
      // For now, add simplified exam info from combo
      const newExams: SelectedExam[] = combo.items.map(item => ({
        id: item.exam.id,
        name: item.exam.name,
        abbreviation: item.exam.abbreviation,
        description: '',
        category: item.exam.examCategory,
        categoryLabel: getCategoryLabel(item.exam.examCategory),
        susCode: '',
        preparation: '',
        label: item.exam.name,
        hasRestrictions: false,
        restrictions: [],
        fromCombo: combo.name
      }))

      // Merge with existing, avoiding duplicates
      setSelectedExams(prev => {
        const existingIds = new Set(prev.map(e => e.id))
        const uniqueNew = newExams.filter(e => !existingIds.has(e.id))
        return [...prev, ...uniqueNew]
      })

      // Track combo usage
      fetch(`/api/exam-combos/${combo.id}/use`, { method: 'POST' })
    } catch (error) {
      console.error('Erro ao adicionar combo:', error)
    }

    setComboSearch('')
    setShowComboDropdown(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!selectedPatient) {
      alert('Selecione um paciente')
      return
    }
    if (selectedExams.length === 0) {
      alert('Selecione pelo menos um exame')
      return
    }

    setLoading(true)
    try {
      // Submit each exam as a separate request
      const results = await Promise.all(
        selectedExams.map(exam =>
          fetch('/api/exam-requests', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              patientId: selectedPatient.id,
              examId: exam.id,
              examType: exam.name,
              description: form.description || `Solicitação de ${exam.name}`,
              priority: form.priority,
              notes: exam.notes || form.notes,
              scheduledDate: form.scheduledDate || undefined
            })
          })
        )
      )

      const failed = results.filter(r => !r.ok)
      if (failed.length > 0) {
        alert(`${failed.length} exame(s) falharam ao ser solicitados`)
      }
      
      router.push('/exams')
    } catch (e) {
      alert((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'LABORATORY': 'Laboratório',
      'RADIOLOGY': 'Radiologia',
      'ECG': 'ECG',
      'PHYSIOTHERAPY': 'Fisioterapia',
      'APAC': 'APAC',
      'CYTOPATHOLOGY': 'Citopatológico',
      'MAMMOGRAPHY': 'Mamografia',
      'ULTRASOUND': 'Ultrassom',
      'LAB_ALTERNATIVE': 'Lab. Alternativo',
      'RAD_ALTERNATIVE': 'Rad. Alternativa',
      'OTHER_1': 'Outros',
      'OTHER_2': 'Outros'
    }
    return labels[category] || category
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'LABORATORY': return 'bg-purple-100 text-purple-700'
      case 'RADIOLOGY': return 'bg-blue-100 text-blue-700'
      case 'ECG': return 'bg-red-100 text-red-700'
      case 'ULTRASOUND': return 'bg-cyan-100 text-cyan-700'
      case 'MAMMOGRAPHY': return 'bg-pink-100 text-pink-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Paciente */}
      <div ref={patientRef} className="relative">
        <label className="block text-sm font-medium mb-2">Paciente *</label>
        {selectedPatient ? (
          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-full">
                  <User className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-sm">{selectedPatient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedPatient.cpf || 'CPF não informado'}
                    {selectedPatient.birthDate && ` • ${new Date(selectedPatient.birthDate).toLocaleDateString('pt-BR')}`}
                  </p>
                </div>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={clearPatient}>
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              value={patientSearch}
              onChange={e => {
                setPatientSearch(e.target.value)
                setShowPatientDropdown(true)
              }}
              onFocus={() => setShowPatientDropdown(true)}
              placeholder="Buscar paciente por nome ou CPF..."
              className="pl-10"
            />
            {patientLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
            )}
          </div>
        )}
        
        {showPatientDropdown && patients.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
            {patients.map(patient => (
              <button
                key={patient.id}
                type="button"
                onClick={() => selectPatient(patient)}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center gap-3 border-b last:border-0"
              >
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">{patient.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {patient.cpf || 'CPF não informado'}
                    {patient.birthDate && ` • ${new Date(patient.birthDate).toLocaleDateString('pt-BR')}`}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Seleção de Exames */}
      <div>
        <label className="block text-sm font-medium mb-2">Exames *</label>
        
          <Tabs value={activeTab} onValueChange={(v: string) => setActiveTab(v as 'individual' | 'combo')} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="individual" className="flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Exame Individual
            </TabsTrigger>
            <TabsTrigger value="combo" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Combo/Pacote
            </TabsTrigger>
          </TabsList>

          <TabsContent value="individual">
            <div ref={examRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={examSearch}
                  onChange={e => {
                    setExamSearch(e.target.value)
                    setShowExamDropdown(true)
                  }}
                  onFocus={() => setShowExamDropdown(true)}
                  placeholder="Buscar exame (ex: hemograma, glicemia)..."
                  className="pl-10"
                />
                {examLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>
              
              {showExamDropdown && exams.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-auto">
                  {exams.map(exam => (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => addExam(exam)}
                      disabled={selectedExams.some(e => e.id === exam.id)}
                      className={cn(
                        "w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-0",
                        selectedExams.some(e => e.id === exam.id) && "opacity-50 cursor-not-allowed bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <FlaskConical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{exam.name}</p>
                            {exam.abbreviation && (
                              <span className="text-xs text-muted-foreground">({exam.abbreviation})</span>
                            )}
                            {selectedExams.some(e => e.id === exam.id) && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge className={cn('text-[10px]', getCategoryColor(exam.category))}>
                              {exam.categoryLabel}
                            </Badge>
                            {exam.hasRestrictions && (
                              <AlertTriangle className="h-3 w-3 text-yellow-500" />
                            )}
                          </div>
                        </div>
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="combo">
            <div ref={comboRef} className="relative">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  value={comboSearch}
                  onChange={e => {
                    setComboSearch(e.target.value)
                    setShowComboDropdown(true)
                  }}
                  onFocus={() => {
                    setShowComboDropdown(true)
                    if (!comboSearch) searchCombos('')
                  }}
                  placeholder="Buscar combo (ex: check-up, perfil lipídico)..."
                  className="pl-10"
                />
                {comboLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>
              
              {showComboDropdown && combos.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-96 overflow-auto">
                  {combos.map(combo => (
                    <button
                      key={combo.id}
                      type="button"
                      onClick={() => selectCombo(combo)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 border-b last:border-0"
                    >
                      <div className="flex items-start gap-3">
                        <Package className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-sm">{combo.name}</p>
                            <Badge variant="outline" className="text-[10px]">
                              {combo.items.length} exames
                            </Badge>
                          </div>
                          {combo.description && (
                            <p className="text-xs text-muted-foreground mt-1">{combo.description}</p>
                          )}
                          <div className="flex flex-wrap gap-1 mt-2">
                            {combo.items.slice(0, 4).map((item, i) => (
                              <Badge key={i} variant="secondary" className="text-[10px]">
                                {item.exam.abbreviation || item.exam.name}
                              </Badge>
                            ))}
                            {combo.items.length > 4 && (
                              <Badge variant="secondary" className="text-[10px]">
                                +{combo.items.length - 4}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {combos.length === 0 && !comboLoading && (
                <p className="text-sm text-muted-foreground mt-2">
                  Nenhum combo de exames encontrado. 
                  <a href="/admin/exam-combos" className="text-primary hover:underline ml-1">
                    Criar novo combo
                  </a>
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Lista de exames selecionados */}
        {selectedExams.length > 0 && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">
                Exames selecionados ({selectedExams.length})
              </p>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={() => setSelectedExams([])}
                className="text-red-500 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Limpar todos
              </Button>
            </div>
            <div className="grid gap-2">
              {selectedExams.map(exam => (
                <Card key={exam.id} className="border-blue-100">
                  <CardContent className="p-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FlaskConical className="h-4 w-4 text-blue-500" />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{exam.name}</p>
                          {exam.abbreviation && (
                            <span className="text-xs text-muted-foreground">({exam.abbreviation})</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge className={cn('text-[10px]', getCategoryColor(exam.category))}>
                            {exam.categoryLabel}
                          </Badge>
                          {exam.fromCombo && (
                            <Badge variant="outline" className="text-[10px]">
                              <Package className="h-2.5 w-2.5 mr-1" />
                              {exam.fromCombo}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="icon"
                      onClick={() => removeExam(exam.id)}
                      className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Descrição */}
      <div>
        <label className="block text-sm font-medium mb-2">Indicação / Justificativa *</label>
        <Textarea 
          value={form.description} 
          onChange={e => setForm({ ...form, description: e.target.value })} 
          placeholder="Descreva a indicação clínica para o(s) exame(s)..."
          rows={3}
          required 
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Prioridade */}
        <div>
          <label className="block text-sm font-medium mb-2">Prioridade</label>
          <Select value={form.priority} onValueChange={value => setForm({ ...form, priority: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="LOW">Baixa</SelectItem>
              <SelectItem value="NORMAL">Normal</SelectItem>
              <SelectItem value="HIGH">Alta</SelectItem>
              <SelectItem value="URGENT">Urgente</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Data agendada */}
        <div>
          <label className="block text-sm font-medium mb-2">Data Agendada</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              type="datetime-local" 
              value={form.scheduledDate} 
              onChange={e => setForm({ ...form, scheduledDate: e.target.value })}
              className="pl-10"
            />
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium mb-2">Observações</label>
          <Input 
            value={form.notes} 
            onChange={e => setForm({ ...form, notes: e.target.value })}
            placeholder="Observações adicionais..."
          />
        </div>
      </div>

      {/* Ações */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={() => router.back()} disabled={loading}>
          Cancelar
        </Button>
        <Button type="submit" disabled={loading || !selectedPatient || selectedExams.length === 0}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Solicitando...
            </>
          ) : (
            <>
              <CheckCircle className="h-4 w-4 mr-2" />
              Solicitar {selectedExams.length > 1 ? `${selectedExams.length} Exames` : 'Exame'}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  FlaskConical,
  Loader2,
  X,
  GripVertical,
  Check,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExamCatalog {
  id: string
  name: string
  abbreviation: string
  category: string
  examCategory?: string
  preparation?: string
}

interface ExamComboItem {
  id?: string
  examId: string
  exam: ExamCatalog
  order: number
  notes?: string
  isRequired: boolean
}

interface ExamCombo {
  id: string
  name: string
  description: string | null
  category: string | null
  isActive: boolean
  isPublic: boolean
  usageCount: number
  items: ExamComboItem[]
  createdBy?: {
    id: string
    name: string
  }
}

const EXAM_CATEGORIES = [
  { value: 'LABORATORY', label: 'Laboratório' },
  { value: 'RADIOLOGY', label: 'Radiologia' },
  { value: 'ECG', label: 'ECG' },
  { value: 'PHYSIOTHERAPY', label: 'Fisioterapia' },
  { value: 'APAC', label: 'APAC' },
  { value: 'CYTOPATHOLOGY', label: 'Citopatológico' },
  { value: 'MAMMOGRAPHY', label: 'Mamografia' },
  { value: 'ULTRASOUND', label: 'Ultrassom' },
  { value: 'LAB_ALTERNATIVE', label: 'Lab. Alternativo' },
  { value: 'RAD_ALTERNATIVE', label: 'Rad. Alternativa' },
  { value: 'OTHER_1', label: 'Outros 1' },
  { value: 'OTHER_2', label: 'Outros 2' },
]

export default function ExamCombosPage() {
  const [combos, setCombos] = useState<ExamCombo[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [showDialog, setShowDialog] = useState(false)
  const [editingCombo, setEditingCombo] = useState<ExamCombo | null>(null)
  const [saving, setSaving] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: '',
    isActive: true,
    isPublic: true,
  })
  const [selectedItems, setSelectedItems] = useState<ExamComboItem[]>([])

  // Exam search
  const [examSearch, setExamSearch] = useState('')
  const [examResults, setExamResults] = useState<ExamCatalog[]>([])
  const [examLoading, setExamLoading] = useState(false)

  const loadCombos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        activeOnly: 'false',
        ...(searchQuery && { search: searchQuery }),
      })
      const res = await fetch(`/api/exam-combos?${params}`)
      if (res.ok) {
        const data = await res.json()
        setCombos(data.combos || [])
      }
    } catch (error) {
      console.error('Erro ao carregar combos:', error)
    } finally {
      setLoading(false)
    }
  }, [searchQuery])

  useEffect(() => {
    loadCombos()
  }, [loadCombos])

  // Search exams
  const searchExams = useCallback(async (query: string) => {
    if (query.length < 2) {
      setExamResults([])
      return
    }
    setExamLoading(true)
    try {
      const res = await fetch(`/api/exams/autocomplete?q=${encodeURIComponent(query)}`)
      if (res.ok) {
        const data = await res.json()
        setExamResults(data)
      }
    } catch (error) {
      console.error('Erro ao buscar exames:', error)
    } finally {
      setExamLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      searchExams(examSearch)
    }, 300)
    return () => clearTimeout(timer)
  }, [examSearch, searchExams])

  const openCreateDialog = () => {
    setEditingCombo(null)
    setFormData({
      name: '',
      description: '',
      category: '',
      isActive: true,
      isPublic: true,
    })
    setSelectedItems([])
    setShowDialog(true)
  }

  const openEditDialog = (combo: ExamCombo) => {
    setEditingCombo(combo)
    setFormData({
      name: combo.name,
      description: combo.description || '',
      category: combo.category || '',
      isActive: combo.isActive,
      isPublic: combo.isPublic,
    })
    setSelectedItems(combo.items.map((item, index) => ({
      ...item,
      order: item.order ?? index,
    })))
    setShowDialog(true)
  }

  const addExamToCombo = (exam: ExamCatalog) => {
    if (selectedItems.some(item => item.examId === exam.id)) return

    setSelectedItems(prev => [
      ...prev,
      {
        examId: exam.id,
        exam: {
          id: exam.id,
          name: exam.name,
          abbreviation: exam.abbreviation || '',
          category: exam.category || exam.examCategory || '',
        },
        order: prev.length,
        isRequired: true,
      },
    ])
    setExamSearch('')
    setExamResults([])
  }

  const removeExamFromCombo = (examId: string) => {
    setSelectedItems(prev => prev.filter(item => item.examId !== examId))
  }

  const moveExam = (index: number, direction: 'up' | 'down') => {
    const newItems = [...selectedItems]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newItems.length) return

    ;[newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]]
    setSelectedItems(newItems.map((item, i) => ({ ...item, order: i })))
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Nome é obrigatório')
      return
    }
    if (selectedItems.length === 0) {
      alert('Adicione pelo menos um exame ao combo')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        category: formData.category || null,
        isActive: formData.isActive,
        isPublic: formData.isPublic,
        items: selectedItems.map((item, index) => ({
          examId: item.examId,
          order: index,
          notes: item.notes || null,
          isRequired: item.isRequired,
        })),
      }

      const url = editingCombo
        ? `/api/exam-combos/${editingCombo.id}`
        : '/api/exam-combos'
      const method = editingCombo ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao salvar combo')
      }

      setShowDialog(false)
      loadCombos()
    } catch (error) {
      alert((error as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (combo: ExamCombo) => {
    if (!confirm(`Deseja excluir o combo "${combo.name}"?`)) return

    try {
      const res = await fetch(`/api/exam-combos/${combo.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao excluir combo')
      }
      loadCombos()
    } catch (error) {
      alert((error as Error).message)
    }
  }

  const getCategoryLabel = (category: string | null) => {
    if (!category) return null
    const cat = EXAM_CATEGORIES.find(c => c.value === category)
    return cat?.label || category
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
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Package className="h-6 w-6 text-blue-500" />
            Combos de Exames
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie pacotes de exames pré-configurados para agilizar solicitações
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Combo
        </Button>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Buscar combos por nome..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Combos List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : combos.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="font-medium mb-1">Nenhum combo encontrado</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Crie combos de exames para agilizar as solicitações
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Criar primeiro combo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {combos.map(combo => (
            <Card key={combo.id} className={cn(!combo.isActive && 'opacity-60')}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {combo.name}
                      {!combo.isActive && (
                        <Badge variant="secondary" className="text-xs">Inativo</Badge>
                      )}
                    </CardTitle>
                    {combo.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {combo.description}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => openEditDialog(combo)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => handleDelete(combo)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1 mb-3">
                  {combo.items.slice(0, 5).map((item, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {item.exam.abbreviation || item.exam.name}
                    </Badge>
                  ))}
                  {combo.items.length > 5 && (
                    <Badge variant="secondary" className="text-xs">
                      +{combo.items.length - 5}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{combo.items.length} exames</span>
                  <span>{combo.usageCount} usos</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCombo ? 'Editar Combo' : 'Novo Combo de Exames'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Nome */}
            <div>
              <label className="block text-sm font-medium mb-1">Nome *</label>
              <Input
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Check-up Básico, Perfil Lipídico"
              />
            </div>

            {/* Descrição */}
            <div>
              <label className="block text-sm font-medium mb-1">Descrição</label>
              <Textarea
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o propósito deste combo..."
                rows={2}
              />
            </div>

            {/* Categoria e Opções */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Categoria</label>
                <Select
                  value={formData.category || "NONE"}
                  onValueChange={value => setFormData({ ...formData, category: value === "NONE" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE">Nenhuma</SelectItem>
                    {EXAM_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={e => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isActive" className="text-sm">Ativo</label>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={formData.isPublic}
                  onChange={e => setFormData({ ...formData, isPublic: e.target.checked })}
                  className="rounded"
                />
                <label htmlFor="isPublic" className="text-sm">Público</label>
              </div>
            </div>

            {/* Adicionar Exames */}
            <div>
              <label className="block text-sm font-medium mb-1">Adicionar Exames *</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={examSearch}
                  onChange={e => setExamSearch(e.target.value)}
                  placeholder="Buscar exame para adicionar..."
                  className="pl-10"
                />
                {examLoading && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin" />
                )}
              </div>

              {examResults.length > 0 && (
                <div className="mt-2 border rounded-lg max-h-40 overflow-auto">
                  {examResults.map(exam => (
                    <button
                      key={exam.id}
                      type="button"
                      onClick={() => addExamToCombo(exam)}
                      disabled={selectedItems.some(i => i.examId === exam.id)}
                      className={cn(
                        "w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center justify-between border-b last:border-0",
                        selectedItems.some(i => i.examId === exam.id) && "opacity-50 bg-gray-50"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <FlaskConical className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{exam.name}</span>
                        {exam.abbreviation && (
                          <span className="text-xs text-muted-foreground">
                            ({exam.abbreviation})
                          </span>
                        )}
                      </div>
                      {selectedItems.some(i => i.examId === exam.id) ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Plus className="h-4 w-4" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Exames Selecionados */}
            {selectedItems.length > 0 && (
              <div>
                <label className="block text-sm font-medium mb-1">
                  Exames no Combo ({selectedItems.length})
                </label>
                <div className="border rounded-lg divide-y">
                  {selectedItems.map((item, index) => (
                    <div
                      key={item.examId}
                      className="flex items-center gap-2 px-3 py-2"
                    >
                      <div className="flex flex-col gap-1">
                        <button
                          type="button"
                          onClick={() => moveExam(index, 'up')}
                          disabled={index === 0}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          onClick={() => moveExam(index, 'down')}
                          disabled={index === selectedItems.length - 1}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        >
                          ▼
                        </button>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FlaskConical className="h-4 w-4 text-blue-500" />
                          <span className="text-sm font-medium">{item.exam.name}</span>
                          {item.exam.abbreviation && (
                            <span className="text-xs text-muted-foreground">
                              ({item.exam.abbreviation})
                            </span>
                          )}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => removeExamFromCombo(item.examId)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Salvar Combo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { toast } from '@/hooks/use-toast'
import { logger } from '@/lib/logger'

type QuestionCategory =
  | 'TIME_HORIZON'
  | 'COMPLEXITY'
  | 'ABSTRACTION'
  | 'UNCERTAINTY'
  | 'DECISION_MAKING'
  | 'LEADERSHIP'

type QuestionType = 'SCENARIO' | 'SCALE' | 'RANKING' | 'OPEN'

type StratumLevel = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8'

type StratumMapping = Record<string, { timeSpanMonths: number; score: number; stratum: StratumLevel }>

type Option = { id: string; text: string; [key: string]: unknown }

type StratumQuestion = {
  id: string
  category: QuestionCategory
  questionText: string
  questionType: QuestionType
  options: Option[]
  stratumMapping: StratumMapping
  weight: number
  order: number
  active: boolean
  createdAt: string
  updatedAt: string
}

const CATEGORY_LABELS: Record<QuestionCategory, string> = {
  TIME_HORIZON: 'Horizonte Temporal',
  COMPLEXITY: 'Complexidade',
  ABSTRACTION: 'Abstração',
  UNCERTAINTY: 'Incerteza',
  DECISION_MAKING: 'Tomada de Decisão',
  LEADERSHIP: 'Liderança'
}

const STRATUM_LEVELS: readonly StratumLevel[] = ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8'] as const

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

function validateQuestionJson(
  questionType: QuestionType,
  optionsJson: string,
  mappingJson: string
): {
  errors: string[]
  warnings: string[]
  optionIds: string[]
  mappingKeys: string[]
  previewRows: Array<{
    id: string
    text: string
    timeSpanMonths?: number
    score?: number
    stratum?: string
    status: 'ok' | 'missing_mapping' | 'invalid_mapping'
  }>
  extraMappingKeys: string[]
} {
  const errors: string[] = []
  const warnings: string[] = []

  let optionsValue: unknown
  try {
    optionsValue = JSON.parse(optionsJson)
  } catch {
    errors.push('Options: JSON inválido')
    optionsValue = []
  }

  let mappingValue: unknown
  try {
    mappingValue = JSON.parse(mappingJson)
  } catch {
    errors.push('StratumMapping: JSON inválido')
    mappingValue = {}
  }

  const options: Option[] = Array.isArray(optionsValue) ? (optionsValue as Option[]) : []
  if (!Array.isArray(optionsValue)) {
    errors.push('Options: precisa ser um array JSON')
  }

  const mapping: Record<string, any> =
    mappingValue && typeof mappingValue === 'object' && !Array.isArray(mappingValue)
      ? (mappingValue as Record<string, any>)
      : {}
  if (!mappingValue || typeof mappingValue !== 'object' || Array.isArray(mappingValue)) {
    errors.push('StratumMapping: precisa ser um objeto JSON (chave = optionId)')
  }

  const optionIds = options
    .map((o) => (isNonEmptyString(o?.id) ? o.id.trim() : ''))
    .filter(Boolean)

  if (questionType === 'RANKING') {
    warnings.push(
      'Tipo RANKING: a UI atual trata como seleção simples (não há ordenação de múltiplas opções).'
    )
  }

  const missingIdCount = options.filter((o) => !isNonEmptyString(o?.id)).length
  const missingTextCount = options.filter((o) => !isNonEmptyString(o?.text)).length
  if (missingIdCount > 0) errors.push(`Options: ${missingIdCount} item(ns) sem id válido`) 
  if (missingTextCount > 0) errors.push(`Options: ${missingTextCount} item(ns) sem text válido`) 

  const uniqueIds = new Set(optionIds)
  if (uniqueIds.size !== optionIds.length) {
    errors.push('Options: existem optionId duplicados')
  }

  const mappingKeys = Object.keys(mapping)

  const extraMappingKeys = mappingKeys.filter((key) => !optionIds.includes(key))

  const previewRows = options
    .map((o) => {
      const id = isNonEmptyString(o?.id) ? o.id.trim() : ''
      const text = isNonEmptyString(o?.text) ? o.text.trim() : ''
      const entry = id ? mapping[id] : null

      if (!id || !text) {
        return {
          id: id || '(sem id)',
          text: text || '(sem texto)',
          status: 'invalid_mapping' as const
        }
      }

      if (!entry || typeof entry !== 'object') {
        return {
          id,
          text,
          status: 'missing_mapping' as const
        }
      }

      return {
        id,
        text,
        timeSpanMonths: entry.timeSpanMonths,
        score: entry.score,
        stratum: entry.stratum,
        status: 'ok' as const
      }
    })
    .slice(0, 50)

  // OPEN não usa options/mapping para cálculo (timeSpan é informado pelo usuário)
  const requiresMapping = questionType !== 'OPEN'
  if (requiresMapping) {
    if (options.length === 0) errors.push('Options: obrigatório para este tipo de questão')
    if (mappingKeys.length === 0) errors.push('StratumMapping: obrigatório para este tipo de questão')
  } else {
    if (options.length > 0 || mappingKeys.length > 0) {
      warnings.push('Questão OPEN: o cálculo usa o Time Span informado pelo usuário; options/mapping não serão usados.')
    }
  }

  // Consistência mapping <-> options
  if (requiresMapping) {
    const missingInMapping = optionIds.filter((id) => !mappingKeys.includes(id))
    const extraInMapping = mappingKeys.filter((key) => !optionIds.includes(key))

    if (missingInMapping.length > 0) {
      errors.push(`StratumMapping: faltam chaves para optionId(s): ${missingInMapping.slice(0, 8).join(', ')}${missingInMapping.length > 8 ? '…' : ''}`)
    }
    if (extraInMapping.length > 0) {
      warnings.push(`StratumMapping: existem chaves sem opção correspondente: ${extraInMapping.slice(0, 8).join(', ')}${extraInMapping.length > 8 ? '…' : ''}`)
    }
  }

  // Validar valores do mapping
  for (const key of mappingKeys) {
    const entry = mapping[key]
    if (!entry || typeof entry !== 'object') {
      errors.push(`StratumMapping[${key}]: valor precisa ser objeto`) 
      continue
    }

    const timeSpanMonths = entry.timeSpanMonths
    const score = entry.score
    const stratum = entry.stratum

    if (!Number.isFinite(timeSpanMonths) || timeSpanMonths <= 0 || Math.floor(timeSpanMonths) !== timeSpanMonths) {
      errors.push(`StratumMapping[${key}].timeSpanMonths inválido (int > 0)`) 
    }
    if (!Number.isFinite(score) || score < 0 || score > 1) {
      errors.push(`StratumMapping[${key}].score inválido (0..1)`) 
    }
    if (!isNonEmptyString(stratum) || !STRATUM_LEVELS.includes(stratum as StratumLevel)) {
      errors.push(`StratumMapping[${key}].stratum inválido (S1..S8)`) 
    }
  }

  return { errors, warnings, optionIds, mappingKeys, previewRows, extraMappingKeys }
}

function jsonParseOrThrow<T>(value: string): T {
  try {
    return JSON.parse(value) as T
  } catch {
    throw new Error('JSON inválido')
  }
}

function jsonStringifyPretty(value: unknown): string {
  return JSON.stringify(value, null, 2)
}

export function StratumQuestionsAdmin() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [questions, setQuestions] = useState<StratumQuestion[]>([])
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<QuestionCategory | ''>('')
  const [includeInactive, setIncludeInactive] = useState(true)

  // Create form
  const [newCategory, setNewCategory] = useState<QuestionCategory>('TIME_HORIZON')
  const [newQuestionText, setNewQuestionText] = useState('')
  const [newQuestionType, setNewQuestionType] = useState<QuestionType>('SCENARIO')
  const [newWeight, setNewWeight] = useState('1')
  const [newOrder, setNewOrder] = useState('0')
  const [newActive, setNewActive] = useState(true)
  const [newOptionsJson, setNewOptionsJson] = useState('[]')
  const [newMappingJson, setNewMappingJson] = useState('{}')

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<StratumQuestion | null>(null)
  const [editCategory, setEditCategory] = useState<QuestionCategory>('TIME_HORIZON')
  const [editQuestionText, setEditQuestionText] = useState('')
  const [editQuestionType, setEditQuestionType] = useState<QuestionType>('SCENARIO')
  const [editWeight, setEditWeight] = useState('1')
  const [editOrder, setEditOrder] = useState('0')
  const [editActive, setEditActive] = useState(true)
  const [editOptionsJson, setEditOptionsJson] = useState('[]')
  const [editMappingJson, setEditMappingJson] = useState('{}')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return questions.filter((item) => {
      if (!includeInactive && !item.active) return false
      if (category && item.category !== category) return false
      if (!q) return true
      return item.questionText.toLowerCase().includes(q) || item.id.toLowerCase().includes(q)
    })
  }, [category, includeInactive, query, questions])

  const newJsonValidation = useMemo(() => {
    return validateQuestionJson(newQuestionType, newOptionsJson, newMappingJson)
  }, [newMappingJson, newOptionsJson, newQuestionType])

  const editJsonValidation = useMemo(() => {
    return validateQuestionJson(editQuestionType, editOptionsJson, editMappingJson)
  }, [editMappingJson, editOptionsJson, editQuestionType])

  async function loadQuestions() {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (category) params.set('category', category)
      if (includeInactive) params.set('includeInactive', '1')

      const res = await fetch(`/api/stratum/questions?${params.toString()}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Falha ao carregar questões')
      setQuestions(data.questions || [])
    } catch (error: any) {
      logger.error('Erro ao carregar questões:', error)
      toast({ title: 'Erro', description: error?.message || 'Falha ao carregar questões', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadQuestions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createQuestion() {
    try {
      setSaving(true)

      const weight = Number(newWeight)
      const order = Number(newOrder)
      if (!Number.isFinite(weight) || weight <= 0) throw new Error('Weight inválido')
      if (!Number.isFinite(order) || order < 0) throw new Error('Order inválido')
      if (!newQuestionText.trim()) throw new Error('Texto da questão é obrigatório')

      const options = jsonParseOrThrow<Option[]>(newOptionsJson)
      const stratumMapping = jsonParseOrThrow<StratumMapping>(newMappingJson)

      const res = await fetch('/api/stratum/questions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategory,
          questionText: newQuestionText.trim(),
          questionType: newQuestionType,
          options,
          stratumMapping,
          weight,
          order,
          active: newActive
        })
      })

      const data = await res.json()
      if (!res.ok) {
        const details = data?.details?.fieldErrors ? JSON.stringify(data.details.fieldErrors) : ''
        throw new Error([data?.error, details].filter(Boolean).join(' '))
      }

      toast({ title: 'Sucesso', description: 'Questão criada.' })
      setNewQuestionText('')
      setNewOptionsJson('[]')
      setNewMappingJson('{}')
      await loadQuestions()
    } catch (error: any) {
      toast({ title: 'Erro', description: error?.message || 'Falha ao criar questão', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  function openEditDialog(q: StratumQuestion) {
    setEditing(q)
    setEditCategory(q.category)
    setEditQuestionText(q.questionText)
    setEditQuestionType(q.questionType)
    setEditWeight(String(q.weight))
    setEditOrder(String(q.order))
    setEditActive(Boolean(q.active))
    setEditOptionsJson(jsonStringifyPretty(q.options || []))
    setEditMappingJson(jsonStringifyPretty(q.stratumMapping || {}))
    setEditOpen(true)
  }

  async function saveEdit() {
    if (!editing) return

    try {
      setSaving(true)

      const weight = Number(editWeight)
      const order = Number(editOrder)
      if (!Number.isFinite(weight) || weight <= 0) throw new Error('Weight inválido')
      if (!Number.isFinite(order) || order < 0) throw new Error('Order inválido')
      if (!editQuestionText.trim()) throw new Error('Texto da questão é obrigatório')

      const options = jsonParseOrThrow<Option[]>(editOptionsJson)
      const stratumMapping = jsonParseOrThrow<StratumMapping>(editMappingJson)

      const res = await fetch('/api/stratum/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: editing.id,
          category: editCategory,
          questionText: editQuestionText.trim(),
          questionType: editQuestionType,
          options,
          stratumMapping,
          weight,
          order,
          active: editActive
        })
      })

      const data = await res.json()
      if (!res.ok) {
        const details = data?.details?.fieldErrors ? JSON.stringify(data.details.fieldErrors) : ''
        throw new Error([data?.error, details].filter(Boolean).join(' '))
      }

      toast({ title: 'Sucesso', description: 'Questão atualizada.' })
      setEditOpen(false)
      setEditing(null)
      await loadQuestions()
    } catch (error: any) {
      toast({ title: 'Erro', description: error?.message || 'Falha ao atualizar questão', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(q: StratumQuestion) {
    try {
      setSaving(true)
      const res = await fetch('/api/stratum/questions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: q.id,
          active: !q.active
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Falha ao atualizar')
      await loadQuestions()
    } catch (error: any) {
      toast({ title: 'Erro', description: error?.message || 'Falha ao atualizar', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Questões (Admin)</CardTitle>
          <CardDescription>
            Cadastre e mantenha as questões reais do questionário. Sem seed automático.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex flex-col gap-1">
              <label className="text-sm text-gray-700">Categoria</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as QuestionCategory | '')}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Todas</option>
                {(Object.keys(CATEGORY_LABELS) as QuestionCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1 flex-1 min-w-[240px]">
              <label className="text-sm text-gray-700">Busca</label>
              <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por texto…" />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              Incluir inativas
            </label>

            <Button variant="outline" onClick={loadQuestions} disabled={loading || saving}>
              Recarregar
            </Button>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">Carregando…</div>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-gray-500">Total: {filtered.length}</div>
              <div className="divide-y rounded-md border bg-white">
                {filtered.length === 0 && (
                  <div className="p-4 text-sm text-gray-500">Nenhuma questão encontrada.</div>
                )}
                {filtered.map((q) => (
                  <div key={q.id} className="p-4 flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-2 justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant={q.active ? 'default' : 'secondary'}>
                          {q.active ? 'Ativa' : 'Inativa'}
                        </Badge>
                        <Badge variant="outline">{CATEGORY_LABELS[q.category] || q.category}</Badge>
                        <span className="text-xs text-gray-500">ordem {q.order} • peso {q.weight}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={() => toggleActive(q)} disabled={saving}>
                          {q.active ? 'Desativar' : 'Ativar'}
                        </Button>
                        <Button variant="default" size="sm" onClick={() => openEditDialog(q)}>
                          Editar
                        </Button>
                      </div>
                    </div>

                    <div className="text-sm text-gray-900 whitespace-pre-line">{q.questionText}</div>
                    <div className="text-xs text-gray-500">ID: {q.id}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Nova questão</CardTitle>
          <CardDescription>
            Informe o texto e os JSONs de opções/mapeamento conforme sua regra real de avaliação.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-sm text-gray-700">Categoria</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as QuestionCategory)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {(Object.keys(CATEGORY_LABELS) as QuestionCategory[]).map((key) => (
                  <option key={key} value={key}>
                    {CATEGORY_LABELS[key]}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-700">Tipo</label>
              <select
                value={newQuestionType}
                onChange={(e) => setNewQuestionType(e.target.value as QuestionType)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="SCENARIO">SCENARIO</option>
                <option value="SCALE">SCALE</option>
                <option value="RANKING">RANKING</option>
                <option value="OPEN">OPEN</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-700">Peso</label>
              <Input type="number" min={0.1} step={0.1} value={newWeight} onChange={(e) => setNewWeight(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-700">Ordem</label>
              <Input type="number" min={0} step={1} value={newOrder} onChange={(e) => setNewOrder(e.target.value)} />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
              <input type="checkbox" checked={newActive} onChange={(e) => setNewActive(e.target.checked)} />
              Ativa
            </label>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-700">Texto da questão</label>
            <Textarea value={newQuestionText} onChange={(e) => setNewQuestionText(e.target.value)} />
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-700">Options (JSON)</label>
            <Textarea value={newOptionsJson} onChange={(e) => setNewOptionsJson(e.target.value)} className="font-mono text-xs" />
            <p className="text-xs text-gray-500">JSON array com objetos contendo, no mínimo, id e text.</p>
          </div>

          <div className="space-y-1">
            <label className="text-sm text-gray-700">StratumMapping (JSON)</label>
            <Textarea value={newMappingJson} onChange={(e) => setNewMappingJson(e.target.value)} className="font-mono text-xs" />
            <p className="text-xs text-gray-500">
              JSON object com chaves = optionId e valores contendo timeSpanMonths (int), score (0..1) e stratum (S1..S8).
            </p>
          </div>

          <div className="space-y-2">
            {newJsonValidation.errors.length > 0 ? (
              <Alert variant="destructive">
                <AlertTitle>Validação</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 space-y-1">
                    {newJsonValidation.errors.map((e) => (
                      <li key={e}>{e}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            ) : newJsonValidation.warnings.length > 0 ? (
              <Alert>
                <AlertTitle>Validação</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-5 space-y-1">
                    {newJsonValidation.warnings.map((w) => (
                      <li key={w}>{w}</li>
                    ))}
                  </ul>
                  <div className="mt-2 text-xs text-gray-500">
                    Options: {newJsonValidation.optionIds.length} • Mapping: {newJsonValidation.mappingKeys.length}
                  </div>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <AlertTitle>Validação</AlertTitle>
                <AlertDescription>
                  <div className="text-sm">JSON consistente.</div>
                  <div className="mt-1 text-xs text-gray-500">
                    Options: {newJsonValidation.optionIds.length} • Mapping: {newJsonValidation.mappingKeys.length}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {newJsonValidation.extraMappingKeys.length > 0 && (
              <Alert>
                <AlertTitle>Observação</AlertTitle>
                <AlertDescription>
                  <div className="text-sm">
                    Existem chaves em StratumMapping sem opção correspondente ({newJsonValidation.extraMappingKeys.length}).
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {newJsonValidation.previewRows.length > 0 && (
              <div className="rounded-md border bg-white">
                <div className="p-3 border-b text-sm font-medium">Preview de impacto (por opção)</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Option</TableHead>
                      <TableHead>Time Span (meses)</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Stratum</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {newJsonValidation.previewRows.map((row) => (
                      <TableRow key={row.id + row.text}>
                        <TableCell>
                          <div className="font-mono text-xs text-gray-600">{row.id}</div>
                          <div className="text-sm text-gray-900">{row.text}</div>
                        </TableCell>
                        <TableCell className="font-mono">{row.timeSpanMonths ?? '—'}</TableCell>
                        <TableCell className="font-mono">{typeof row.score === 'number' ? row.score.toFixed(2) : '—'}</TableCell>
                        <TableCell className="font-mono">{row.stratum ?? '—'}</TableCell>
                        <TableCell>
                          {row.status === 'ok' ? (
                            <Badge>OK</Badge>
                          ) : row.status === 'missing_mapping' ? (
                            <Badge variant="secondary">Sem mapping</Badge>
                          ) : (
                            <Badge variant="destructive">Inválido</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {newJsonValidation.previewRows.length === 50 && (
                  <div className="p-3 text-xs text-gray-500 border-t">Mostrando as primeiras 50 opções.</div>
                )}
              </div>
            )}
          </div>

          <Button onClick={createQuestion} disabled={saving || newJsonValidation.errors.length > 0}>
            {saving ? 'Salvando…' : 'Criar questão'}
          </Button>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar questão</DialogTitle>
            <DialogDescription>
              Ajuste texto, pesos e os JSONs. Mudanças afetam o questionário.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-sm text-gray-700">Categoria</label>
                <select
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value as QuestionCategory)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  {(Object.keys(CATEGORY_LABELS) as QuestionCategory[]).map((key) => (
                    <option key={key} value={key}>
                      {CATEGORY_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-700">Tipo</label>
                <select
                  value={editQuestionType}
                  onChange={(e) => setEditQuestionType(e.target.value as QuestionType)}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="SCENARIO">SCENARIO</option>
                  <option value="SCALE">SCALE</option>
                  <option value="RANKING">RANKING</option>
                  <option value="OPEN">OPEN</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-700">Peso</label>
                <Input type="number" min={0.1} step={0.1} value={editWeight} onChange={(e) => setEditWeight(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-sm text-gray-700">Ordem</label>
                <Input type="number" min={0} step={1} value={editOrder} onChange={(e) => setEditOrder(e.target.value)} />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700 md:col-span-2">
                <input type="checkbox" checked={editActive} onChange={(e) => setEditActive(e.target.checked)} />
                Ativa
              </label>
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-700">Texto</label>
              <Textarea value={editQuestionText} onChange={(e) => setEditQuestionText(e.target.value)} />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-700">Options (JSON)</label>
              <Textarea value={editOptionsJson} onChange={(e) => setEditOptionsJson(e.target.value)} className="font-mono text-xs" />
            </div>

            <div className="space-y-1">
              <label className="text-sm text-gray-700">StratumMapping (JSON)</label>
              <Textarea value={editMappingJson} onChange={(e) => setEditMappingJson(e.target.value)} className="font-mono text-xs" />
            </div>

            <div className="space-y-2">
              {editJsonValidation.errors.length > 0 ? (
                <Alert variant="destructive">
                  <AlertTitle>Validação</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 space-y-1">
                      {editJsonValidation.errors.map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              ) : editJsonValidation.warnings.length > 0 ? (
                <Alert>
                  <AlertTitle>Validação</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 space-y-1">
                      {editJsonValidation.warnings.map((w) => (
                        <li key={w}>{w}</li>
                      ))}
                    </ul>
                    <div className="mt-2 text-xs text-gray-500">
                      Options: {editJsonValidation.optionIds.length} • Mapping: {editJsonValidation.mappingKeys.length}
                    </div>
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertTitle>Validação</AlertTitle>
                  <AlertDescription>
                    <div className="text-sm">JSON consistente.</div>
                    <div className="mt-1 text-xs text-gray-500">
                      Options: {editJsonValidation.optionIds.length} • Mapping: {editJsonValidation.mappingKeys.length}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {editJsonValidation.extraMappingKeys.length > 0 && (
                <Alert>
                  <AlertTitle>Observação</AlertTitle>
                  <AlertDescription>
                    <div className="text-sm">
                      Existem chaves em StratumMapping sem opção correspondente ({editJsonValidation.extraMappingKeys.length}).
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {editJsonValidation.previewRows.length > 0 && (
                <div className="rounded-md border bg-white">
                  <div className="p-3 border-b text-sm font-medium">Preview de impacto (por opção)</div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Option</TableHead>
                        <TableHead>Time Span (meses)</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>Stratum</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {editJsonValidation.previewRows.map((row) => (
                        <TableRow key={row.id + row.text}>
                          <TableCell>
                            <div className="font-mono text-xs text-gray-600">{row.id}</div>
                            <div className="text-sm text-gray-900">{row.text}</div>
                          </TableCell>
                          <TableCell className="font-mono">{row.timeSpanMonths ?? '—'}</TableCell>
                          <TableCell className="font-mono">{typeof row.score === 'number' ? row.score.toFixed(2) : '—'}</TableCell>
                          <TableCell className="font-mono">{row.stratum ?? '—'}</TableCell>
                          <TableCell>
                            {row.status === 'ok' ? (
                              <Badge>OK</Badge>
                            ) : row.status === 'missing_mapping' ? (
                              <Badge variant="secondary">Sem mapping</Badge>
                            ) : (
                              <Badge variant="destructive">Inválido</Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {editJsonValidation.previewRows.length === 50 && (
                    <div className="p-3 text-xs text-gray-500 border-t">Mostrando as primeiras 50 opções.</div>
                  )}
                </div>
              )}
            </div>

            {editing?.id && <div className="text-xs text-gray-500">ID: {editing.id}</div>}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveEdit} disabled={saving || editJsonValidation.errors.length > 0}>
              {saving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

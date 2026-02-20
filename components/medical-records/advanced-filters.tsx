'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetFooter,
} from '@/components/ui/sheet'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import {
  Filter,
  X,
  ChevronDown,
  ChevronRight,
  Calendar as CalendarIcon,
  Search,
  Save,
  Trash2,
  RotateCcw,
  Plus,
  Star,
  StarOff
} from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from '@/hooks/use-toast'

// ============ TYPES ============

export interface FilterField {
  id: string
  label: string
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange' | 'number' | 'boolean' | 'search'
  options?: { value: string; label: string }[]
  placeholder?: string
  defaultValue?: any
  group?: string
  searchEndpoint?: string
}

export interface FilterValue {
  fieldId: string
  value: any
  operator?: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains' | 'startsWith' | 'endsWith' | 'in'
}

export interface SavedFilter {
  id: string
  name: string
  values: FilterValue[]
  isFavorite?: boolean
  createdAt: string
}

interface AdvancedFiltersProps {
  fields: FilterField[]
  values: FilterValue[]
  onChange: (values: FilterValue[]) => void
  savedFilters?: SavedFilter[]
  onSaveFilter?: (name: string, values: FilterValue[]) => void
  onDeleteFilter?: (id: string) => void
  onToggleFavorite?: (id: string) => void
  className?: string
  showSidebar?: boolean
}

// ============ DEFAULT MEDICAL RECORD FIELDS ============

export const MEDICAL_RECORD_FILTER_FIELDS: FilterField[] = [
  {
    id: 'search',
    label: 'Busca geral',
    type: 'text',
    placeholder: 'Buscar em todos os campos...',
    group: 'Geral'
  },
  {
    id: 'patientName',
    label: 'Nome do Paciente',
    type: 'text',
    placeholder: 'Nome do paciente',
    group: 'Paciente'
  },
  {
    id: 'patientCpf',
    label: 'CPF do Paciente',
    type: 'text',
    placeholder: '000.000.000-00',
    group: 'Paciente'
  },
  {
    id: 'dateRange',
    label: 'Período',
    type: 'daterange',
    group: 'Data'
  },
  {
    id: 'type',
    label: 'Tipo de Atendimento',
    type: 'multiselect',
    options: [
      { value: 'CONSULTATION', label: 'Consulta' },
      { value: 'RETURN', label: 'Retorno' },
      { value: 'EMERGENCY', label: 'Emergência' },
      { value: 'EXAM', label: 'Exame' },
      { value: 'PROCEDURE', label: 'Procedimento' },
      { value: 'TELEMEDICINE', label: 'Telemedicina' }
    ],
    group: 'Atendimento'
  },
  {
    id: 'status',
    label: 'Status',
    type: 'multiselect',
    options: [
      { value: 'DRAFT', label: 'Rascunho' },
      { value: 'ACTIVE', label: 'Ativo' },
      { value: 'SIGNED', label: 'Assinado' },
      { value: 'ARCHIVED', label: 'Arquivado' }
    ],
    group: 'Atendimento'
  },
  {
    id: 'priority',
    label: 'Prioridade',
    type: 'select',
    options: [
      { value: 'LOW', label: 'Baixa' },
      { value: 'NORMAL', label: 'Normal' },
      { value: 'HIGH', label: 'Alta' },
      { value: 'URGENT', label: 'Urgente' }
    ],
    group: 'Atendimento'
  },
  {
    id: 'doctorId',
    label: 'Médico Responsável',
    type: 'search',
    searchEndpoint: '/api/users?role=DOCTOR',
    placeholder: 'Buscar médico...',
    group: 'Profissional'
  },
  {
    id: 'specialty',
    label: 'Especialidade',
    type: 'multiselect',
    options: [
      { value: 'GENERAL', label: 'Clínica Geral' },
      { value: 'CARDIOLOGY', label: 'Cardiologia' },
      { value: 'DERMATOLOGY', label: 'Dermatologia' },
      { value: 'ORTHOPEDICS', label: 'Ortopedia' },
      { value: 'PEDIATRICS', label: 'Pediatria' },
      { value: 'GYNECOLOGY', label: 'Ginecologia' },
      { value: 'NEUROLOGY', label: 'Neurologia' },
      { value: 'PSYCHIATRY', label: 'Psiquiatria' }
    ],
    group: 'Profissional'
  },
  {
    id: 'hasPrescription',
    label: 'Com Prescrição',
    type: 'boolean',
    group: 'Conteúdo'
  },
  {
    id: 'hasAttachments',
    label: 'Com Anexos',
    type: 'boolean',
    group: 'Conteúdo'
  },
  {
    id: 'isSigned',
    label: 'Assinado Digitalmente',
    type: 'boolean',
    group: 'Conteúdo'
  },
  {
    id: 'diagnosisCid',
    label: 'CID-10',
    type: 'text',
    placeholder: 'Ex: J06.9',
    group: 'Diagnóstico'
  }
]

// ============ FILTER COMPONENTS ============

function TextFilter({
  field,
  value,
  onChange
}: {
  field: FilterField
  value?: string
  onChange: (value: string) => void
}) {
  return (
    <Input
      placeholder={field.placeholder}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="h-9"
    />
  )
}

function SelectFilter({
  field,
  value,
  onChange
}: {
  field: FilterField
  value?: string
  onChange: (value: string) => void
}) {
  return (
    <Select value={value || ''} onValueChange={onChange}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder={field.placeholder || 'Selecione...'} />
      </SelectTrigger>
      <SelectContent>
        {field.options?.map((opt) => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

function MultiSelectFilter({
  field,
  value,
  onChange
}: {
  field: FilterField
  value?: string[]
  onChange: (value: string[]) => void
}) {
  const selected = value || []

  const toggleOption = (optValue: string) => {
    if (selected.includes(optValue)) {
      onChange(selected.filter(v => v !== optValue))
    } else {
      onChange([...selected, optValue])
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="h-9 justify-start w-full">
          {selected.length > 0 ? (
            <span className="truncate">
              {selected.length} selecionado{selected.length > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-muted-foreground">{field.placeholder || 'Selecione...'}</span>
          )}
          <ChevronDown className="ml-auto h-4 w-4 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="space-y-1 max-h-48 overflow-auto">
          {field.options?.map((opt) => (
            <div
              key={opt.value}
              className="flex items-center gap-2 p-2 rounded hover:bg-muted cursor-pointer"
              onClick={() => toggleOption(opt.value)}
            >
              <Checkbox checked={selected.includes(opt.value)} />
              <span className="text-sm">{opt.label}</span>
            </div>
          ))}
        </div>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2"
            onClick={() => onChange([])}
          >
            Limpar seleção
          </Button>
        )}
      </PopoverContent>
    </Popover>
  )
}

function DateRangeFilter({
  field,
  value,
  onChange
}: {
  field: FilterField
  value?: { from?: string; to?: string }
  onChange: (value: { from?: string; to?: string }) => void
}) {
  const [dateFrom, setDateFrom] = useState<Date | undefined>(
    value?.from ? parseISO(value.from) : undefined
  )
  const [dateTo, setDateTo] = useState<Date | undefined>(
    value?.to ? parseISO(value.to) : undefined
  )

  const handleFromChange = (date: Date | undefined) => {
    setDateFrom(date)
    onChange({
      from: date ? date.toISOString() : undefined,
      to: value?.to
    })
  }

  const handleToChange = (date: Date | undefined) => {
    setDateTo(date)
    onChange({
      from: value?.from,
      to: date ? date.toISOString() : undefined
    })
  }

  return (
    <div className="flex gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 justify-start flex-1">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateFrom ? format(dateFrom, 'dd/MM/yy') : 'De'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateFrom}
            onSelect={handleFromChange}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-9 justify-start flex-1">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateTo ? format(dateTo, 'dd/MM/yy') : 'Até'}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={dateTo}
            onSelect={handleToChange}
            locale={ptBR}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

function BooleanFilter({
  field,
  value,
  onChange
}: {
  field: FilterField
  value?: boolean
  onChange: (value: boolean | undefined) => void
}) {
  return (
    <div className="flex items-center gap-2">
      <Checkbox
        id={field.id}
        checked={value === true}
        onCheckedChange={(checked) => {
          if (checked) {
            onChange(true)
          } else if (value === true) {
            onChange(false)
          } else {
            onChange(undefined)
          }
        }}
      />
      <Label htmlFor={field.id} className="text-sm cursor-pointer">
        {value === true ? 'Sim' : value === false ? 'Não' : 'Qualquer'}
      </Label>
    </div>
  )
}

// ============ FILTER GROUP ============

function FilterGroup({
  title,
  fields,
  values,
  onChange,
  defaultOpen = true
}: {
  title: string
  fields: FilterField[]
  values: FilterValue[]
  onChange: (values: FilterValue[]) => void
  defaultOpen?: boolean
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const getFieldValue = (fieldId: string) => {
    const filter = values.find(v => v.fieldId === fieldId)
    return filter?.value
  }

  const setFieldValue = (fieldId: string, value: any) => {
    const existingIndex = values.findIndex(v => v.fieldId === fieldId)
    let newValues: FilterValue[]

    if (value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
      // Remove filter
      newValues = values.filter(v => v.fieldId !== fieldId)
    } else if (existingIndex >= 0) {
      // Update existing
      newValues = [...values]
      newValues[existingIndex] = { ...newValues[existingIndex], value }
    } else {
      // Add new
      newValues = [...values, { fieldId, value }]
    }

    onChange(newValues)
  }

  const activeCount = fields.filter(f => {
    const v = getFieldValue(f.id)
    return v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0)
  }).length

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen} className="space-y-2">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-2 hover:bg-muted rounded-md">
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-medium text-sm">{title}</span>
        </div>
        {activeCount > 0 && (
          <Badge variant="secondary" className="text-xs">
            {activeCount}
          </Badge>
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="space-y-3 px-2">
        {fields.map((field) => (
          <div key={field.id} className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">{field.label}</Label>
            {field.type === 'text' || field.type === 'search' ? (
              <TextFilter
                field={field}
                value={getFieldValue(field.id)}
                onChange={(v) => setFieldValue(field.id, v)}
              />
            ) : field.type === 'select' ? (
              <SelectFilter
                field={field}
                value={getFieldValue(field.id)}
                onChange={(v) => setFieldValue(field.id, v)}
              />
            ) : field.type === 'multiselect' ? (
              <MultiSelectFilter
                field={field}
                value={getFieldValue(field.id)}
                onChange={(v) => setFieldValue(field.id, v)}
              />
            ) : field.type === 'daterange' ? (
              <DateRangeFilter
                field={field}
                value={getFieldValue(field.id)}
                onChange={(v) => setFieldValue(field.id, v)}
              />
            ) : field.type === 'boolean' ? (
              <BooleanFilter
                field={field}
                value={getFieldValue(field.id)}
                onChange={(v) => setFieldValue(field.id, v)}
              />
            ) : null}
          </div>
        ))}
      </CollapsibleContent>
    </Collapsible>
  )
}

// ============ SAVED FILTERS ============

function SavedFiltersSection({
  filters,
  onLoad,
  onDelete,
  onToggleFavorite
}: {
  filters: SavedFilter[]
  onLoad: (filter: SavedFilter) => void
  onDelete?: (id: string) => void
  onToggleFavorite?: (id: string) => void
}) {
  if (filters.length === 0) return null

  const favorites = filters.filter(f => f.isFavorite)
  const others = filters.filter(f => !f.isFavorite)

  return (
    <div className="space-y-2 border-t pt-4 mt-4">
      <Label className="text-xs text-muted-foreground uppercase">Filtros Salvos</Label>
      <div className="space-y-1">
        {[...favorites, ...others].map((filter) => (
          <div
            key={filter.id}
            className="flex items-center gap-2 p-2 rounded hover:bg-muted group"
          >
            <button
              onClick={() => onToggleFavorite?.(filter.id)}
              className="text-muted-foreground hover:text-yellow-500"
            >
              {filter.isFavorite ? (
                <Star className="h-4 w-4 fill-yellow-500 text-yellow-500" />
              ) : (
                <StarOff className="h-4 w-4" />
              )}
            </button>
            <button
              onClick={() => onLoad(filter)}
              className="flex-1 text-left text-sm truncate"
            >
              {filter.name}
            </button>
            <Badge variant="outline" className="text-xs">
              {filter.values.length}
            </Badge>
            {onDelete && (
              <button
                onClick={() => onDelete(filter.id)}
                className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ============ MAIN COMPONENT ============

export function AdvancedFilters({
  fields,
  values,
  onChange,
  savedFilters = [],
  onSaveFilter,
  onDeleteFilter,
  onToggleFavorite,
  className,
  showSidebar = false
}: AdvancedFiltersProps) {
  const [filterName, setFilterName] = useState('')
  const [showSaveDialog, setShowSaveDialog] = useState(false)

  // Group fields
  const groupedFields = fields.reduce((acc, field) => {
    const group = field.group || 'Outros'
    if (!acc[group]) acc[group] = []
    acc[group].push(field)
    return acc
  }, {} as Record<string, FilterField[]>)

  const activeFiltersCount = values.filter(v => {
    return v.value !== undefined && v.value !== '' && !(Array.isArray(v.value) && v.value.length === 0)
  }).length

  const handleClear = () => {
    onChange([])
  }

  const handleSave = () => {
    if (!filterName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite um nome para o filtro',
        variant: 'destructive'
      })
      return
    }
    onSaveFilter?.(filterName, values)
    setFilterName('')
    setShowSaveDialog(false)
    toast({
      title: 'Filtro salvo',
      description: `O filtro "${filterName}" foi salvo com sucesso.`
    })
  }

  const handleLoadFilter = (filter: SavedFilter) => {
    onChange(filter.values)
    toast({
      title: 'Filtro aplicado',
      description: `Filtro "${filter.name}" aplicado.`
    })
  }

  const filterContent = (
    <div className="space-y-4">
      {/* Active Filters Summary */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2 pb-2 border-b">
          {values.map((filter) => {
            const field = fields.find(f => f.id === filter.fieldId)
            if (!field) return null

            let displayValue = String(filter.value)
            if (Array.isArray(filter.value)) {
              displayValue = `${filter.value.length} itens`
            } else if (typeof filter.value === 'object' && filter.value.from) {
              const from = filter.value.from ? format(parseISO(filter.value.from), 'dd/MM') : '?'
              const to = filter.value.to ? format(parseISO(filter.value.to), 'dd/MM') : '?'
              displayValue = `${from} - ${to}`
            } else if (typeof filter.value === 'boolean') {
              displayValue = filter.value ? 'Sim' : 'Não'
            }

            return (
              <Badge key={filter.fieldId} variant="secondary" className="gap-1">
                <span className="text-muted-foreground">{field.label}:</span>
                <span className="truncate max-w-[100px]">{displayValue}</span>
                <button
                  onClick={() => onChange(values.filter(v => v.fieldId !== filter.fieldId))}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}

      {/* Filter Groups */}
      {Object.entries(groupedFields).map(([group, groupFields]) => (
        <FilterGroup
          key={group}
          title={group}
          fields={groupFields}
          values={values}
          onChange={onChange}
          defaultOpen={group === 'Geral'}
        />
      ))}

      {/* Saved Filters */}
      <SavedFiltersSection
        filters={savedFilters}
        onLoad={handleLoadFilter}
        onDelete={onDeleteFilter}
        onToggleFavorite={onToggleFavorite}
      />

      {/* Actions */}
      <div className="flex gap-2 pt-4 border-t">
        {onSaveFilter && values.length > 0 && (
          <Popover open={showSaveDialog} onOpenChange={setShowSaveDialog}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="flex-1">
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-3">
                <Label>Nome do filtro</Label>
                <Input
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Ex: Consultas urgentes"
                />
                <Button onClick={handleSave} size="sm" className="w-full">
                  Salvar filtro
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClear}
          disabled={activeFiltersCount === 0}
          className="flex-1"
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Limpar
        </Button>
      </div>
    </div>
  )

  if (showSidebar) {
    return (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" className={className}>
            <Filter className="h-4 w-4 mr-2" />
            Filtros
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80 overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros Avançados
            </SheetTitle>
            <SheetDescription>
              Refine sua busca com múltiplos critérios
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6">
            {filterContent}
          </div>
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Card className={cn('w-72', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="secondary">{activeFiltersCount}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {filterContent}
      </CardContent>
    </Card>
  )
}

// ============ HOOK PARA USO SIMPLIFICADO ============

export function useAdvancedFilters(
  defaultValues: FilterValue[] = [],
  storageKey?: string
) {
  const [values, setValues] = useState<FilterValue[]>(defaultValues)
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])

  // Load from localStorage
  useEffect(() => {
    if (storageKey && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`filters:${storageKey}`)
        if (saved) {
          setSavedFilters(JSON.parse(saved))
        }
      } catch (e) {
        console.error('Failed to load saved filters:', e)
      }
    }
  }, [storageKey])

  const saveFilter = useCallback((name: string, filterValues: FilterValue[]) => {
    const newFilter: SavedFilter = {
      id: `filter-${Date.now()}`,
      name,
      values: filterValues,
      createdAt: new Date().toISOString()
    }
    
    const updated = [...savedFilters, newFilter]
    setSavedFilters(updated)
    
    if (storageKey) {
      localStorage.setItem(`filters:${storageKey}`, JSON.stringify(updated))
    }
  }, [savedFilters, storageKey])

  const deleteFilter = useCallback((id: string) => {
    const updated = savedFilters.filter(f => f.id !== id)
    setSavedFilters(updated)
    
    if (storageKey) {
      localStorage.setItem(`filters:${storageKey}`, JSON.stringify(updated))
    }
  }, [savedFilters, storageKey])

  const toggleFavorite = useCallback((id: string) => {
    const updated = savedFilters.map(f => 
      f.id === id ? { ...f, isFavorite: !f.isFavorite } : f
    )
    setSavedFilters(updated)
    
    if (storageKey) {
      localStorage.setItem(`filters:${storageKey}`, JSON.stringify(updated))
    }
  }, [savedFilters, storageKey])

  // Build query string
  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams()
    
    for (const filter of values) {
      if (filter.value !== undefined && filter.value !== '') {
        if (Array.isArray(filter.value)) {
          params.set(filter.fieldId, filter.value.join(','))
        } else if (typeof filter.value === 'object') {
          if (filter.value.from) params.set(`${filter.fieldId}From`, filter.value.from)
          if (filter.value.to) params.set(`${filter.fieldId}To`, filter.value.to)
        } else {
          params.set(filter.fieldId, String(filter.value))
        }
      }
    }
    
    return params.toString()
  }, [values])

  // Build Prisma where clause
  const buildWhereClause = useCallback(() => {
    const where: Record<string, any> = {}
    
    for (const filter of values) {
      if (filter.value === undefined || filter.value === '') continue

      if (filter.fieldId === 'search') {
        where.OR = [
          { diagnosis: { contains: filter.value, mode: 'insensitive' } },
          { chiefComplaint: { contains: filter.value, mode: 'insensitive' } },
          { patient: { name: { contains: filter.value, mode: 'insensitive' } } }
        ]
      } else if (filter.fieldId === 'patientName') {
        where.patient = { name: { contains: filter.value, mode: 'insensitive' } }
      } else if (filter.fieldId === 'dateRange') {
        if (filter.value.from) {
          where.createdAt = { ...where.createdAt, gte: new Date(filter.value.from) }
        }
        if (filter.value.to) {
          where.createdAt = { ...where.createdAt, lte: new Date(filter.value.to) }
        }
      } else if (Array.isArray(filter.value)) {
        where[filter.fieldId] = { in: filter.value }
      } else if (typeof filter.value === 'boolean') {
        if (filter.fieldId === 'hasPrescription') {
          where.prescriptions = filter.value ? { some: {} } : { none: {} }
        } else if (filter.fieldId === 'hasAttachments') {
          where.attachments = filter.value ? { some: {} } : { none: {} }
        } else {
          where[filter.fieldId] = filter.value
        }
      } else {
        where[filter.fieldId] = filter.value
      }
    }
    
    return where
  }, [values])

  return {
    values,
    setValues,
    savedFilters,
    saveFilter,
    deleteFilter,
    toggleFavorite,
    buildQueryString,
    buildWhereClause,
    hasActiveFilters: values.length > 0
  }
}

export default AdvancedFilters

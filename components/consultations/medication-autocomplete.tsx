"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Pill, AlertTriangle, Check, Loader2, Plus } from 'lucide-react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'

interface MedicationSuggestion {
  id: string
  code: string
  name: string
  displayName: string
  synonyms: string
  prescriptionType: string
  prescriptionTypeLabel: string
  route: string
  routeLabel: string
  form: string
  defaultDosage: string
  defaultFrequency: string
  defaultDuration: number
  defaultQuantity: number
  unit: string
  availability: string[]
  hasRestrictions: boolean
  restrictions: string[]
}

interface MedicationAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (medication: MedicationSuggestion) => void
  /** Quando o médico digita um nome e não há resultado no catálogo, permite adicionar como medicamento não cadastrado */
  onAddCustom?: (name: string) => void
  patientAge?: number
  patientSex?: 'M' | 'F'
  availabilityFilter?: 'basic' | 'popular' | 'hospital' | 'all'
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function MedicationAutocomplete({
  value,
  onChange,
  onSelect,
  onAddCustom,
  patientAge,
  patientSex,
  availabilityFilter = 'all',
  placeholder = 'Digite o nome do medicamento...',
  disabled = false,
  className
}: MedicationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<MedicationSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  const showAddCustom = Boolean(
    onAddCustom &&
    value.trim().length >= 2 &&
    !isLoading &&
    suggestions.length === 0
  )
  const totalOptions = suggestions.length + (showAddCustom ? 1 : 0)

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({ q: query })
      if (patientAge) params.set('patientAge', String(patientAge))
      if (patientSex) params.set('patientSex', patientSex)
      if (availabilityFilter !== 'all') params.set('availability', availabilityFilter)

      const res = await fetch(`/api/medications/autocomplete?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data)
        setHighlightIndex(0)
      }
    } catch (error) {
      logger.error('Erro ao buscar medicamentos:', error)
    } finally {
      setIsLoading(false)
    }
  }, [patientAge, patientSex, availabilityFilter])

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 250)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [value, fetchSuggestions])

  useEffect(() => {
    if (!value || value.length < 2) {
      setIsOpen(false)
    }
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIndex(prev =>
          prev < totalOptions - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (showAddCustom && highlightIndex === suggestions.length) {
          handleAddCustom()
        } else if (suggestions[highlightIndex]) {
          handleSelect(suggestions[highlightIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const handleAddCustom = () => {
    const name = value.trim()
    if (name && onAddCustom) {
      onAddCustom(name)
      onChange('')
      setIsOpen(false)
      setSuggestions([])
    }
  }

  const handleSelect = (medication: MedicationSuggestion) => {
    onChange(medication.displayName)
    onSelect(medication)
    setIsOpen(false)
    setSuggestions([])
  }

  const getPrescriptionTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      'SYMPTOMATIC': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'CONTINUOUS': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'CONTROLLED': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      'BLUE_B': 'bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100',
      'YELLOW_A': 'bg-amber-200 text-amber-900 dark:bg-amber-800 dark:text-amber-100'
    }
    return colors[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Anchor asChild>
        <div className={cn('relative', className)}>
          <Pill className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            value={value}
            onChange={(e) => {
              const next = e.target.value
              onChange(next)
              if (next.length >= 2) setIsOpen(true)
              else setIsOpen(false)
            }}
            onFocus={() => {
              if (value.length >= 2) setIsOpen(true)
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="pl-10"
          />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
        </div>
      </PopoverPrimitive.Anchor>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className={cn(
            'z-50 w-[--radix-popover-trigger-width] rounded-md border bg-popover text-popover-foreground shadow-md outline-none',
            'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            (suggestions.length > 0 || showAddCustom ? 'p-0' : 'p-3')
          )}
        >
          {suggestions.length > 0 || showAddCustom ? (
            <div className="max-h-80 overflow-auto">
              {suggestions.map((med, index) => (
                <div
                  key={med.id}
                  className={cn(
                    'px-3 py-2 cursor-pointer border-b border-border last:border-0',
                    index === highlightIndex ? 'bg-accent' : 'hover:bg-muted/50'
                  )}
                  onClick={() => handleSelect(med)}
                  onMouseEnter={() => setHighlightIndex(index)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground truncate">{med.displayName}</div>
                      {med.synonyms && (
                        <div className="text-xs text-muted-foreground truncate">{med.synonyms}</div>
                      )}
                    </div>
                    <Badge className={cn('text-xs whitespace-nowrap', getPrescriptionTypeBadge(med.prescriptionType))}>
                      {med.prescriptionTypeLabel}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap gap-1 mt-1">
                    {med.routeLabel && (
                      <Badge variant="outline" className="text-xs">{med.routeLabel}</Badge>
                    )}
                    {med.availability.map((avail, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        <Check className="h-3 w-3 mr-1" /> {avail}
                      </Badge>
                    ))}
                    {med.hasRestrictions && (
                      <Badge variant="destructive" className="text-xs">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Restrições
                      </Badge>
                    )}
                  </div>

                  {med.defaultDosage && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Sugestão: {med.defaultDosage} {med.defaultFrequency && `- ${med.defaultFrequency}`}
                    </div>
                  )}
                </div>
              ))}
              {showAddCustom && (
                <div
                  className={cn(
                    'px-3 py-2.5 cursor-pointer border-t border-border flex items-center gap-2',
                    highlightIndex === suggestions.length ? 'bg-accent' : 'hover:bg-muted/50 bg-muted/30'
                  )}
                  onClick={handleAddCustom}
                  onMouseEnter={() => setHighlightIndex(suggestions.length)}
                >
                  <Plus className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">
                    Adicionar <strong>&quot;{value.trim()}&quot;</strong> (não cadastrado)
                  </span>
                </div>
              )}
            </div>
          ) : value.length >= 2 && !isLoading ? (
            <div className="text-center text-muted-foreground p-2">Nenhum medicamento encontrado no catálogo</div>
          ) : null}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

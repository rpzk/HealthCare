"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FlaskConical, Loader2, AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface ExamAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (exam: ExamSuggestion) => void
  patientAge?: number
  patientSex?: 'M' | 'F'
  category?: string
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function ExamAutocomplete({
  value,
  onChange,
  onSelect,
  patientAge,
  patientSex,
  category,
  placeholder = 'Digite o nome do exame...',
  disabled = false,
  className
}: ExamAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<ExamSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

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
      if (category) params.set('category', category)

      const res = await fetch(`/api/exams/autocomplete?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data)
        setHighlightIndex(0)
      }
    } catch (error) {
      console.error('Erro ao buscar exames:', error)
    } finally {
      setIsLoading(false)
    }
  }, [patientAge, patientSex, category])

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
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : prev
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightIndex(prev => prev > 0 ? prev - 1 : prev)
        break
      case 'Enter':
        e.preventDefault()
        if (suggestions[highlightIndex]) {
          handleSelect(suggestions[highlightIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const handleSelect = (exam: ExamSuggestion) => {
    onChange(exam.label)
    onSelect(exam)
    setIsOpen(false)
    setSuggestions([])
  }

  const getCategoryColor = (cat: string) => {
    const colors: Record<string, string> = {
      'LABORATORY': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'RADIOLOGY': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'ECG': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      'ULTRASOUND': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      'MAMMOGRAPHY': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'CYTOPATHOLOGY': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
    return colors[cat] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <FlaskConical className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={value}
          onChange={(e) => {
            onChange(e.target.value)
            setIsOpen(true)
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

      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-80 overflow-auto">
          {suggestions.map((exam, index) => (
            <div
              key={exam.id}
              className={cn(
                'px-3 py-2 cursor-pointer border-b border-border last:border-0',
                index === highlightIndex ? 'bg-accent' : 'hover:bg-muted/50'
              )}
              onClick={() => handleSelect(exam)}
              onMouseEnter={() => setHighlightIndex(index)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {exam.abbreviation && (
                      <span className="font-mono font-bold text-primary">
                        {exam.abbreviation}
                      </span>
                    )}
                    <span className="text-sm text-foreground">
                      {exam.name}
                    </span>
                  </div>
                  {exam.description && (
                    <div className="text-xs text-muted-foreground mt-1 truncate">
                      {exam.description}
                    </div>
                  )}
                </div>
                <Badge className={cn('text-xs whitespace-nowrap', getCategoryColor(exam.category))}>
                  {exam.categoryLabel}
                </Badge>
              </div>
              
              <div className="flex flex-wrap gap-1 mt-1">
                {exam.susCode && (
                  <Badge variant="outline" className="text-xs">
                    SUS: {exam.susCode}
                  </Badge>
                )}
                {exam.hasRestrictions && (
                  <Badge variant="destructive" className="text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Restrições
                  </Badge>
                )}
              </div>

              {exam.preparation && (
                <div className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                  ⚠️ Preparo: {exam.preparation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {isOpen && value.length >= 2 && suggestions.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3 text-center text-muted-foreground">
          Nenhum exame encontrado
        </div>
      )}
    </div>
  )
}

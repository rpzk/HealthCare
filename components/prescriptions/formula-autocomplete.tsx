'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Search, FlaskConical, Pill, Info, X } from 'lucide-react'

type FormulaTemplate = {
  id: string
  name: string
  category: string
  ingredients: string
  form: string
  dosage: string
  notes: string | null
  indications: string | null
  contraindications: string | null
}

type FormulaAutocompleteProps = {
  onSelect: (formula: FormulaTemplate) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

export function FormulaAutocomplete({
  onSelect,
  placeholder = 'Buscar fórmula magistral...',
  className,
  disabled = false,
}: FormulaAutocompleteProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<FormulaTemplate[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<NodeJS.Timeout>()

  // Busca com debounce
  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery || searchQuery.length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    setLoading(true)
    try {
      const res = await fetch(
        `/api/formulas?autocomplete=true&search=${encodeURIComponent(searchQuery)}`
      )
      if (res.ok) {
        const data = await res.json()
        setResults(data.formulas || [])
        setIsOpen(true)
        setSelectedIndex(0)
      }
    } catch (error) {
      console.error('Erro ao buscar fórmulas:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Debounce da busca
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      search(query)
    }, 300)

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [query, search])

  // Navegação por teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(i => (i < results.length - 1 ? i + 1 : 0))
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(i => (i > 0 ? i - 1 : results.length - 1))
        break
      case 'Enter':
        e.preventDefault()
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  // Seleciona uma fórmula
  const handleSelect = (formula: FormulaTemplate) => {
    onSelect(formula)
    setQuery('')
    setIsOpen(false)
    setResults([])
  }

  // Scroll automático para item selecionado
  useEffect(() => {
    if (listRef.current && isOpen) {
      const selectedElement = listRef.current.children[selectedIndex] as HTMLElement
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [selectedIndex, isOpen])

  // Fecha ao clicar fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        listRef.current &&
        !listRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Cor do badge por categoria
  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'Endocrinologia': 'bg-purple-100 text-purple-800',
      'Gastrointestinal': 'bg-green-100 text-green-800',
      'Neurologia': 'bg-blue-100 text-blue-800',
      'Cardiovascular': 'bg-red-100 text-red-800',
      'Imunologia': 'bg-yellow-100 text-yellow-800',
      'Ortopedia': 'bg-orange-100 text-orange-800',
      'Dermatologia': 'bg-pink-100 text-pink-800',
      'Detox': 'bg-teal-100 text-teal-800',
    }
    
    // Busca parcial
    for (const [key, color] of Object.entries(colors)) {
      if (category.toLowerCase().includes(key.toLowerCase())) {
        return color
      }
    }
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 2 && setIsOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {query && !loading && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setResults([])
              setIsOpen(false)
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && results.length > 0 && (
        <div
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg max-h-96 overflow-y-auto"
        >
          {results.map((formula, index) => (
            <div
              key={formula.id}
              className={cn(
                'p-3 cursor-pointer border-b last:border-b-0 transition-colors',
                index === selectedIndex && 'bg-accent',
                'hover:bg-accent/50'
              )}
              onClick={() => handleSelect(formula)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium truncate">{formula.name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className={cn('text-xs', getCategoryColor(formula.category))}>
                      {formula.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Pill className="h-3 w-3" />
                      {formula.form}
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {formula.ingredients}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    setExpandedId(expandedId === formula.id ? null : formula.id)
                  }}
                  className="p-1 hover:bg-background rounded"
                >
                  <Info className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              {/* Detalhes expandidos */}
              {expandedId === formula.id && (
                <div className="mt-2 pt-2 border-t text-xs space-y-1">
                  <p><strong>Posologia:</strong> {formula.dosage}</p>
                  {formula.indications && (
                    <p><strong>Indicações:</strong> {formula.indications}</p>
                  )}
                  {formula.contraindications && (
                    <p className="text-red-600">
                      <strong>Contraindicações:</strong> {formula.contraindications}
                    </p>
                  )}
                  {formula.notes && (
                    <p className="text-muted-foreground">
                      <strong>Notas:</strong> {formula.notes}
                    </p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sem resultados */}
      {isOpen && query.length >= 2 && results.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-lg shadow-lg p-4 text-center text-muted-foreground">
          Nenhuma fórmula encontrada para &quot;{query}&quot;
        </div>
      )}
    </div>
  )
}

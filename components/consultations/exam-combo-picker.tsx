"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Package, Loader2, Search } from 'lucide-react'
import { logger } from '@/lib/logger'

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

interface ExamComboPickerProps {
  onComboSelect: (combo: ExamCombo) => void
  disabled?: boolean
  className?: string
}

export function ExamComboPicker({ onComboSelect, disabled, className }: ExamComboPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [combos, setCombos] = useState<ExamCombo[]>([])
  const [loading, setLoading] = useState(false)
  const debounceRef = useRef<NodeJS.Timeout>()

  const fetchCombos = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/exam-combos/autocomplete?query=${encodeURIComponent(q)}&limit=10`)
      if (res.ok) {
        const data = await res.json()
        setCombos(data)
      }
    } catch (error) {
      logger.error('Erro ao buscar combos:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchCombos(query), 300)
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [query, fetchCombos])

  useEffect(() => {
    if (open) {
      setQuery('')
      fetchCombos('')
    }
  }, [open, fetchCombos])

  const handleSelect = (combo: ExamCombo) => {
    onComboSelect(combo)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={`h-6 w-6 p-0 ${className ?? ''}`}
          disabled={disabled}
          title="Adicionar combo de exames"
        >
          <Package className="h-3 w-3" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="p-2 border-b">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar combo..."
              className="h-8 pl-8 text-sm"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-56 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : combos.length === 0 ? (
            <p className="py-4 px-3 text-sm text-muted-foreground text-center">
              Nenhum combo encontrado. Crie combos em Exames → Combos.
            </p>
          ) : (
            <div className="py-1">
              {combos.map((combo) => (
                <button
                  key={combo.id}
                  type="button"
                  onClick={() => handleSelect(combo)}
                  className="w-full px-3 py-2.5 text-left hover:bg-muted/80 flex items-start gap-2 transition-colors"
                >
                  <Package className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{combo.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {combo.items.length} exame{combo.items.length !== 1 ? 's' : ''}
                      {combo.description && ` • ${combo.description}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

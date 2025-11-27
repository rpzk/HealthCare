"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FileText, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CIDSuggestion {
  id: string
  code: string
  display: string
  description: string
  shortDescription: string
  chapter: string
  isCategory: boolean
  sexRestriction: string
  crossAsterisk: string
  label: string
  badges: string[]
}

interface CIDAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (cid: CIDSuggestion) => void
  patientSex?: 'M' | 'F'
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CIDAutocomplete({
  value,
  onChange,
  onSelect,
  patientSex,
  placeholder = 'Digite código ou descrição do CID...',
  disabled = false,
  className
}: CIDAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CIDSuggestion[]>([])
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
      if (patientSex) params.set('patientSex', patientSex)

      const res = await fetch(`/api/coding/autocomplete?${params}`)
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data)
        setHighlightIndex(0)
      }
    } catch (error) {
      console.error('Erro ao buscar CID:', error)
    } finally {
      setIsLoading(false)
    }
  }, [patientSex])

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

  const handleSelect = (cid: CIDSuggestion) => {
    onChange(cid.label)
    onSelect(cid)
    setIsOpen(false)
    setSuggestions([])
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
          {suggestions.map((cid, index) => (
            <div
              key={cid.id}
              className={cn(
                'px-3 py-2 cursor-pointer border-b border-border last:border-0',
                index === highlightIndex ? 'bg-accent' : 'hover:bg-muted/50'
              )}
              onClick={() => handleSelect(cid)}
              onMouseEnter={() => setHighlightIndex(index)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-primary">
                      {cid.code}
                    </span>
                    {cid.badges.map((badge, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {badge}
                      </Badge>
                    ))}
                  </div>
                  <div className="text-sm text-foreground mt-1">
                    {cid.display}
                  </div>
                  {cid.chapter && (
                    <div className="text-xs text-muted-foreground">
                      Cap. {cid.chapter}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isOpen && value.length >= 2 && suggestions.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-3 text-center text-muted-foreground">
          Nenhum código CID encontrado
        </div>
      )}
    </div>
  )
}

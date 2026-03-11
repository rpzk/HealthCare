"use client"

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { FileText, Loader2 } from 'lucide-react'
import * as PopoverPrimitive from '@radix-ui/react-popover'
import { cn } from '@/lib/utils'
import { logger } from '@/lib/logger'

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
  system?: 'CID10' | 'CIAP2'
}

interface CIDAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (cid: CIDSuggestion) => void
  patientSex?: 'M' | 'F'
  system?: 'CID10' | 'CIAP2'
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function CIDAutocomplete({
  value,
  onChange,
  onSelect,
  patientSex,
  system = 'CID10',
  placeholder = 'Digite código ou descrição do CID...',
  disabled = false,
  className
}: CIDAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<CIDSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [highlightIndex, setHighlightIndex] = useState(0)
  const debounceRef = useRef<NodeJS.Timeout>()

  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 1) {
      setSuggestions([])
      return
    }

    setIsLoading(true)
    try {
      const params = new URLSearchParams({ q: query, system, limit: '15' })
      if (patientSex) params.set('patientSex', patientSex)

      const res = await fetch(`/api/coding/autocomplete?${params}`)
      if (res.ok) {
        const data = await res.json()
        const raw = Array.isArray(data) ? data : (data.results || [])
        const mapped: CIDSuggestion[] = raw.map((r: { id?: string; code: string; display: string; description?: string; shortDescription?: string; label?: string; badges?: string[] }) => ({
          id: r.id ?? r.code,
          code: r.code,
          display: r.display,
          description: r.description ?? r.display,
          shortDescription: r.shortDescription ?? r.display,
          label: r.label ?? `${r.code} - ${r.display}`,
          badges: r.badges ?? [],
          chapter: '',
          isCategory: false,
          sexRestriction: '',
          crossAsterisk: '',
          system,
        }))
        setSuggestions(mapped)
        setHighlightIndex(0)
      }
    } catch (error) {
      logger.error('Erro ao buscar CID:', error)
    } finally {
      setIsLoading(false)
    }
  }, [patientSex, system])

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
    if (!value || value.trim().length < 1) {
      setIsOpen(false)
    }
  }, [value])

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
    <PopoverPrimitive.Root open={isOpen} onOpenChange={setIsOpen}>
      <PopoverPrimitive.Anchor asChild>
        <div className={cn('relative', className)}>
          <FileText className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={value}
            onChange={(e) => {
              const next = e.target.value
              onChange(next)
              if (next.trim().length >= 1) setIsOpen(true)
              else setIsOpen(false)
            }}
            onFocus={() => {
              if (value.trim().length >= 1) setIsOpen(true)
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
            (suggestions.length > 0 ? 'p-0' : 'p-3')
          )}
        >
          {suggestions.length > 0 ? (
            <div className="max-h-80 overflow-auto">
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
                        <span className="font-mono font-bold text-primary">{cid.code}</span>
                        {cid.badges.map((badge, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {badge}
                          </Badge>
                        ))}
                      </div>
                      <div className="text-sm text-foreground mt-1">{cid.display}</div>
                      {cid.chapter && (
                        <div className="text-xs text-muted-foreground">Cap. {cid.chapter}</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : value.trim().length >= 1 && !isLoading ? (
            <div className="text-center text-muted-foreground py-2">
              Nenhum código {system === 'CIAP2' ? 'CIAP-2' : 'CID'} encontrado. Verifique se o catálogo foi importado.
            </div>
          ) : null}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  )
}

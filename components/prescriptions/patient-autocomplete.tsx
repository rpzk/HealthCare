'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Users, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PatientSuggestion {
  id: string
  name: string
  email: string
  phone?: string
  birthDate?: string
  age?: number
  riskLevel?: string
}

interface PatientAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onSelect: (patient: PatientSuggestion) => void
  placeholder?: string
  disabled?: boolean
  className?: string
  required?: boolean
}

export function PatientAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = 'Buscar paciente por nome ou email...',
  disabled = false,
  className = '',
  required = false,
}: PatientAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<PatientSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [error, setError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Buscar pacientes quando o usuário digita
  const fetchPatients = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSuggestions([])
      setError(null)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`, {
        method: 'GET',
        credentials: 'include',
      })

      if (!response.ok) {
        if (response.status === 401) {
          setError('Não autorizado - Faça login novamente')
        } else {
          throw new Error(`HTTP ${response.status}`)
        }
        return
      }

      const data = await response.json()
      setSuggestions(Array.isArray(data) ? data : data.patients || [])
      setSelectedIndex(-1)
    } catch (e) {
      setError(`Erro ao buscar pacientes: ${(e as Error).message}`)
      setSuggestions([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Debounce para buscar pacientes
  useEffect(() => {
    const timer = setTimeout(() => {
      if (value.length > 0) {
        fetchPatients(value)
      } else {
        setSuggestions([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [value, fetchPatients])

  // Lidar com clique fora
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Lidar com teclado
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(idx => (idx < suggestions.length - 1 ? idx + 1 : 0))
        setIsOpen(true)
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(idx => (idx > 0 ? idx - 1 : suggestions.length - 1))
        setIsOpen(true)
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelect(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const handleSelect = (patient: PatientSuggestion) => {
    onChange(`${patient.name} (${patient.email})`)
    onSelect(patient)
    setIsOpen(false)
    setSuggestions([])
  }

  const getRiskLevelColor = (level?: string) => {
    switch (level?.toUpperCase()) {
      case 'ALTO':
        return 'bg-red-100 text-red-800'
      case 'MÉDIO':
        return 'bg-yellow-100 text-yellow-800'
      case 'BAIXO':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={cn('pl-9', className)}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {error && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-red-50 border border-red-200 rounded-md p-2 text-xs text-red-700 flex items-center gap-2 z-50">
          <AlertCircle className="h-3 w-3 flex-shrink-0" />
          {error}
        </div>
      )}

      {isOpen && (suggestions.length > 0 || isLoading) && !error && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-input rounded-md shadow-md z-50 max-h-64 overflow-y-auto">
          {suggestions.map((patient, idx) => (
            <button
              key={patient.id}
              type="button"
              onClick={() => handleSelect(patient)}
              onMouseEnter={() => setSelectedIndex(idx)}
              className={cn(
                'w-full text-left px-3 py-2 border-b last:border-b-0 hover:bg-muted transition-colors',
                selectedIndex === idx && 'bg-muted'
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{patient.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {patient.email}
                    {patient.phone && ` • ${patient.phone}`}
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {patient.age && (
                    <Badge variant="secondary" className="text-xs">
                      {patient.age}a
                    </Badge>
                  )}
                  {patient.riskLevel && (
                    <Badge
                      variant="outline"
                      className={cn('text-xs', getRiskLevelColor(patient.riskLevel))}
                    >
                      {patient.riskLevel}
                    </Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {isOpen && suggestions.length === 0 && !isLoading && value.trim() && !error && (
        <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-input rounded-md shadow-md p-4 text-center text-sm text-muted-foreground z-50">
          Nenhum paciente encontrado para "{value}"
        </div>
      )}
    </div>
  )
}

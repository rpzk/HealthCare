'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'

interface SearchResult {
  id: string
  title: string
  description: string
  type: 'patient' | 'consultation' | 'record' | 'prescription' | 'exam'
  href: string
}

interface PatientSearchResult {
  id: string
  name: string
  email: string
  phone?: string | null
}

const getTypeLabel = (type: string) => {
  const labels = {
    patient: 'Paciente',
    consultation: 'Consulta',
    record: 'Prontuário',
    prescription: 'Prescrição',
    exam: 'Exame'
  }
  return labels[type as keyof typeof labels] || type
}

const getTypeColor = (type: string) => {
  const colors = {
    patient: 'bg-blue-100 text-blue-800',
    consultation: 'bg-green-100 text-green-800',
    record: 'bg-purple-100 text-purple-800',
    prescription: 'bg-orange-100 text-orange-800',
    exam: 'bg-pink-100 text-pink-800'
  }
  return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const router = useRouter()

  useEffect(() => {
    const term = searchTerm.trim()
    if (term.length < 3) {
      setResults([])
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/patients/search?q=${encodeURIComponent(term)}`, {
          signal: controller.signal
        })
        if (!response.ok) {
          setResults([])
          return
        }

        const data = (await response.json()) as PatientSearchResult[]
        const mapped: SearchResult[] = data.map((p) => ({
          id: p.id,
          title: p.name,
          description: p.email || p.phone || '',
          type: 'patient',
          href: `/patients/${p.id}`
        }))
        setResults(mapped)
      } catch (error) {
        if ((error as any)?.name === 'AbortError') return
        setResults([])
      }
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [searchTerm])

  const handleSelect = (href: string) => {
    setOpen(false)
    setSearchTerm('')
    router.push(href)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchTerm.length > 2) {
      // Buscar na primeira página de resultados
      if (results.length > 0) {
        handleSelect(results[0].href)
      }
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar pacientes..."
            className="pl-10 pr-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setOpen(true)}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-8 w-8 p-0"
              onClick={() => {
                setSearchTerm('')
                setResults([])
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandList>
            {results.length === 0 && searchTerm.length > 2 ? (
              <CommandEmpty>Nenhum resultado encontrado.</CommandEmpty>
            ) : results.length === 0 ? (
              <div className="p-4 text-sm text-gray-500">
                Digite pelo menos 3 caracteres para buscar pacientes...
              </div>
            ) : (
              <CommandGroup>
                {results.map((result) => (
                  <CommandItem
                    key={result.id}
                    onSelect={() => handleSelect(result.href)}
                    className="flex items-center gap-3 p-3"
                  >
                    <div className="flex-1">
                      <div className="font-medium">{result.title}</div>
                      <div className="text-sm text-gray-500">{result.description}</div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full ${getTypeColor(result.type)}`}>
                      {getTypeLabel(result.type)}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

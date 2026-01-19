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
  CommandInput,
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

const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    title: 'Maria Santos',
    description: 'Paciente - 45 anos',
    type: 'patient',
    href: '/patients/1'
  },
  {
    id: '2',
    title: 'Consulta de Rotina - Cardiologia',
    description: 'Dr. João Silva - 15/01/2024',
    type: 'consultation',
    href: '/consultations/1'
  },
  {
    id: '3',
    title: 'Prontuário - Hipertensão',
    description: 'Maria Santos - 15/01/2024',
    type: 'record',
    href: '/records/1'
  },
  {
    id: '4',
    title: 'Prescrição - Losartana',
    description: 'Dr. João Silva - 15/01/2024',
    type: 'prescription',
    href: '/prescriptions/1'
  },
  {
    id: '5',
    title: 'Hemograma Completo',
    description: 'Maria Santos - 15/01/2024',
    type: 'exam',
    href: '/exams/1'
  }
]

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
    if (searchTerm.length > 2) {
      // Simular busca
      const filtered = mockSearchResults.filter(item =>
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setResults(filtered)
    } else {
      setResults([])
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
            placeholder="Buscar pacientes, consultas..."
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
                Digite pelo menos 3 caracteres para buscar...
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

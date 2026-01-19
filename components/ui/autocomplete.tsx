'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AutocompleteOption {
  id: string
  label: string
  value: string
  [key: string]: any
}

interface AutocompleteProps {
  endpoint: string
  placeholder?: string
  onSelect: (option: AutocompleteOption | null) => void
  value?: string
  className?: string
  emptyMessage?: string
}

function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  return useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args)
      }, delay)
    },
    [callback, delay]
  )
}

export function Autocomplete({
  endpoint,
  placeholder = 'Pesquisar...',
  onSelect,
  value,
  className,
  emptyMessage = 'Nenhum resultado encontrado',
}: AutocompleteProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<AutocompleteOption[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedOption, setSelectedOption] = useState<AutocompleteOption | null>(null)

  const fetchOptions = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setOptions([])
      return
    }

    try {
      setLoading(true)
      const res = await fetch(`${endpoint}?q=${encodeURIComponent(searchQuery)}`)
      const data = await res.json()
      if (data.success && Array.isArray(data.results)) {
        setOptions(data.results)
      }
    } catch (error) {
      console.error('Autocomplete fetch error:', error)
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [endpoint])

  const debouncedFetch = useDebouncedCallback(fetchOptions, 300)

  useEffect(() => {
    if (query) {
      debouncedFetch(query)
    } else {
      setOptions([])
    }
  }, [query, debouncedFetch])

  const handleSelect = (option: AutocompleteOption) => {
    setSelectedOption(option)
    setOpen(false)
    setQuery('')
    onSelect(option)
  }

  const displayValue = selectedOption?.label || value || placeholder

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn('w-full justify-between', className)}
        >
          <span className="truncate text-left">{displayValue}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {loading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            )}
            {!loading && query.length >= 2 && options.length === 0 && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}
            {!loading && query.length < 2 && (
              <CommandEmpty>Digite ao menos 2 caracteres para buscar</CommandEmpty>
            )}
            {!loading && options.length > 0 && (
              <CommandGroup>
                {options.map((option) => (
                  <div
                    key={option.id}
                    className={cn(
                      'relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground transition-colors',
                      selectedOption?.id === option.id ? 'bg-accent text-accent-foreground' : ''
                    )}
                    onClick={() => handleSelect(option)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedOption?.id === option.id ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {option.label}
                  </div>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

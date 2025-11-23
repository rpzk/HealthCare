"use client"
import { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export type AddressSuggestion = {
  label: string
  street?: string
  number?: string
  neighborhood?: string
  city?: string
  state?: string
  zipCode?: string
  lat: number
  lng: number
}

export function AddressAutocomplete({
  value,
  onSelect,
  placeholder = 'Digite um endereço...'
}: {
  value?: string
  onSelect: (s: AddressSuggestion) => void
  placeholder?: string
}) {
  const [query, setQuery] = useState(value || '')
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [items, setItems] = useState<AddressSuggestion[]>([])
  const abortRef = useRef<AbortController | null>(null)

  // Debounce
  useEffect(() => {
    if (!query || query.length < 3) {
      setItems([])
      setOpen(false)
      return
    }
    setLoading(true)
    const ac = new AbortController()
    abortRef.current?.abort()
    abortRef.current = ac
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/addresses/search?q=${encodeURIComponent(query)}&country=br`, { signal: ac.signal })
        if (!res.ok) throw new Error('Falha na busca')
        const data = await res.json()
        const results = Array.isArray(data.results) ? data.results : []
        setItems(results)
        setOpen(results.length > 0)
      } catch (e) {
        if ((e as any).name !== 'AbortError') {
          setItems([])
          setOpen(false)
        }
      } finally {
        setLoading(false)
      }
    }, 250)
    return () => {
      clearTimeout(t)
      ac.abort()
    }
  }, [query])

  const onPick = (s: AddressSuggestion) => {
    onSelect(s)
    setQuery(s.label)
    setOpen(false)
  }

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setOpen(items.length > 0)}
      />
      {open && (
        <div className={cn("absolute z-20 mt-1 w-full rounded-md border bg-white shadow", loading && 'opacity-80')}
             role="listbox">
          <ul className="max-h-60 overflow-auto text-sm">
            {items.map((s, idx) => (
              <li key={idx}
                  className="cursor-pointer px-3 py-2 hover:bg-gray-100"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onPick(s)}
                  role="option">
                {s.label}
              </li>
            ))}
            {(!loading && items.length === 0) && (
              <li className="px-3 py-2 text-gray-500">Nenhum resultado</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}

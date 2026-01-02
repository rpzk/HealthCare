'use client'

import React from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, X } from 'lucide-react'

export interface FilterOption {
  label: string
  value: string
}

export interface FilterConfig {
  name: string
  label: string
  options: FilterOption[]
  defaultValue?: string
}

interface SearchFilterProps {
  searchTerm: string
  onSearchChange: (term: string) => void
  filters?: FilterConfig[]
  filterValues?: Record<string, string>
  onFilterChange?: (name: string, value: string) => void
  onApply?: () => void
  onClear?: () => void
  loading?: boolean
  placeholder?: string
}

/**
 * Componente unificado para busca e filtros
 * Padrão para todas as páginas de listing
 * 
 * @example
 * <SearchFilter
 *   searchTerm={searchTerm}
 *   onSearchChange={setSearchTerm}
 *   filters={[
 *     { name: 'status', label: 'Status', options: [...] },
 *     { name: 'urgency', label: 'Urgência', options: [...] }
 *   ]}
 *   filterValues={{ status: 'ALL', urgency: 'ALL' }}
 *   onFilterChange={handleFilterChange}
 *   onApply={() => {}}
 *   onClear={() => {}}
 * />
 */
export function SearchFilter({
  searchTerm,
  onSearchChange,
  filters = [],
  filterValues = {},
  onFilterChange,
  onApply,
  onClear,
  loading = false,
  placeholder = 'Buscar...'
}: SearchFilterProps) {
  const hasActiveFilters = 
    searchTerm.trim() !== '' ||
    Object.values(filterValues).some(v => v && v !== 'ALL')

  return (
    <div className="space-y-4 p-4 bg-card border rounded-lg">
      {/* Search Input */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-10"
            disabled={loading}
          />
        </div>
        {hasActiveFilters && onClear && (
          <Button
            variant="outline"
            size="sm"
            onClick={onClear}
            disabled={loading}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      {/* Filters */}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {filters.map((filter) => (
            <div key={filter.name} className="flex items-center gap-2">
              <label className="text-sm font-medium text-muted-foreground">
                {filter.label}:
              </label>
              <Select
                value={filterValues[filter.name] || filter.defaultValue || 'ALL'}
                onValueChange={(value) => onFilterChange?.(filter.name, value)}
                disabled={loading}
              >
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {filter.options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      )}

      {/* Apply Button (optional) */}
      {onApply && filters.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={onApply}
            disabled={loading}
            size="sm"
          >
            Aplicar Filtros
          </Button>
        </div>
      )}
    </div>
  )
}

"use client"

import * as React from 'react'
import { cn } from '@/lib/utils'

type TabsContextType = {
  value: string
  setValue: (v: string) => void
}

const TabsContext = React.createContext<TabsContextType | null>(null)

interface TabsProps {
  value?: string
  defaultValue?: string
  onValueChange?: (v: string) => void
  className?: string
  children: React.ReactNode
}

export function Tabs({ value: controlledValue, defaultValue, onValueChange, className, children }: TabsProps) {
  const [internalValue, setInternalValue] = React.useState(defaultValue || '')
  
  const value = controlledValue !== undefined ? controlledValue : internalValue
  const setValue = React.useCallback((v: string) => {
    if (controlledValue === undefined) {
      setInternalValue(v)
    }
    onValueChange?.(v)
  }, [controlledValue, onValueChange])

  return (
    <TabsContext.Provider value={{ value, setValue }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn('inline-flex items-center gap-2 border-b', className)}>{children}</div>
}

export function TabsTrigger({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)!
  const active = ctx.value === value
  return (
    <button
      type="button"
      onClick={() => ctx.setValue(value)}
      className={cn(
        'px-3 py-2 text-sm font-medium rounded-t border-b-2 -mb-[2px]',
        active ? 'border-[#40e0d0] text-[#40e0d0]' : 'border-transparent text-gray-600 hover:text-gray-900'
      )}
      aria-selected={active}
      role="tab"
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, className, children }: { value: string; className?: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)!
  if (ctx.value !== value) return null
  return <div className={cn(className)} role="tabpanel">{children}</div>
}

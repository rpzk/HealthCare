'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { useSidebar } from '@/hooks/use-sidebar'

interface MainContentProps {
  children: ReactNode
  className?: string
}

export function MainContent({ children, className }: MainContentProps) {
  const { isCollapsed } = useSidebar()

  return (
    <main 
      className={cn(
        'flex-1 p-6 transition-all duration-300',
        isCollapsed ? 'ml-16' : 'ml-56',
        className
      )}
    >
      {children}
    </main>
  )
}

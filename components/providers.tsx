'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ReactNode, useState } from 'react'
import { SessionProvider } from 'next-auth/react'
import { ThemeProvider } from '@/components/theme-provider'
import { SidebarProvider } from '@/hooks/use-sidebar'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
      },
    },
  }))

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SidebarProvider>
            {children}
          </SidebarProvider>
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  )
}

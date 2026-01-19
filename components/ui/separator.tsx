"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// Props used by both Radix and fallback separator
type SeparatorProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}

// Try to use Radix separator when available; otherwise provide a minimal fallback
let Separator: any

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const SeparatorPrimitive = require('@radix-ui/react-separator')
  Separator = React.forwardRef<
    React.ElementRef<typeof SeparatorPrimitive.Root>,
    React.ComponentPropsWithoutRef<typeof SeparatorPrimitive.Root>
  >(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
    <SeparatorPrimitive.Root
      ref={ref}
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
        className
      )}
      {...props}
    />
  ))
  Separator.displayName = SeparatorPrimitive.Root.displayName
} catch (e) {
  // Fallback simple separator when Radix is not installed or types are missing
  Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(
    ({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (
      <div
        ref={ref}
        role="separator"
        aria-orientation={orientation}
        className={cn(
          'shrink-0 bg-border',
          orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
          className
        )}
        {...props}
      />
    )
  )
  Separator.displayName = 'SeparatorFallback'
}

export { Separator }
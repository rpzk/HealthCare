"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

// Props used by both Radix and fallback separator
type SeparatorProps = React.HTMLAttributes<HTMLDivElement> & {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}

// Try to use Radix separator when available; otherwise provide a minimal fallback
let Separator: React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLDivElement> & React.RefAttributes<HTMLDivElement>
>

try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const SeparatorPrimitive = require('@radix-ui/react-separator')
  // Create a small named component and forward its ref - keeps JSX parsing simple
  const RadixSeparatorImpl = (props: SeparatorProps, ref: React.ForwardedRef<HTMLDivElement>) => {
    const { className, orientation = 'horizontal', decorative = true, ...rest } = props
    return (
      <SeparatorPrimitive.Root
        ref={ref}
        decorative={decorative}
        orientation={orientation}
        className={cn(
          'shrink-0 bg-border',
          orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
          className
        )}
        {...rest}
      />
    )
  }

  Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(RadixSeparatorImpl)
  Separator.displayName = SeparatorPrimitive.Root.displayName || 'RadixSeparator'
} catch (e) {
  // Fallback simple separator when Radix is not installed or types are missing
    const SeparatorFallback = ( { className, orientation = 'horizontal', decorative = true, ...props }: SeparatorProps, ref: React.ForwardedRef<HTMLDivElement>) => {
      return (
        <div
          ref={ref}
        role="separator"
        aria-orientation={orientation}
        aria-hidden={decorative}
        className={cn(
          'shrink-0 bg-border',
          orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
          className
        )}
        {...props}
        />
      )
    }
    Separator = React.forwardRef<HTMLDivElement, SeparatorProps>(SeparatorFallback)
  Separator.displayName = 'SeparatorFallback'
}

export { Separator }
'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Home, ArrowLeft } from 'lucide-react'

interface PageHeaderProps {
  title: string
  description?: string
  breadcrumbs?: Array<{
    label: string
    href?: string
  }>
  showBackButton?: boolean
  showHomeButton?: boolean
  actions?: React.ReactNode
  icon?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  breadcrumbs = [],
  showBackButton = true,
  showHomeButton = true,
  actions,
  icon
}: PageHeaderProps) {
  const router = useRouter()

  const handleBack = () => {
    router.back()
  }

  const handleHome = () => {
    router.push('/')
  }

  return (
    <div className="space-y-4 bg-gradient-to-r from-background to-muted/20 p-6 -mx-6 -mt-6 mb-6 border-b border-border/50">
      {/* Breadcrumb Navigation */}
      {breadcrumbs.length > 0 && (
        <Breadcrumb>
          <BreadcrumbList>
            {showHomeButton && (
              <>
                <BreadcrumbItem>
                  <BreadcrumbLink 
                    href="/" 
                    className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                    onClick={(e) => {
                      e.preventDefault()
                      handleHome()
                    }}
                  >
                    <Home className="h-4 w-4" />
                    Início
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
              </>
            )}
            {breadcrumbs.map((crumb, index) => (
              <div key={index} className="flex items-center">
                {index > 0 && <BreadcrumbSeparator />}
                <BreadcrumbItem>
                  {crumb.href ? (
                    <BreadcrumbLink 
                      href={crumb.href}
                      onClick={(e) => {
                        e.preventDefault()
                        router.push(crumb.href!)
                      }}
                      className="text-muted-foreground hover:text-primary transition-colors"
                    >
                      {crumb.label}
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage className="font-medium text-foreground">{crumb.label}</BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </div>
            ))}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      {/* Header Content */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
          {/* Back Button */}
          {showBackButton && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-8 w-8 -ml-2 text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          )}
          
          {/* Home Button */}
          {showHomeButton && !showBackButton && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleHome}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Início
            </Button>
          )}

          {/* Title and Description */}
          <div className="flex items-center gap-3">
            {icon}
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
              {description && (
                <p className="text-gray-600 mt-1">{description}</p>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        {actions && (
          <div className="flex items-center gap-2">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}

import { Card, CardContent } from '@/components/ui/card'
import { HeartPulse, AlertCircle } from 'lucide-react'

interface AuthCardProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
  variant?: 'default' | 'error'
}

export function AuthCard({ title, description, children, className = '', variant = 'default' }: AuthCardProps) {
  const isError = variant === 'error'
  return (
    <Card className={`w-full max-w-md p-6 sm:p-8 space-y-6 shadow-sm ${className}`}>
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className={`p-3 rounded-full ${isError ? 'bg-destructive text-destructive-foreground' : 'bg-primary text-primary-foreground'}`}>
            {isError ? <AlertCircle className="w-8 h-8" /> : <HeartPulse className="w-8 h-8" />}
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {description && (
            <p className="text-muted-foreground mt-1">{description}</p>
          )}
        </div>
      </div>
      <CardContent className="p-0">
        {children}
      </CardContent>
    </Card>
  )
}

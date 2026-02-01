'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { 
  Shield, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldOff,
  Lock,
  Unlock,
  LogOut,
  Timer,
  ChevronDown,
  Key,
} from 'lucide-react'
import { toast } from 'sonner'

interface CertificateSessionState {
  hasCertificate: boolean
  certificate?: {
    subject: string
    issuer: string
    validUntil: string
    lastUsedAt?: string
    usageCount: number
    isExpired: boolean
  }
  session: {
    active: boolean
    locked: boolean
    createdAt?: string
    expiresAt?: string
    lastActivity?: string
    remainingTime?: number
    remainingTimeFormatted?: string
  }
  config?: {
    maxSessionDuration: number
    defaultSessionDuration: number
    inactivityTimeout: number
  }
}

export function CertificateSessionIndicator() {
  const [state, setState] = useState<CertificateSessionState | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [password, setPassword] = useState('')
  const [dialogMode, setDialogMode] = useState<'start' | 'unlock'>('start')
  const [submitting, setSubmitting] = useState(false)

  // Buscar status da sessão
  const fetchSessionStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/certificate-session')
      if (res.ok) {
        const data = await res.json()
        setState(data)
      }
    } catch (error) {
      console.error('Erro ao buscar status da sessão:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  // Atualizar a cada 30 segundos
  useEffect(() => {
    fetchSessionStatus()
    const interval = setInterval(fetchSessionStatus, 30000)
    return () => clearInterval(interval)
  }, [fetchSessionStatus])

  // Iniciar sessão
  const handleStartSession = async () => {
    if (!password) {
      toast.error('Digite a senha do certificado')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/certificate-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Certificado ativado', {
          description: `Sessão válida até ${new Date(data.expiresAt).toLocaleTimeString('pt-BR')}`,
        })
        setShowPasswordDialog(false)
        setPassword('')
        fetchSessionStatus()
      } else {
        toast.error(data.error || 'Erro ao ativar certificado')
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setSubmitting(false)
    }
  }

  // Desbloquear sessão
  const handleUnlockSession = async () => {
    if (!password) {
      toast.error('Digite a senha do certificado')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/certificate-session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unlock', password }),
      })

      const data = await res.json()

      if (res.ok) {
        toast.success('Certificado desbloqueado')
        setShowPasswordDialog(false)
        setPassword('')
        fetchSessionStatus()
      } else {
        toast.error(data.error || 'Erro ao desbloquear')
      }
    } catch (error) {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setSubmitting(false)
    }
  }

  // Bloquear sessão
  const handleLockSession = async () => {
    try {
      const res = await fetch('/api/certificate-session', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'lock' }),
      })

      if (res.ok) {
        toast.success('Certificado bloqueado', {
          description: 'Digite a senha para desbloquear',
        })
        fetchSessionStatus()
      }
    } catch (error) {
      toast.error('Erro ao bloquear certificado')
    }
  }

  // Encerrar sessão
  const handleEndSession = async () => {
    try {
      const res = await fetch('/api/certificate-session', {
        method: 'DELETE',
      })

      if (res.ok) {
        toast.success('Sessão encerrada')
        fetchSessionStatus()
      }
    } catch (error) {
      toast.error('Erro ao encerrar sessão')
    }
  }

  // Abrir diálogo
  const openDialog = (mode: 'start' | 'unlock') => {
    setDialogMode(mode)
    setPassword('')
    setShowPasswordDialog(true)
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50">
        <Shield className="h-4 w-4 animate-pulse" />
        <span className="text-sm text-muted-foreground">Verificando...</span>
      </div>
    )
  }

  if (!state?.hasCertificate) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/50 text-muted-foreground">
              <ShieldOff className="h-4 w-4" />
              <span className="text-sm">Sem certificado</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Configure seu certificado A1 nas configurações</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  const { session, certificate } = state

  // Certificado expirado
  if (certificate?.isExpired) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-destructive/10 text-destructive">
              <ShieldAlert className="h-4 w-4" />
              <span className="text-sm">Certificado expirado</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <p>Seu certificado expirou em {new Date(certificate.validUntil).toLocaleDateString('pt-BR')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Sessão ativa
  if (session.active && !session.locked) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="gap-2 h-9 px-3 bg-green-500/10 hover:bg-green-500/20">
              <ShieldCheck className="h-4 w-4 text-green-600" />
              <span className="text-sm text-green-700 dark:text-green-400">
                Assinatura ativa
              </span>
              <Badge variant="outline" className="ml-1 text-xs bg-green-100 text-green-700 border-green-300">
                <Timer className="h-3 w-3 mr-1" />
                {session.remainingTimeFormatted}
              </Badge>
              <ChevronDown className="h-3 w-3 text-green-600" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="px-2 py-1.5 text-sm font-medium">
              {extractName(certificate?.subject)}
            </div>
            <div className="px-2 py-1 text-xs text-muted-foreground">
              {certificate?.issuer?.split(',')[3]?.replace('CN=', '') || certificate?.issuer}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLockSession}>
              <Lock className="h-4 w-4 mr-2" />
              Bloquear certificado
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleEndSession} className="text-destructive">
              <LogOut className="h-4 w-4 mr-2" />
              Encerrar sessão
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </>
    )
  }

  // Sessão bloqueada
  if (session.active && session.locked) {
    return (
      <>
        <Button 
          variant="ghost" 
          className="gap-2 h-9 px-3 bg-yellow-500/10 hover:bg-yellow-500/20"
          onClick={() => openDialog('unlock')}
        >
          <ShieldAlert className="h-4 w-4 text-yellow-600" />
          <span className="text-sm text-yellow-700 dark:text-yellow-400">
            Bloqueado
          </span>
          <Unlock className="h-4 w-4 text-yellow-600" />
        </Button>

        <PasswordDialog
          open={showPasswordDialog}
          onOpenChange={setShowPasswordDialog}
          mode={dialogMode}
          password={password}
          onPasswordChange={setPassword}
          onSubmit={dialogMode === 'start' ? handleStartSession : handleUnlockSession}
          submitting={submitting}
          certificate={certificate}
        />
      </>
    )
  }

  // Sem sessão ativa
  return (
    <>
      <Button 
        variant="ghost" 
        className="gap-2 h-9 px-3 bg-muted hover:bg-muted/80"
        onClick={() => openDialog('start')}
      >
        <Shield className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm">Ativar certificado</span>
        <Key className="h-4 w-4 text-muted-foreground" />
      </Button>

      <PasswordDialog
        open={showPasswordDialog}
        onOpenChange={setShowPasswordDialog}
        mode={dialogMode}
        password={password}
        onPasswordChange={setPassword}
        onSubmit={dialogMode === 'start' ? handleStartSession : handleUnlockSession}
        submitting={submitting}
        certificate={certificate}
      />
    </>
  )
}

// Componente do diálogo de senha
function PasswordDialog({
  open,
  onOpenChange,
  mode,
  password,
  onPasswordChange,
  onSubmit,
  submitting,
  certificate,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'start' | 'unlock'
  password: string
  onPasswordChange: (value: string) => void
  onSubmit: () => void
  submitting: boolean
  certificate?: CertificateSessionState['certificate']
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {mode === 'start' ? 'Ativar Certificado Digital' : 'Desbloquear Certificado'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'start' 
              ? 'Digite a senha do seu certificado A1 para ativar a assinatura digital. A sessão ficará ativa por 4 horas.'
              : 'Digite a senha para desbloquear seu certificado e continuar assinando documentos.'}
          </DialogDescription>
        </DialogHeader>
        
        {certificate && (
          <div className="bg-muted/50 rounded-md p-3 text-sm">
            <div className="font-medium">{extractName(certificate.subject)}</div>
            <div className="text-xs text-muted-foreground mt-1">
              {certificate.issuer?.split(',')[3]?.replace('CN=', '') || 'ICP-Brasil'}
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="cert-password">Senha do certificado</Label>
          <Input
            id="cert-password"
            type="password"
            placeholder="Digite a senha do seu certificado A1"
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSubmit} disabled={submitting || !password}>
            {submitting ? 'Verificando...' : mode === 'start' ? 'Ativar' : 'Desbloquear'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Extrair nome do subject do certificado
function extractName(subject?: string): string {
  if (!subject) return 'Certificado Digital'
  
  // Procurar CN=NOME:CPF ou apenas CN=NOME
  const cnMatch = subject.match(/CN=([^:,]+)/)
  return cnMatch?.[1] || subject.split(',')[0] || 'Certificado Digital'
}

export default CertificateSessionIndicator

'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { FileSignature, Loader2, CheckCircle2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { toastApiError } from '@/lib/toast-api-error'
import { logger } from '@/lib/logger'

interface A1SignButtonProps {
  certificateId: string
  onSuccess?: () => void
}

export function A1SignButton({ certificateId, onSuccess }: A1SignButtonProps) {
  const [loading, setLoading] = useState(false)
  const [signed, setSigned] = useState(false)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)
  const [password, setPassword] = useState('')
  const { toast } = useToast()

  const signDocument = async (withPassword?: string) => {
    try {
      setLoading(true)

      const body = withPassword ? { password: withPassword } : {}
      const response = await fetch(`/api/certificates/${certificateId}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        toastApiError(data, 'Erro ao assinar')
        return false
      }

      setSigned(true)
      setShowPasswordDialog(false)
      setPassword('')

      toast({
        title: 'Assinado com sucesso! ✅',
        description: 'Atestado assinado com certificado ICP-Brasil',
      })

      if (onSuccess) {
        onSuccess()
      }

      return true
    } catch (error) {
      logger.error('Erro ao assinar:', error)
      toast({
        title: 'Erro ao assinar',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      })
      return false
    } finally {
      setLoading(false)
    }
  }

  const handleClick = async () => {
    setLoading(true)
    try {
      // Check if certificate session is active — if so, sign without password
      const sessionRes = await fetch('/api/certificate-session')
      if (sessionRes.ok) {
        const sessionData = await sessionRes.json()
        if (sessionData?.session?.active && !sessionData?.session?.locked) {
          await signDocument()
          return
        }
      }
    } catch {
      // Session check failed — fall through to password dialog
    } finally {
      setLoading(false)
    }

    // No active session: ask for password
    setShowPasswordDialog(true)
  }

  const handleSignWithPassword = async () => {
    if (!password) {
      toast({
        title: 'Senha necessária',
        description: 'Digite a senha do seu certificado A1',
        variant: 'destructive',
      })
      return
    }
    await signDocument(password)
  }

  if (signed) {
    return (
      <Button disabled className="w-full bg-green-600">
        <CheckCircle2 className="mr-2 h-4 w-4" />
        Assinado com ICP-Brasil
      </Button>
    )
  }

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Verificando sessão...
          </>
        ) : (
          <>
            <FileSignature className="mr-2 h-4 w-4" />
            Assinar com Certificado A1
          </>
        )}
      </Button>

      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar Assinatura</DialogTitle>
            <DialogDescription>
              Digite a senha do seu certificado A1 para assinar este documento
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-4">
            <div>
              <Label htmlFor="cert-password">Senha do Certificado</Label>
              <Input
                id="cert-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && password) {
                    handleSignWithPassword()
                  }
                }}
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setShowPasswordDialog(false)
                  setPassword('')
                }}
                variant="outline"
                className="flex-1"
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSignWithPassword}
                disabled={loading || !password}
                className="flex-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Assinando...
                  </>
                ) : (
                  'Assinar'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

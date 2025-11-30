'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { 
  UserPlus, 
  Mail, 
  ClipboardList, 
  ArrowRight,
  CheckCircle,
  Loader2,
  Send
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface NewPatientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 'choose' | 'invite' | 'success'

export function NewPatientDialog({ open, onOpenChange }: NewPatientDialogProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [step, setStep] = useState<Step>('choose')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState('')

  const userRole = session?.user?.role

  // Profissionais podem convidar pacientes
  const canInvite = ['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST'].includes(userRole || '')

  const handleManualRegister = () => {
    onOpenChange(false)
    router.push('/patients/new')
  }

  const handleSendInvite = async () => {
    if (!email) {
      toast({ title: 'Erro', description: 'Informe o email do paciente', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/invites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          role: 'PATIENT'
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar convite')
      }

      setInviteLink(data.inviteUrl || `${window.location.origin}/register?token=${data.token}`)
      setStep('success')
      toast({ title: 'Sucesso', description: 'Convite criado com sucesso!' })
    } catch (error) {
      toast({ title: 'Erro', description: error instanceof Error ? error.message : 'Erro ao enviar convite', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink)
    toast({ title: 'Link copiado!' })
  }

  const handleClose = () => {
    setStep('choose')
    setEmail('')
    setInviteLink('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {step === 'choose' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-blue-600" />
                Novo Paciente
              </DialogTitle>
              <DialogDescription>
                Como você deseja adicionar o paciente?
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              {/* Opção 1: Cadastro Manual */}
              <button
                onClick={handleManualRegister}
                className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="p-3 rounded-full bg-blue-100 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <ClipboardList className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">Cadastro Manual</h3>
                  <p className="text-sm text-gray-500">
                    Preencher os dados do paciente agora
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-blue-600 transition-colors" />
              </button>

              {/* Opção 2: Enviar Convite */}
              {canInvite && (
                <button
                  onClick={() => setStep('invite')}
                  className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                >
                  <div className="p-3 rounded-full bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Enviar Convite</h3>
                    <p className="text-sm text-gray-500">
                      O paciente se cadastra pelo link
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </button>
              )}
            </div>
          </>
        )}

        {step === 'invite' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-600" />
                Convidar Paciente
              </DialogTitle>
              <DialogDescription>
                Digite o email do paciente para enviar o convite de cadastro
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email do Paciente</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="paciente@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep('choose')}
                  className="flex-1"
                >
                  Voltar
                </Button>
                <Button
                  onClick={handleSendInvite}
                  disabled={loading || !email}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar Convite
                </Button>
              </div>
            </div>
          </>
        )}

        {step === 'success' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-5 w-5" />
                Convite Enviado!
              </DialogTitle>
              <DialogDescription>
                O link de convite foi gerado com sucesso
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-800 mb-2">
                  <strong>Envie este link para o paciente:</strong>
                </p>
                <div className="flex gap-2">
                  <Input
                    value={inviteLink}
                    readOnly
                    className="text-xs bg-white"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCopyLink}
                  >
                    Copiar
                  </Button>
                </div>
              </div>

              <p className="text-sm text-gray-500 text-center">
                O paciente terá 7 dias para se cadastrar usando este link.
              </p>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setStep('invite')
                    setEmail('')
                    setInviteLink('')
                  }}
                  className="flex-1"
                >
                  Convidar Outro
                </Button>
                <Button
                  onClick={handleClose}
                  className="flex-1"
                >
                  Concluir
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

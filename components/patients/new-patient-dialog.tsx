'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useActiveRole } from '@/hooks/use-active-role'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { 
  UserPlus, 
  Mail, 
  ClipboardList, 
  ArrowRight,
} from 'lucide-react'

interface NewPatientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Step = 'choose'

export function NewPatientDialog({ open, onOpenChange }: NewPatientDialogProps) {
  const router = useRouter()
  const { activeRole, sessionRole } = useActiveRole()
  const [step, setStep] = useState<Step>('choose')

  const userRole = activeRole || sessionRole
  // Profissionais (qualquer papel que não seja PATIENT) podem convidar pacientes
  const canInvite = !!userRole && userRole !== 'PATIENT'

  const handleManualRegister = () => {
    onOpenChange(false)
    router.push('/patients/new')
  }

  const handleInvite = () => {
    onOpenChange(false)
    router.push('/patients/invite')
  }

  const handleClose = () => {
    setStep('choose')
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
                  onClick={handleInvite}
                  className="flex items-center gap-4 p-4 rounded-lg border-2 border-gray-200 hover:border-green-500 hover:bg-green-50 transition-all text-left group"
                >
                  <div className="p-3 rounded-full bg-green-100 text-green-600 group-hover:bg-green-600 group-hover:text-white transition-colors">
                    <Mail className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">Enviar Convite</h3>
                    <p className="text-sm text-gray-500">
                      Gerar link para o paciente se cadastrar
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-green-600 transition-colors" />
                </button>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Users, 
  Calendar, 
  FileText, 
  Brain,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { NewPatientDialog } from '@/components/patients/new-patient-dialog'

interface QuickAction {
  id: string
  icon: React.ElementType
  label: string
  color: string
  onClick: () => void
}

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false)
  const [newPatientOpen, setNewPatientOpen] = useState(false)
  const router = useRouter()

  const actions: QuickAction[] = [
    {
      id: 'patient',
      icon: Users,
      label: 'Novo Paciente',
      color: 'bg-blue-500 hover:bg-blue-600',
      onClick: () => {
        setIsOpen(false)
        setNewPatientOpen(true)
      }
    },
    {
      id: 'appointment',
      icon: Calendar,
      label: 'Agendar Consulta',
      color: 'bg-green-500 hover:bg-green-600',
      onClick: () => {
        setIsOpen(false)
        router.push('/consultations/new')
      }
    },
    {
      id: 'record',
      icon: FileText,
      label: 'Novo Prontuário',
      color: 'bg-purple-500 hover:bg-purple-600',
      onClick: () => {
        setIsOpen(false)
        router.push('/records/new')
      }
    },
    {
      id: 'ai',
      icon: Brain,
      label: 'IA Médica',
      color: 'bg-indigo-500 hover:bg-indigo-600',
      onClick: () => {
        setIsOpen(false)
        router.push('/ai-medical')
      }
    },
  ]

  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* FAB Container */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col-reverse items-end gap-3">
        {/* Action buttons */}
        {isOpen && actions.map((action, index) => (
          <div
            key={action.id}
            className="flex items-center gap-3 animate-in slide-in-from-bottom-2 fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <span className="bg-background shadow-lg rounded-lg px-3 py-1.5 text-sm font-medium whitespace-nowrap">
              {action.label}
            </span>
            <Button
              size="icon"
              className={cn(
                'h-12 w-12 rounded-full shadow-lg',
                action.color
              )}
              onClick={action.onClick}
            >
              <action.icon className="h-5 w-5 text-white" />
            </Button>
          </div>
        ))}

        {/* Main FAB */}
        <Button
          size="icon"
          className={cn(
            'h-14 w-14 rounded-full shadow-xl transition-all duration-200',
            isOpen 
              ? 'bg-red-500 hover:bg-red-600 rotate-45' 
              : 'bg-primary hover:bg-primary/90'
          )}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-6 w-6 text-white" />
          ) : (
            <Plus className="h-6 w-6 text-white" />
          )}
        </Button>
      </div>

      {/* New Patient Dialog */}
      <NewPatientDialog open={newPatientOpen} onOpenChange={setNewPatientOpen} />
    </>
  )
}

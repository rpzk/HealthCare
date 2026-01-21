'use client'

import React from 'react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { logger } from '@/lib/logger'

export type ConfirmationType = 'danger' | 'warning' | 'info'

interface ConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void | Promise<void>
  onCancel?: () => void
  type?: ConfirmationType
  isLoading?: boolean
}

const typeConfig: Record<ConfirmationType, { icon: React.ReactNode; color: string }> = {
  danger: {
    icon: <AlertTriangle className="h-6 w-6 text-red-600" />,
    color: 'text-red-600',
  },
  warning: {
    icon: <AlertCircle className="h-6 w-6 text-yellow-600" />,
    color: 'text-yellow-600',
  },
  info: {
    icon: <Info className="h-6 w-6 text-blue-600" />,
    color: 'text-blue-600',
  },
}

/**
 * Componente de diálogo de confirmação reutilizável
 * Para ações críticas (deletar, cancelar, anular)
 * 
 * @example
 * <ConfirmationDialog
 *   open={openDelete}
 *   onOpenChange={setOpenDelete}
 *   title="Deletar prescrição?"
 *   description="Esta ação não pode ser desfeita. A prescrição será permanentemente deletada."
 *   type="danger"
 *   onConfirm={handleDelete}
 * />
 */
export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'warning',
  isLoading = false,
}: ConfirmationDialogProps) {
  const config = typeConfig[type]

  const handleConfirm = async () => {
    try {
      await onConfirm()
      onOpenChange(false)
    } catch (error) {
      logger.error('Erro na confirmação:', error)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            {config.icon}
            <AlertDialogTitle>{title}</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="mt-4">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel} disabled={isLoading}>
            {cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isLoading}
            className={type === 'danger' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {isLoading ? 'Processando...' : confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

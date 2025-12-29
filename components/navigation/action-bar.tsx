'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ArrowLeft, MoreVertical, Edit2, Copy, Download, Trash2, Print, CheckCircle, XCircle } from 'lucide-react'

export interface ActionItem {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  variant?: 'default' | 'destructive' | 'secondary'
  requiresConfirm?: boolean
}

interface ActionBarProps {
  title?: string
  backUrl?: string
  canEdit?: boolean
  onEdit?: () => void
  canDelete?: boolean
  onDelete?: () => void
  canDuplicate?: boolean
  onDuplicate?: () => void
  canPrint?: boolean
  onPrint?: () => void
  canDownload?: boolean
  onDownload?: () => void
  canSign?: boolean
  onSign?: () => void
  canCancel?: boolean
  onCancel?: () => void
  additionalActions?: ActionItem[]
  isLoading?: boolean
}

/**
 * Componente ActionBar para páginas de detalhe
 * Fornece navegação "Voltar" e ações contextuais
 * 
 * @example
 * <ActionBar
 *   title="Prescrição #123"
 *   backUrl="/prescriptions"
 *   canEdit={canEdit}
 *   onEdit={handleEdit}
 *   canDelete={canDelete}
 *   onDelete={handleDelete}
 *   canSign={true}
 *   onSign={handleSign}
 * />
 */
export function ActionBar({
  title,
  backUrl,
  canEdit = false,
  onEdit,
  canDelete = false,
  onDelete,
  canDuplicate = false,
  onDuplicate,
  canPrint = false,
  onPrint,
  canDownload = false,
  onDownload,
  canSign = false,
  onSign,
  canCancel = false,
  onCancel,
  additionalActions = [],
  isLoading = false,
}: ActionBarProps) {
  const router = useRouter()

  // Coletar ações disponíveis
  const primaryActions: Array<{ label: string; icon: React.ReactNode; onClick: () => void; variant?: string }> = []
  const secondaryActions: ActionItem[] = []

  if (canSign && onSign) {
    primaryActions.push({
      label: 'Assinar',
      icon: <CheckCircle className="h-4 w-4" />,
      onClick: onSign,
    })
  }

  if (canEdit && onEdit) {
    primaryActions.push({
      label: 'Editar',
      icon: <Edit2 className="h-4 w-4" />,
      onClick: onEdit,
    })
  }

  if (canPrint && onPrint) {
    secondaryActions.push({
      label: 'Imprimir',
      icon: <Print className="h-4 w-4" />,
      onClick: onPrint,
    })
  }

  if (canDownload && onDownload) {
    secondaryActions.push({
      label: 'Baixar',
      icon: <Download className="h-4 w-4" />,
      onClick: onDownload,
    })
  }

  if (canDuplicate && onDuplicate) {
    secondaryActions.push({
      label: 'Duplicar',
      icon: <Copy className="h-4 w-4" />,
      onClick: onDuplicate,
    })
  }

  if (canCancel && onCancel) {
    secondaryActions.push({
      label: 'Cancelar',
      icon: <XCircle className="h-4 w-4" />,
      onClick: onCancel,
      requiresConfirm: true,
    })
  }

  if (canDelete && onDelete) {
    secondaryActions.push({
      label: 'Deletar',
      icon: <Trash2 className="h-4 w-4" />,
      onClick: onDelete,
      variant: 'destructive',
      requiresConfirm: true,
    })
  }

  const allActions = [...secondaryActions, ...additionalActions]

  return (
    <div className="flex items-center justify-between gap-4 mb-6 p-4 bg-card border rounded-lg">
      {/* Left: Back Button + Title */}
      <div className="flex items-center gap-4 flex-1">
        {backUrl && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(backUrl)}
            disabled={isLoading}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Button>
        )}
        {title && (
          <h1 className="text-xl font-semibold">{title}</h1>
        )}
      </div>

      {/* Right: Primary Actions + Menu */}
      <div className="flex items-center gap-2">
        {/* Primary Actions (Sign, Edit) */}
        {primaryActions.map((action) => (
          <Button
            key={action.label}
            onClick={action.onClick}
            disabled={isLoading}
            className="gap-2"
          >
            {action.icon}
            {action.label}
          </Button>
        ))}

        {/* Secondary Actions Menu */}
        {allActions.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={isLoading}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {allActions.map((action) => (
                <DropdownMenuItem
                  key={action.label}
                  onClick={action.onClick}
                  className={action.variant === 'destructive' ? 'text-red-600' : ''}
                >
                  {action.icon}
                  <span className="ml-2">{action.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  )
}

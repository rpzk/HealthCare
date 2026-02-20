'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  ChevronDown,
  Trash2,
  Download,
  Archive,
  Tag,
  Share,
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  FileText
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

// ============ TYPES ============

export interface BulkItem {
  id: string
  label: string
  type?: string
  status?: string
}

export interface BulkOperation {
  id: string
  label: string
  icon: React.ElementType
  description?: string
  variant?: 'default' | 'destructive'
  confirmTitle?: string
  confirmDescription?: string
  requiresConfirmation?: boolean
}

export interface BulkOperationResult {
  success: boolean
  itemId: string
  message?: string
}

interface BulkActionsProps {
  items: BulkItem[]
  selectedIds: string[]
  onSelectionChange: (ids: string[]) => void
  onBulkAction: (operation: string, ids: string[]) => Promise<BulkOperationResult[]>
  operations?: BulkOperation[]
  className?: string
}

// ============ DEFAULT OPERATIONS ============

const DEFAULT_OPERATIONS: BulkOperation[] = [
  {
    id: 'export',
    label: 'Exportar PDF',
    icon: Download,
    description: 'Gerar PDF dos itens selecionados'
  },
  {
    id: 'archive',
    label: 'Arquivar',
    icon: Archive,
    description: 'Mover para arquivados'
  },
  {
    id: 'tag',
    label: 'Adicionar Tag',
    icon: Tag,
    description: 'Aplicar etiqueta aos itens'
  },
  {
    id: 'share',
    label: 'Compartilhar',
    icon: Share,
    description: 'Compartilhar acesso'
  },
  {
    id: 'delete',
    label: 'Excluir',
    icon: Trash2,
    variant: 'destructive',
    requiresConfirmation: true,
    confirmTitle: 'Excluir itens selecionados?',
    confirmDescription: 'Esta ação não pode ser desfeita. Os itens serão permanentemente removidos.'
  }
]

// ============ SELECTION TOOLBAR ============

export function BulkSelectionToolbar({
  totalCount,
  selectedCount,
  onSelectAll,
  onDeselectAll,
  isAllSelected,
  operations = DEFAULT_OPERATIONS,
  onOperation,
  isProcessing
}: {
  totalCount: number
  selectedCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  isAllSelected: boolean
  operations?: BulkOperation[]
  onOperation: (operationId: string) => void
  isProcessing: boolean
}) {
  if (selectedCount === 0) return null

  return (
    <div className="flex items-center gap-4 p-3 bg-primary/5 rounded-lg border border-primary/20 animate-in slide-in-from-top-2">
      <div className="flex items-center gap-2">
        <Checkbox
          checked={isAllSelected}
          onCheckedChange={(checked) => checked ? onSelectAll() : onDeselectAll()}
        />
        <span className="text-sm font-medium">
          {selectedCount} de {totalCount} selecionado{selectedCount > 1 ? 's' : ''}
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2">
        {operations.slice(0, 3).map((op) => (
          <Button
            key={op.id}
            variant={op.variant === 'destructive' ? 'destructive' : 'outline'}
            size="sm"
            onClick={() => onOperation(op.id)}
            disabled={isProcessing}
          >
            <op.icon className="h-4 w-4 mr-2" />
            {op.label}
          </Button>
        ))}

        {operations.length > 3 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={isProcessing}>
                Mais
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {operations.slice(3).map((op, index) => (
                <DropdownMenuItem
                  key={op.id}
                  onClick={() => onOperation(op.id)}
                  className={op.variant === 'destructive' ? 'text-destructive' : ''}
                >
                  <op.icon className="h-4 w-4 mr-2" />
                  {op.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <Button variant="ghost" size="sm" onClick={onDeselectAll}>
          Limpar
        </Button>
      </div>
    </div>
  )
}

// ============ PROGRESS DIALOG ============

function BulkProgressDialog({
  isOpen,
  title,
  totalItems,
  processedItems,
  results,
  onClose,
  isComplete
}: {
  isOpen: boolean
  title: string
  totalItems: number
  processedItems: number
  results: BulkOperationResult[]
  onClose: () => void
  isComplete: boolean
}) {
  const successCount = results.filter(r => r.success).length
  const failureCount = results.filter(r => !r.success).length
  const progress = totalItems > 0 ? Math.round((processedItems / totalItems) * 100) : 0

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && isComplete && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {isComplete ? (
              failureCount > 0 ? (
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              ) : (
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              )
            ) : (
              <Loader2 className="h-5 w-5 animate-spin" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>
            {isComplete
              ? `${successCount} de ${totalItems} item(s) processado(s) com sucesso`
              : `Processando ${processedItems} de ${totalItems}...`
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Progress value={progress} className="h-2" />

          {failureCount > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-destructive">
                {failureCount} erro(s) encontrado(s):
              </p>
              <div className="max-h-32 overflow-auto space-y-1">
                {results
                  .filter(r => !r.success)
                  .map((r, index) => (
                    <div key={index} className="text-xs text-muted-foreground flex items-center gap-2">
                      <XCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                      {r.message || `Falha ao processar item ${r.itemId}`}
                    </div>
                  ))
                }
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button onClick={onClose} disabled={!isComplete}>
            {isComplete ? 'Fechar' : 'Aguarde...'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ============ MAIN COMPONENT ============

export function BulkActions({
  items,
  selectedIds,
  onSelectionChange,
  onBulkAction,
  operations = DEFAULT_OPERATIONS,
  className
}: BulkActionsProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [showProgress, setShowProgress] = useState(false)
  const [progressTitle, setProgressTitle] = useState('')
  const [processedCount, setProcessedCount] = useState(0)
  const [results, setResults] = useState<BulkOperationResult[]>([])
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean
    operation: BulkOperation | null
  }>({ isOpen: false, operation: null })

  const isAllSelected = selectedIds.length === items.length && items.length > 0

  const handleSelectAll = () => {
    onSelectionChange(items.map(i => i.id))
  }

  const handleDeselectAll = () => {
    onSelectionChange([])
  }

  const handleToggleItem = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter(i => i !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  const executeOperation = async (operationId: string) => {
    const operation = operations.find(o => o.id === operationId)
    if (!operation || selectedIds.length === 0) return

    setIsProcessing(true)
    setShowProgress(true)
    setProgressTitle(operation.label)
    setProcessedCount(0)
    setResults([])

    try {
      const operationResults = await onBulkAction(operationId, selectedIds)
      setResults(operationResults)
      setProcessedCount(selectedIds.length)

      const successCount = operationResults.filter(r => r.success).length
      
      if (successCount === selectedIds.length) {
        toast({
          title: 'Operação concluída',
          description: `${successCount} item(s) processado(s) com sucesso.`
        })
      } else if (successCount > 0) {
        toast({
          title: 'Operação parcialmente concluída',
          description: `${successCount} de ${selectedIds.length} item(s) processado(s).`,
          variant: 'default'
        })
      } else {
        toast({
          title: 'Operação falhou',
          description: 'Não foi possível processar os itens selecionados.',
          variant: 'destructive'
        })
      }
    } catch (error) {
      console.error('Bulk operation error:', error)
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro durante a operação.',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleOperation = (operationId: string) => {
    const operation = operations.find(o => o.id === operationId)
    if (!operation) return

    if (operation.requiresConfirmation) {
      setConfirmDialog({ isOpen: true, operation })
    } else {
      executeOperation(operationId)
    }
  }

  const handleConfirm = () => {
    if (confirmDialog.operation) {
      executeOperation(confirmDialog.operation.id)
    }
    setConfirmDialog({ isOpen: false, operation: null })
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Selection Toolbar */}
      <BulkSelectionToolbar
        totalCount={items.length}
        selectedCount={selectedIds.length}
        onSelectAll={handleSelectAll}
        onDeselectAll={handleDeselectAll}
        isAllSelected={isAllSelected}
        operations={operations}
        onOperation={handleOperation}
        isProcessing={isProcessing}
      />

      {/* Progress Dialog */}
      <BulkProgressDialog
        isOpen={showProgress}
        title={progressTitle}
        totalItems={selectedIds.length}
        processedItems={processedCount}
        results={results}
        onClose={() => setShowProgress(false)}
        isComplete={!isProcessing}
      />

      {/* Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(open) => !open && setConfirmDialog({ isOpen: false, operation: null })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDialog.operation?.confirmTitle || 'Confirmar ação'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.operation?.confirmDescription || 
                `Você está prestes a ${confirmDialog.operation?.label.toLowerCase()} ${selectedIds.length} item(s).`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              className={confirmDialog.operation?.variant === 'destructive' ? 'bg-destructive hover:bg-destructive/90' : ''}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ============ HOOK PARA USO SIMPLIFICADO ============

export function useBulkSelection<T extends { id: string }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<string[]>([])

  const isSelected = (id: string) => selectedIds.includes(id)
  const isAllSelected = selectedIds.length === items.length && items.length > 0
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < items.length

  const toggle = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(i => i !== id)
        : [...prev, id]
    )
  }

  const selectAll = () => setSelectedIds(items.map(i => i.id))
  const deselectAll = () => setSelectedIds([])

  const getSelectedItems = () => items.filter(i => selectedIds.includes(i.id))

  return {
    selectedIds,
    setSelectedIds,
    isSelected,
    isAllSelected,
    isSomeSelected,
    toggle,
    selectAll,
    deselectAll,
    getSelectedItems,
    selectedCount: selectedIds.length
  }
}

export default BulkActions

'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  GitBranch,
  GitCommit,
  History,
  Clock,
  User,
  FileText,
  Eye,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Diff,
  AlertCircle,
  Check,
  ArrowRight,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ============ TYPES ============

interface RecordVersion {
  id: string
  version: number
  title: string
  description: string | null
  content: string | null
  recordType: string
  priority: string
  changedBy: string
  changedByName: string
  changedAt: string
  changeType: 'created' | 'updated' | 'restored' | 'deleted'
  changesSummary?: string
  previousVersion?: number
}

interface VersionTimelineProps {
  recordId: string
  currentVersion?: number
  onRestoreVersion?: (versionId: string) => Promise<void>
  className?: string
}

// ============ HELPERS ============

const getChangeTypeConfig = (changeType: string) => {
  const configs: Record<string, { icon: React.ElementType; color: string; label: string; bgColor: string }> = {
    created: { icon: FileText, color: 'text-green-600', label: 'Criado', bgColor: 'bg-green-100' },
    updated: { icon: GitCommit, color: 'text-blue-600', label: 'Atualizado', bgColor: 'bg-blue-100' },
    restored: { icon: RotateCcw, color: 'text-purple-600', label: 'Restaurado', bgColor: 'bg-purple-100' },
    deleted: { icon: AlertCircle, color: 'text-red-600', label: 'Excluído', bgColor: 'bg-red-100' },
  }
  return configs[changeType] || configs.updated
}

const formatTimeAgo = (date: string) => {
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR })
}

const formatFullDate = (date: string) => {
  return format(new Date(date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
}

// ============ COMPONENTES ============

// Skeleton de carregamento
function TimelineSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex gap-4">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  )
}

// Diff viewer simples
function SimpleDiffViewer({ 
  oldText, 
  newText 
}: { 
  oldText: string | null
  newText: string | null 
}) {
  if (!oldText && !newText) {
    return <p className="text-muted-foreground italic">Sem conteúdo para comparar</p>
  }

  // Diff simples por linha
  const oldLines = (oldText || '').split('\n')
  const newLines = (newText || '').split('\n')
  
  const maxLines = Math.max(oldLines.length, newLines.length)
  const diffLines: Array<{ type: 'same' | 'added' | 'removed'; content: string }> = []

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i] || ''
    const newLine = newLines[i] || ''
    
    if (oldLine === newLine) {
      if (oldLine) diffLines.push({ type: 'same', content: oldLine })
    } else {
      if (oldLine) diffLines.push({ type: 'removed', content: oldLine })
      if (newLine) diffLines.push({ type: 'added', content: newLine })
    }
  }

  return (
    <div className="font-mono text-xs space-y-0.5 max-h-[400px] overflow-auto">
      {diffLines.map((line, i) => (
        <div
          key={i}
          className={cn(
            'px-2 py-0.5 rounded',
            line.type === 'added' && 'bg-green-100 text-green-800',
            line.type === 'removed' && 'bg-red-100 text-red-800 line-through',
            line.type === 'same' && 'text-muted-foreground'
          )}
        >
          <span className="mr-2 opacity-50">
            {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
          </span>
          {line.content || '\u00A0'}
        </div>
      ))}
    </div>
  )
}

// Item da timeline
function TimelineItem({
  version,
  isFirst,
  isLast,
  isCurrent,
  previousVersion,
  onRestore,
  isRestoring
}: {
  version: RecordVersion
  isFirst: boolean
  isLast: boolean
  isCurrent: boolean
  previousVersion?: RecordVersion
  onRestore?: () => Promise<void>
  isRestoring?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const [showDiff, setShowDiff] = useState(false)
  const config = getChangeTypeConfig(version.changeType)
  const Icon = config.icon

  return (
    <div className="relative flex gap-4 pb-8">
      {/* Linha vertical */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-0.5 bg-border" />
      )}

      {/* Ícone/Avatar */}
      <div className={cn(
        'relative z-10 flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors',
        isCurrent ? 'border-primary bg-primary text-primary-foreground' : 'border-border bg-background',
        config.bgColor
      )}>
        <Icon className={cn('h-4 w-4', isCurrent ? 'text-primary-foreground' : config.color)} />
      </div>

      {/* Conteúdo */}
      <Card className={cn(
        'flex-1 transition-shadow hover:shadow-md',
        isCurrent && 'ring-2 ring-primary ring-offset-2'
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">
                  Versão {version.version}
                </CardTitle>
                {isCurrent && (
                  <Badge variant="default" className="text-xs">
                    Atual
                  </Badge>
                )}
                <Badge variant="outline" className={cn('text-xs', config.color)}>
                  {config.label}
                </Badge>
              </div>
              <CardDescription className="flex items-center gap-2 mt-1">
                <User className="h-3 w-3" />
                {version.changedByName}
                <span className="text-muted-foreground">•</span>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTimeAgo(version.changedAt)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      {formatFullDate(version.changedAt)}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </CardDescription>
            </div>

            <div className="flex items-center gap-1">
              {previousVersion && (
                <Dialog open={showDiff} onOpenChange={setShowDiff}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <Diff className="h-4 w-4 mr-1" />
                      Diff
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-3xl">
                    <DialogHeader>
                      <DialogTitle className="flex items-center gap-2">
                        <Diff className="h-5 w-5" />
                        Comparação v{previousVersion.version} → v{version.version}
                      </DialogTitle>
                      <DialogDescription>
                        Alterações entre as versões
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <h4 className="font-medium mb-2">Título</h4>
                        {previousVersion.title !== version.title ? (
                          <div className="text-sm">
                            <span className="bg-red-100 text-red-800 px-1 rounded line-through">
                              {previousVersion.title}
                            </span>
                            <ArrowRight className="inline h-3 w-3 mx-2" />
                            <span className="bg-green-100 text-green-800 px-1 rounded">
                              {version.title}
                            </span>
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">Sem alteração</p>
                        )}
                      </div>
                      <div>
                        <h4 className="font-medium mb-2">Descrição</h4>
                        <SimpleDiffViewer 
                          oldText={previousVersion.description}
                          newText={version.description}
                        />
                      </div>
                      {(previousVersion.content || version.content) && (
                        <div>
                          <h4 className="font-medium mb-2">Conteúdo</h4>
                          <SimpleDiffViewer 
                            oldText={previousVersion.content}
                            newText={version.content}
                          />
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              )}

              {!isCurrent && onRestore && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={onRestore}
                        disabled={isRestoring}
                      >
                        {isRestoring ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RotateCcw className="h-4 w-4" />
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      Restaurar esta versão
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardHeader>

        {expanded && (
          <CardContent className="pt-0">
            <div className="space-y-3 text-sm">
              {version.changesSummary && (
                <div>
                  <span className="font-medium text-muted-foreground">Resumo: </span>
                  {version.changesSummary}
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium text-muted-foreground">Título: </span>
                  {version.title}
                </div>
                <div>
                  <span className="font-medium text-muted-foreground">Tipo: </span>
                  {version.recordType}
                </div>
              </div>

              {version.description && (
                <div>
                  <span className="font-medium text-muted-foreground block mb-1">Descrição:</span>
                  <p className="bg-muted/50 rounded p-2 text-xs whitespace-pre-wrap max-h-32 overflow-auto">
                    {version.description}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  )
}

// ============ COMPONENTE PRINCIPAL ============

export function VersionTimeline({
  recordId,
  currentVersion,
  onRestoreVersion,
  className
}: VersionTimelineProps) {
  const [versions, setVersions] = useState<RecordVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)

  const fetchVersions = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/medical-records/${recordId}/versions`)
      
      if (!response.ok) {
        throw new Error('Erro ao carregar histórico de versões')
      }

      const data = await response.json()
      setVersions(data.versions || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar dados')
    } finally {
      setIsLoading(false)
    }
  }, [recordId])

  useEffect(() => {
    fetchVersions()
  }, [fetchVersions])

  const handleRestore = async (versionId: string) => {
    if (!onRestoreVersion) return

    setRestoringId(versionId)
    try {
      await onRestoreVersion(versionId)
      await fetchVersions() // Recarregar após restauração
    } catch (err) {
      console.error('Erro ao restaurar:', err)
    } finally {
      setRestoringId(null)
    }
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Versões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TimelineSkeleton />
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={cn('border-destructive', className)}>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
          </div>
          <Button variant="outline" className="mt-4" onClick={fetchVersions}>
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (versions.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Versões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <GitBranch className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>Nenhum histórico de versões disponível</p>
            <p className="text-sm mt-1">
              O histórico será registrado quando houver alterações
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Versões
            </CardTitle>
            <CardDescription>
              {versions.length} versão(ões) registrada(s)
            </CardDescription>
          </div>
          <Badge variant="secondary" className="gap-1">
            <GitCommit className="h-3 w-3" />
            v{currentVersion || versions[0]?.version}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-0">
            {versions.map((version, index) => (
              <TimelineItem
                key={version.id}
                version={version}
                isFirst={index === 0}
                isLast={index === versions.length - 1}
                isCurrent={version.version === (currentVersion || versions[0]?.version)}
                previousVersion={versions[index + 1]}
                onRestore={onRestoreVersion ? () => handleRestore(version.id) : undefined}
                isRestoring={restoringId === version.id}
              />
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}

export default VersionTimeline

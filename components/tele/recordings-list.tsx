'use client'

import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { toast } from '@/hooks/use-toast'
import { Play, Download, Trash2, Clock, FileVideo, Loader2 } from 'lucide-react'
import { logger } from '@/lib/logger'
import {
  Dialog,
  DialogContent,
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

interface Recording {
  id: string
  status: string
  startedAt: string
  endedAt?: string
  duration?: number
  fileName?: string
  fileSize?: number
  url?: string | null
  doctor: { id: string; name: string }
  patient: { id: string; name: string }
}

interface RecordingsListProps {
  consultationId: string
}

export function RecordingsList({ consultationId }: RecordingsListProps) {
  const [recordings, setRecordings] = useState<Recording[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedRecording, setSelectedRecording] = useState<Recording | null>(null)
  const [showPlayer, setShowPlayer] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [recordingToDelete, setRecordingToDelete] = useState<string | null>(null)

  const loadRecordings = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/consultations/${consultationId}/recordings`)
      const data = await response.json()

      if (data.recordings) {
        setRecordings(data.recordings)
      }
    } catch (error) {
      logger.error('[Recordings] Erro ao carregar:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as gravações',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [consultationId])

  useEffect(() => {
    void loadRecordings()
  }, [loadRecordings])

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return 'N/A'
    
    const mb = bytes / (1024 * 1024)
    if (mb >= 1000) {
      return `${(mb / 1024).toFixed(2)} GB`
    }
    return `${mb.toFixed(2)} MB`
  }

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return 'N/A'
    
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    }
    return `${minutes}m ${secs}s`
  }

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const playRecording = (recording: Recording) => {
    if (!recording.url) {
      toast({
        title: 'Erro',
        description: 'URL de reprodução não disponível',
        variant: 'destructive'
      })
      return
    }
    
    setSelectedRecording(recording)
    setShowPlayer(true)
  }

  const confirmDelete = (recordingId: string) => {
    setRecordingToDelete(recordingId)
    setShowDeleteConfirm(true)
  }

  const deleteRecording = async () => {
    if (!recordingToDelete) return

    try {
      const response = await fetch(`/api/recordings/${recordingToDelete}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Erro ao excluir gravação')
      }

      toast({
        title: 'Sucesso',
        description: 'Gravação excluída com sucesso'
      })

      // Recarregar lista
      loadRecordings()

    } catch (error) {
      logger.error('[Recordings] Erro ao excluir:', error)
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir a gravação',
        variant: 'destructive'
      })
    } finally {
      setShowDeleteConfirm(false)
      setRecordingToDelete(null)
    }
  }

  if (loading) {
    return (
      <Card className="p-8 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-500">Carregando gravações...</span>
      </Card>
    )
  }

  if (recordings.length === 0) {
    return (
      <Card className="p-8 text-center text-gray-500">
        <FileVideo className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p>Nenhuma gravação disponível para esta consulta</p>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {recordings.map((recording) => (
          <Card key={recording.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <FileVideo className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">
                    Gravação de {formatDate(recording.startedAt)}
                  </h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    recording.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                    recording.status === 'RECORDING' ? 'bg-red-100 text-red-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {recording.status === 'COMPLETED' ? 'Concluída' :
                     recording.status === 'RECORDING' ? 'Gravando...' :
                     recording.status}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {formatDuration(recording.duration)}
                  </span>
                  <span>•</span>
                  <span>{formatFileSize(recording.fileSize)}</span>
                  {recording.fileName && (
                    <>
                      <span>•</span>
                      <span className="text-xs font-mono">{recording.fileName}</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {recording.status === 'COMPLETED' && recording.url && (
                  <>
                    <Button
                      onClick={() => playRecording(recording)}
                      size="sm"
                      variant="outline"
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Reproduzir
                    </Button>

                    <Button
                      onClick={() => window.open(recording.url!, '_blank')}
                      size="sm"
                      variant="outline"
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Download
                    </Button>
                  </>
                )}

                <Button
                  onClick={() => confirmDelete(recording.id)}
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Player de Vídeo */}
      <Dialog open={showPlayer} onOpenChange={setShowPlayer}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              Gravação de {selectedRecording && formatDate(selectedRecording.startedAt)}
            </DialogTitle>
          </DialogHeader>
          
          {selectedRecording?.url && (
            <div className="aspect-video bg-black rounded-lg overflow-hidden">
              <video
                controls
                autoPlay
                className="w-full h-full"
                src={selectedRecording.url}
              >
                Seu navegador não suporta reprodução de vídeo.
              </video>
            </div>
          )}

          <div className="flex justify-end gap-2 mt-4">
            <Button onClick={() => setShowPlayer(false)} variant="outline">
              Fechar
            </Button>
            {selectedRecording?.url && (
              <Button onClick={() => window.open(selectedRecording.url!, '_blank')}>
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Gravação?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. A gravação será permanentemente excluída
              do sistema.
              <br /><br />
              <strong>Importante:</strong> De acordo com a LGPD, o paciente tem direito
              ao esquecimento e pode solicitar a exclusão de suas gravações.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteRecording}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir Gravação
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

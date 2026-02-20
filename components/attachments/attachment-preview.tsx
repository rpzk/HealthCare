'use client'

import { useState, useEffect, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  X,
  Download,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  FileText,
  FileImage,
  FileVideo,
  FileAudio,
  File,
  ExternalLink,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============ TYPES ============

export interface AttachmentFile {
  id: string
  fileName: string
  fileType: string
  fileSize: number
  url: string
  thumbnailUrl?: string
  createdAt?: string
}

interface AttachmentPreviewProps {
  attachment: AttachmentFile | null
  isOpen: boolean
  onClose: () => void
  onDownload?: (attachment: AttachmentFile) => void
  attachments?: AttachmentFile[] // Para navegação entre múltiplos arquivos
  currentIndex?: number
  onNavigate?: (index: number) => void
}

// ============ HELPERS ============

const getFileCategory = (mimeType: string): 'image' | 'video' | 'audio' | 'pdf' | 'document' | 'other' => {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType === 'application/pdf') return 'pdf'
  if (
    mimeType.includes('word') ||
    mimeType.includes('document') ||
    mimeType.includes('text/')
  ) return 'document'
  return 'other'
}

const getFileIcon = (category: string) => {
  switch (category) {
    case 'image': return FileImage
    case 'video': return FileVideo
    case 'audio': return FileAudio
    case 'pdf':
    case 'document': return FileText
    default: return File
  }
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ============ IMAGE VIEWER ============

function ImageViewer({ src, alt }: { src: string; alt: string }) {
  const [zoom, setZoom] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(false)

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.25, 4))
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.25, 0.25))
  const handleRotate = () => setRotation(prev => (prev + 90) % 360)
  const handleReset = () => {
    setZoom(1)
    setRotation(0)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      })
    }
  }

  const handleMouseUp = () => setIsDragging(false)

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    if (e.deltaY < 0) handleZoomIn()
    else handleZoomOut()
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>Não foi possível carregar a imagem</p>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      {/* Toolbar */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1 bg-background/90 backdrop-blur-sm rounded-lg p-1 shadow-lg">
        <Button variant="ghost" size="icon" onClick={handleZoomOut} disabled={zoom <= 0.25}>
          <ZoomOut className="h-4 w-4" />
        </Button>
        <span className="text-xs font-medium px-2 min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <Button variant="ghost" size="icon" onClick={handleZoomIn} disabled={zoom >= 4}>
          <ZoomIn className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button variant="ghost" size="icon" onClick={handleRotate}>
          <RotateCw className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" onClick={handleReset}>
          <Maximize2 className="h-4 w-4" />
        </Button>
      </div>

      {/* Image Container */}
      <div 
        className="h-full w-full overflow-hidden flex items-center justify-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        style={{ cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default' }}
      >
        {isLoading && (
          <Skeleton className="absolute inset-0" />
        )}
        <img
          src={src}
          alt={alt}
          className={cn(
            "max-h-full max-w-full object-contain transition-transform select-none",
            isLoading && "opacity-0"
          )}
          style={{
            transform: `scale(${zoom}) rotate(${rotation}deg) translate(${position.x / zoom}px, ${position.y / zoom}px)`
          }}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false)
            setError(true)
          }}
          draggable={false}
        />
      </div>
    </div>
  )
}

// ============ VIDEO VIEWER ============

function VideoViewer({ src, type }: { src: string; type: string }) {
  const [error, setError] = useState(false)

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <AlertCircle className="h-12 w-12 mb-4" />
        <p>Não foi possível reproduzir o vídeo</p>
        <Button variant="link" asChild className="mt-2">
          <a href={src} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir em nova aba
          </a>
        </Button>
      </div>
    )
  }

  return (
    <video 
      src={src} 
      controls 
      className="max-h-full max-w-full"
      onError={() => setError(true)}
    >
      <source src={src} type={type} />
      Seu navegador não suporta reprodução de vídeo.
    </video>
  )
}

// ============ AUDIO VIEWER ============

function AudioViewer({ src, type, fileName }: { src: string; type: string; fileName: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8">
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center">
        <FileAudio className="h-16 w-16 text-primary" />
      </div>
      <h3 className="text-lg font-medium text-center max-w-md truncate">{fileName}</h3>
      <audio src={src} controls className="w-full max-w-md">
        <source src={src} type={type} />
        Seu navegador não suporta reprodução de áudio.
      </audio>
    </div>
  )
}

// ============ PDF VIEWER ============

function PDFViewer({ src, fileName }: { src: string; fileName: string }) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className="h-full w-full flex flex-col">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      <iframe
        src={`${src}#toolbar=1&navpanes=0`}
        className="flex-1 w-full border-0"
        title={fileName}
        onLoad={() => setIsLoading(false)}
      />
    </div>
  )
}

// ============ UNSUPPORTED FILE ============

function UnsupportedFile({ 
  fileName, 
  fileType, 
  fileSize,
  url,
  onDownload 
}: { 
  fileName: string
  fileType: string
  fileSize: number
  url: string
  onDownload?: () => void
}) {
  const FileIcon = getFileIcon(getFileCategory(fileType))

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 text-center">
      <div className="w-24 h-24 rounded-2xl bg-muted flex items-center justify-center">
        <FileIcon className="h-12 w-12 text-muted-foreground" />
      </div>
      <div>
        <h3 className="text-lg font-medium mb-1">{fileName}</h3>
        <p className="text-sm text-muted-foreground">
          {fileType} • {formatFileSize(fileSize)}
        </p>
      </div>
      <p className="text-sm text-muted-foreground max-w-md">
        Este tipo de arquivo não pode ser visualizado diretamente. 
        Faça o download para abrir no aplicativo correspondente.
      </p>
      <div className="flex gap-2">
        <Button onClick={onDownload}>
          <Download className="h-4 w-4 mr-2" />
          Download
        </Button>
        <Button variant="outline" asChild>
          <a href={url} target="_blank" rel="noopener noreferrer">
            <ExternalLink className="h-4 w-4 mr-2" />
            Abrir externamente
          </a>
        </Button>
      </div>
    </div>
  )
}

// ============ MAIN COMPONENT ============

export function AttachmentPreview({
  attachment,
  isOpen,
  onClose,
  onDownload,
  attachments = [],
  currentIndex = 0,
  onNavigate
}: AttachmentPreviewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false)

  const hasMultiple = attachments.length > 1
  const canGoPrev = hasMultiple && currentIndex > 0
  const canGoNext = hasMultiple && currentIndex < attachments.length - 1

  const handlePrev = useCallback(() => {
    if (canGoPrev && onNavigate) {
      onNavigate(currentIndex - 1)
    }
  }, [canGoPrev, currentIndex, onNavigate])

  const handleNext = useCallback(() => {
    if (canGoNext && onNavigate) {
      onNavigate(currentIndex + 1)
    }
  }, [canGoNext, currentIndex, onNavigate])

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return
      
      switch (e.key) {
        case 'ArrowLeft':
          handlePrev()
          break
        case 'ArrowRight':
          handleNext()
          break
        case 'Escape':
          onClose()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, handlePrev, handleNext, onClose])

  const handleDownload = () => {
    if (attachment && onDownload) {
      onDownload(attachment)
    } else if (attachment) {
      window.open(attachment.url, '_blank')
    }
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen()
      setIsFullscreen(false)
    }
  }

  if (!attachment) return null

  const category = getFileCategory(attachment.fileType)
  const FileIcon = getFileIcon(category)

  const renderContent = () => {
    switch (category) {
      case 'image':
        return <ImageViewer src={attachment.url} alt={attachment.fileName} />
      
      case 'video':
        return <VideoViewer src={attachment.url} type={attachment.fileType} />
      
      case 'audio':
        return <AudioViewer src={attachment.url} type={attachment.fileType} fileName={attachment.fileName} />
      
      case 'pdf':
        return <PDFViewer src={attachment.url} fileName={attachment.fileName} />
      
      default:
        return (
          <UnsupportedFile
            fileName={attachment.fileName}
            fileType={attachment.fileType}
            fileSize={attachment.fileSize}
            url={attachment.url}
            onDownload={handleDownload}
          />
        )
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-6xl h-[90vh] p-0 gap-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-4 py-3 border-b flex-row items-center justify-between space-y-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-lg bg-muted">
              <FileIcon className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="min-w-0">
              <DialogTitle className="text-base truncate">{attachment.fileName}</DialogTitle>
              <p className="text-xs text-muted-foreground">
                {formatFileSize(attachment.fileSize)}
                {hasMultiple && (
                  <span className="ml-2">
                    • {currentIndex + 1} de {attachments.length}
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={handleDownload}>
              <Download className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={toggleFullscreen}>
              <Maximize2 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 relative bg-muted/30 flex items-center justify-center overflow-hidden">
          {/* Navigation Arrows */}
          {canGoPrev && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 z-10 rounded-full shadow-lg"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
          )}
          {canGoNext && (
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 z-10 rounded-full shadow-lg"
              onClick={handleNext}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}

          {renderContent()}
        </div>

        {/* Thumbnails (for multiple files) */}
        {hasMultiple && (
          <ScrollArea className="border-t">
            <div className="flex gap-2 p-2">
              {attachments.map((att, index) => {
                const attCategory = getFileCategory(att.fileType)
                const AttIcon = getFileIcon(attCategory)
                const isActive = index === currentIndex

                return (
                  <button
                    key={att.id}
                    className={cn(
                      "flex-shrink-0 w-16 h-16 rounded-lg border-2 overflow-hidden transition-colors",
                      isActive ? "border-primary" : "border-transparent hover:border-muted-foreground/30"
                    )}
                    onClick={() => onNavigate?.(index)}
                  >
                    {attCategory === 'image' && att.thumbnailUrl ? (
                      <img 
                        src={att.thumbnailUrl} 
                        alt={att.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <AttIcon className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  )
}

// ============ HOOK PARA USO SIMPLIFICADO ============

export function useAttachmentPreview(attachments: AttachmentFile[] = []) {
  const [isOpen, setIsOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)

  const openPreview = (index: number = 0) => {
    setCurrentIndex(index)
    setIsOpen(true)
  }

  const closePreview = () => setIsOpen(false)

  const navigateTo = (index: number) => {
    if (index >= 0 && index < attachments.length) {
      setCurrentIndex(index)
    }
  }

  return {
    isOpen,
    currentIndex,
    currentAttachment: attachments[currentIndex] || null,
    openPreview,
    closePreview,
    navigateTo,
    PreviewComponent: () => (
      <AttachmentPreview
        attachment={attachments[currentIndex] || null}
        isOpen={isOpen}
        onClose={closePreview}
        attachments={attachments}
        currentIndex={currentIndex}
        onNavigate={navigateTo}
      />
    )
  }
}

export default AttachmentPreview

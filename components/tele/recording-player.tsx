'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  SkipBack,
  SkipForward,
  Download,
  Share2,
  Clock,
  Film,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Rewind,
  FastForward
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ============ TIPOS ============

interface RecordingPlayerProps {
  recordingId: string
  consultationId?: string
  title?: string
  thumbnails?: string[]
  duration?: number
  onClose?: () => void
  className?: string
}

interface PlaybackState {
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  isMuted: boolean
  isFullscreen: boolean
  playbackRate: number
  quality: string
  buffered: number
  isLoading: boolean
  error: string | null
}

// ============ CONSTANTES ============

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]
const QUALITY_OPTIONS = ['auto', '1080p', '720p', '480p', '360p']
const SKIP_SECONDS = 10

// ============ COMPONENTE PRINCIPAL ============

export function RecordingPlayer({
  recordingId,
  consultationId,
  title,
  thumbnails = [],
  duration: initialDuration,
  onClose,
  className
}: RecordingPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const progressRef = useRef<HTMLDivElement>(null)
  const hideControlsTimeout = useRef<NodeJS.Timeout | null>(null)

  const [state, setState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: initialDuration || 0,
    volume: 1,
    isMuted: false,
    isFullscreen: false,
    playbackRate: 1,
    quality: 'auto',
    buffered: 0,
    isLoading: true,
    error: null
  })

  const [showControls, setShowControls] = useState(true)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [currentThumbnail, setCurrentThumbnail] = useState(0)

  // Carregar URL do vídeo
  useEffect(() => {
    const loadVideo = async () => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }))
        
        const response = await fetch(`/api/tele/recording/${recordingId}`)
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Erro ao carregar vídeo')
        }

        setVideoUrl(data.url)
      } catch (error: any) {
        setState(prev => ({ ...prev, error: error.message, isLoading: false }))
      }
    }

    loadVideo()
  }, [recordingId])

  // Event handlers do vídeo
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleLoadedMetadata = () => {
      setState(prev => ({
        ...prev,
        duration: video.duration,
        isLoading: false
      }))
    }

    const handleTimeUpdate = () => {
      setState(prev => ({
        ...prev,
        currentTime: video.currentTime
      }))
    }

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1)
        const bufferedPercent = (bufferedEnd / video.duration) * 100
        setState(prev => ({ ...prev, buffered: bufferedPercent }))
      }
    }

    const handlePlay = () => setState(prev => ({ ...prev, isPlaying: true }))
    const handlePause = () => setState(prev => ({ ...prev, isPlaying: false }))
    const handleEnded = () => setState(prev => ({ ...prev, isPlaying: false, currentTime: 0 }))
    const handleWaiting = () => setState(prev => ({ ...prev, isLoading: true }))
    const handleCanPlay = () => setState(prev => ({ ...prev, isLoading: false }))
    const handleError = () => setState(prev => ({ 
      ...prev, 
      error: 'Erro ao reproduzir vídeo',
      isLoading: false 
    }))

    video.addEventListener('loadedmetadata', handleLoadedMetadata)
    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('progress', handleProgress)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)
    video.addEventListener('ended', handleEnded)
    video.addEventListener('waiting', handleWaiting)
    video.addEventListener('canplay', handleCanPlay)
    video.addEventListener('error', handleError)

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata)
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('progress', handleProgress)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
      video.removeEventListener('ended', handleEnded)
      video.removeEventListener('waiting', handleWaiting)
      video.removeEventListener('canplay', handleCanPlay)
      video.removeEventListener('error', handleError)
    }
  }, [videoUrl])

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true)
      
      if (hideControlsTimeout.current) {
        clearTimeout(hideControlsTimeout.current)
      }

      if (state.isPlaying) {
        hideControlsTimeout.current = setTimeout(() => {
          setShowControls(false)
        }, 3000)
      }
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('mousemove', handleMouseMove)
      return () => container.removeEventListener('mousemove', handleMouseMove)
    }
  }, [state.isPlaying])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault()
          togglePlay()
          break
        case 'ArrowLeft':
          e.preventDefault()
          skip(-SKIP_SECONDS)
          break
        case 'ArrowRight':
          e.preventDefault()
          skip(SKIP_SECONDS)
          break
        case 'ArrowUp':
          e.preventDefault()
          adjustVolume(0.1)
          break
        case 'ArrowDown':
          e.preventDefault()
          adjustVolume(-0.1)
          break
        case 'm':
          toggleMute()
          break
        case 'f':
          toggleFullscreen()
          break
        case 'Escape':
          if (state.isFullscreen) toggleFullscreen()
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [state.isPlaying, state.isFullscreen])

  // Funções de controle
  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }, [])

  const skip = useCallback((seconds: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds))
  }, [])

  const seek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = time
  }, [])

  const adjustVolume = useCallback((delta: number) => {
    const video = videoRef.current
    if (!video) return
    const newVolume = Math.max(0, Math.min(1, state.volume + delta))
    video.volume = newVolume
    setState(prev => ({ ...prev, volume: newVolume, isMuted: newVolume === 0 }))
  }, [state.volume])

  const setVolume = useCallback((volume: number) => {
    const video = videoRef.current
    if (!video) return
    video.volume = volume
    setState(prev => ({ ...prev, volume, isMuted: volume === 0 }))
  }, [])

  const toggleMute = useCallback(() => {
    const video = videoRef.current
    if (!video) return
    video.muted = !video.muted
    setState(prev => ({ ...prev, isMuted: !prev.isMuted }))
  }, [])

  const toggleFullscreen = useCallback(async () => {
    const container = containerRef.current
    if (!container) return

    if (!document.fullscreenElement) {
      await container.requestFullscreen()
      setState(prev => ({ ...prev, isFullscreen: true }))
    } else {
      await document.exitFullscreen()
      setState(prev => ({ ...prev, isFullscreen: false }))
    }
  }, [])

  const setPlaybackRate = useCallback((rate: number) => {
    const video = videoRef.current
    if (!video) return
    video.playbackRate = rate
    setState(prev => ({ ...prev, playbackRate: rate }))
  }, [])

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = progressRef.current?.getBoundingClientRect()
    if (!rect) return
    const percent = (e.clientX - rect.left) / rect.width
    seek(percent * state.duration)
  }, [state.duration, seek])

  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = Math.floor(seconds % 60)
    
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    }
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0

  // Render
  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-black rounded-lg overflow-hidden group',
        state.isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'aspect-video',
        className
      )}
    >
      {/* Video Element */}
      {videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-contain"
          onClick={togglePlay}
          playsInline
        />
      )}

      {/* Loading Overlay */}
      {state.isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-12 w-12 text-white animate-spin" />
        </div>
      )}

      {/* Error Overlay */}
      {state.error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
          <p className="text-white text-lg">{state.error}</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Tentar novamente
          </Button>
        </div>
      )}

      {/* Play/Pause Overlay */}
      {!state.isPlaying && !state.isLoading && !state.error && (
        <div 
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
        >
          <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center shadow-lg hover:bg-white transition-colors">
            <Play className="h-10 w-10 text-gray-900 ml-1" />
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        {/* Title Bar */}
        {title && (
          <div className="absolute top-0 left-0 right-0 p-4">
            <h3 className="text-white font-medium truncate">{title}</h3>
            {consultationId && (
              <p className="text-white/70 text-sm">Consulta #{consultationId}</p>
            )}
          </div>
        )}

        {/* Progress Bar */}
        <div className="px-4 pt-8">
          <div
            ref={progressRef}
            className="h-1.5 bg-white/30 rounded-full cursor-pointer group/progress"
            onClick={handleProgressClick}
          >
            {/* Buffered */}
            <div 
              className="absolute h-1.5 bg-white/50 rounded-full"
              style={{ width: `${state.buffered}%` }}
            />
            {/* Progress */}
            <div 
              className="relative h-1.5 bg-primary rounded-full"
              style={{ width: `${progressPercent}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow opacity-0 group-hover/progress:opacity-100 transition-opacity" />
            </div>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            {/* Play/Pause */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={togglePlay}
                  >
                    {state.isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {state.isPlaying ? 'Pausar (K)' : 'Reproduzir (K)'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Skip Back */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => skip(-SKIP_SECONDS)}
                  >
                    <Rewind className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Voltar 10s (←)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Skip Forward */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => skip(SKIP_SECONDS)}
                  >
                    <FastForward className="h-5 w-5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Avançar 10s (→)</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Volume */}
            <div className="flex items-center gap-2 group/volume">
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/20"
                onClick={toggleMute}
              >
                {state.isMuted || state.volume === 0 ? (
                  <VolumeX className="h-5 w-5" />
                ) : (
                  <Volume2 className="h-5 w-5" />
                )}
              </Button>
              <div className="w-0 overflow-hidden group-hover/volume:w-24 transition-all duration-200">
                <Slider
                  value={[state.isMuted ? 0 : state.volume * 100]}
                  max={100}
                  step={1}
                  onValueChange={([v]) => setVolume(v / 100)}
                  className="w-20"
                />
              </div>
            </div>

            {/* Time */}
            <span className="text-white text-sm ml-2">
              {formatTime(state.currentTime)} / {formatTime(state.duration)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* Playback Speed */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-white hover:bg-white/20"
                >
                  {state.playbackRate}x
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Velocidade</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {PLAYBACK_RATES.map((rate) => (
                  <DropdownMenuItem
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={state.playbackRate === rate ? 'bg-accent' : ''}
                  >
                    {rate}x {rate === 1 && '(Normal)'}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Settings */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Qualidade</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {QUALITY_OPTIONS.map((quality) => (
                  <DropdownMenuItem
                    key={quality}
                    onClick={() => setState(prev => ({ ...prev, quality }))}
                    className={state.quality === quality ? 'bg-accent' : ''}
                  >
                    {quality === 'auto' ? 'Automático' : quality}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Fullscreen */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={toggleFullscreen}
                  >
                    {state.isFullscreen ? (
                      <Minimize className="h-5 w-5" />
                    ) : (
                      <Maximize className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {state.isFullscreen ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* Thumbnails Preview (on hover) */}
      {thumbnails.length > 0 && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 hidden group-hover:flex gap-1">
          {thumbnails.slice(0, 5).map((thumb, i) => (
            <img
              key={i}
              src={thumb}
              alt={`Preview ${i + 1}`}
              className={cn(
                'w-24 h-14 object-cover rounded border-2 cursor-pointer transition-all',
                i === currentThumbnail ? 'border-primary scale-110' : 'border-transparent opacity-70'
              )}
              onClick={() => {
                setCurrentThumbnail(i)
                seek((i / thumbnails.length) * state.duration)
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default RecordingPlayer

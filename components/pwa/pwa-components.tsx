'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import {
  Download,
  Wifi,
  WifiOff,
  RefreshCw,
  Bell,
  BellOff,
  Smartphone,
  CloudOff,
  Cloud,
  CheckCircle,
  AlertCircle,
  Trash2,
  Loader2,
  Settings,
  ArrowUpCircle
} from 'lucide-react'
import { usePWA, usePushNotifications } from '@/hooks/use-pwa'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

// ============ COMPONENTE DE INSTALAÇÃO ============

export function PWAInstallPrompt() {
  const { isInstallable, isInstalled, installApp } = usePWA()
  const [installing, setInstalling] = useState(false)

  if (isInstalled || !isInstallable) return null

  const handleInstall = async () => {
    setInstalling(true)
    const success = await installApp()
    setInstalling(false)

    if (success) {
      toast({
        title: 'App instalado!',
        description: 'O Healthcare foi adicionado à sua tela inicial.'
      })
    }
  }

  return (
    <Alert className="border-primary bg-primary/5">
      <Smartphone className="h-4 w-4" />
      <AlertTitle>Instalar App</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span>Instale o Healthcare para acesso rápido e offline.</span>
        <Button 
          size="sm" 
          onClick={handleInstall}
          disabled={installing}
        >
          {installing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Instalar
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  )
}

// ============ INDICADOR DE STATUS ONLINE ============

export function OnlineStatusIndicator({ className }: { className?: string }) {
  const { isOnline, pendingActionsCount, syncPendingActions } = usePWA()
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    await syncPendingActions()
    setSyncing(false)
    toast({
      title: 'Sincronização iniciada',
      description: 'Suas ações pendentes estão sendo enviadas.'
    })
  }

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {isOnline ? (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <Wifi className="h-3 w-3 mr-1" />
          Online
        </Badge>
      ) : (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <WifiOff className="h-3 w-3 mr-1" />
          Offline
        </Badge>
      )}

      {pendingActionsCount > 0 && (
        <Badge 
          variant="secondary" 
          className="cursor-pointer"
          onClick={handleSync}
        >
          {syncing ? (
            <Loader2 className="h-3 w-3 animate-spin mr-1" />
          ) : (
            <CloudOff className="h-3 w-3 mr-1" />
          )}
          {pendingActionsCount} pendente{pendingActionsCount > 1 ? 's' : ''}
        </Badge>
      )}
    </div>
  )
}

// ============ BANNER DE ATUALIZAÇÃO ============

export function UpdateBanner() {
  const { isUpdateAvailable, updateApp } = usePWA()
  const [updating, setUpdating] = useState(false)

  if (!isUpdateAvailable) return null

  const handleUpdate = () => {
    setUpdating(true)
    updateApp()
  }

  return (
    <Alert className="border-blue-200 bg-blue-50 fixed bottom-4 left-4 right-4 z-50 shadow-lg max-w-md mx-auto">
      <ArrowUpCircle className="h-4 w-4 text-blue-600" />
      <AlertTitle className="text-blue-900">Nova versão disponível</AlertTitle>
      <AlertDescription className="flex items-center justify-between">
        <span className="text-blue-700">Atualize para a versão mais recente.</span>
        <Button 
          size="sm" 
          variant="outline"
          className="border-blue-300 text-blue-700 hover:bg-blue-100"
          onClick={handleUpdate}
          disabled={updating}
        >
          {updating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <RefreshCw className="h-4 w-4 mr-2" />
              Atualizar
            </>
          )}
        </Button>
      </AlertDescription>
    </Alert>
  )
}

// ============ CONFIGURAÇÕES PWA ============

export function PWASettings() {
  const { 
    isOnline, 
    isInstalled, 
    pendingActionsCount, 
    clearCache,
    syncPendingActions 
  } = usePWA()

  const {
    isSupported: pushSupported,
    isSubscribed: pushSubscribed,
    permission: pushPermission,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    requestPermission
  } = usePushNotifications()

  const [clearing, setClearing] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [togglingPush, setTogglingPush] = useState(false)

  const handleClearCache = async () => {
    setClearing(true)
    await clearCache()
    setClearing(false)
    toast({
      title: 'Cache limpo',
      description: 'O cache do aplicativo foi removido.'
    })
  }

  const handleSync = async () => {
    setSyncing(true)
    await syncPendingActions()
    setSyncing(false)
  }

  const handleTogglePush = async () => {
    setTogglingPush(true)
    
    if (pushSubscribed) {
      await unsubscribePush()
      toast({
        title: 'Notificações desativadas',
        description: 'Você não receberá mais notificações push.'
      })
    } else {
      const success = await subscribePush()
      if (success) {
        toast({
          title: 'Notificações ativadas',
          description: 'Você receberá notificações importantes.'
        })
      } else {
        toast({
          title: 'Erro',
          description: 'Não foi possível ativar as notificações.',
          variant: 'destructive'
        })
      }
    }

    setTogglingPush(false)
  }

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon">
          <Settings className="h-5 w-5" />
        </Button>
      </SheetTrigger>

      <SheetContent>
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5" />
            Configurações do App
          </SheetTitle>
          <SheetDescription>
            Gerencie as configurações offline e notificações
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Status */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Conexão</span>
                <Badge variant={isOnline ? 'default' : 'secondary'}>
                  {isOnline ? (
                    <><Cloud className="h-3 w-3 mr-1" />Online</>
                  ) : (
                    <><CloudOff className="h-3 w-3 mr-1" />Offline</>
                  )}
                </Badge>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Instalação</span>
                <Badge variant={isInstalled ? 'default' : 'outline'}>
                  {isInstalled ? (
                    <><CheckCircle className="h-3 w-3 mr-1" />Instalado</>
                  ) : (
                    <><AlertCircle className="h-3 w-3 mr-1" />Não instalado</>
                  )}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Sincronização */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Sincronização</CardTitle>
              <CardDescription>
                {pendingActionsCount} ação(ões) pendente(s)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSync}
                disabled={syncing || pendingActionsCount === 0 || !isOnline}
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Sincronizar agora
              </Button>
            </CardContent>
          </Card>

          {/* Notificações Push */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Notificações Push</CardTitle>
              <CardDescription>
                {!pushSupported 
                  ? 'Não suportado neste navegador'
                  : pushPermission === 'denied'
                    ? 'Bloqueado nas configurações do navegador'
                    : pushSubscribed
                      ? 'Ativadas'
                      : 'Desativadas'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant={pushSubscribed ? 'destructive' : 'default'}
                className="w-full"
                onClick={handleTogglePush}
                disabled={togglingPush || !pushSupported || pushPermission === 'denied'}
              >
                {togglingPush ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : pushSubscribed ? (
                  <BellOff className="h-4 w-4 mr-2" />
                ) : (
                  <Bell className="h-4 w-4 mr-2" />
                )}
                {pushSubscribed ? 'Desativar' : 'Ativar'} notificações
              </Button>
            </CardContent>
          </Card>

          {/* Cache */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Cache</CardTitle>
              <CardDescription>
                Dados armazenados para acesso offline
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                className="w-full text-destructive hover:bg-destructive/10"
                onClick={handleClearCache}
                disabled={clearing}
              >
                {clearing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Limpar cache
              </Button>
            </CardContent>
          </Card>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ============ PÁGINA OFFLINE ============

export function OfflinePage() {
  const { isOnline, pendingActionsCount, syncPendingActions } = usePWA()
  const [syncing, setSyncing] = useState(false)

  const handleSync = async () => {
    setSyncing(true)
    await syncPendingActions()
    setSyncing(false)
  }

  if (isOnline) return null

  return (
    <div className="fixed inset-0 bg-background/95 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-4">
            <WifiOff className="h-8 w-8 text-amber-600" />
          </div>
          <CardTitle>Você está offline</CardTitle>
          <CardDescription>
            Algumas funcionalidades podem estar limitadas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            Você pode continuar navegando nas páginas já visitadas. 
            Suas ações serão sincronizadas quando a conexão for restaurada.
          </p>

          {pendingActionsCount > 0 && (
            <Alert>
              <CloudOff className="h-4 w-4" />
              <AlertDescription>
                {pendingActionsCount} ação(ões) aguardando sincronização
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => window.location.reload()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Tentar reconectar
            </Button>
            
            {pendingActionsCount > 0 && (
              <Button
                className="flex-1"
                onClick={handleSync}
                disabled={syncing}
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Cloud className="h-4 w-4 mr-2" />
                )}
                Sincronizar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ============ EXPORTAÇÕES ============

export default {
  PWAInstallPrompt,
  OnlineStatusIndicator,
  UpdateBanner,
  PWASettings,
  OfflinePage
}

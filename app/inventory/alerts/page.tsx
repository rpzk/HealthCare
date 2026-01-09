'use client'

import { useCallback, useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, Package, Bell, TrendingDown, AlertCircle } from 'lucide-react'

interface StockAlert {
  productId: string
  productName: string
  category: string
  currentStock: number
  minStockLevel: number
  unit: string
  location: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  percentageRemaining: number
  suggestedOrderQuantity: number
}

interface AlertSummary {
  critical: number
  high: number
  medium: number
  low: number
}

export default function StockAlertsPage() {
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [summary, setSummary] = useState<AlertSummary>({ critical: 0, high: 0, medium: 0, low: 0 })
  const [loading, setLoading] = useState(true)
  const [notifying, setNotifying] = useState<string | null>(null)
  const { toast } = useToast()

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/inventory/alerts')
      const data = await res.json()
      setAlerts(data.alerts || [])
      setSummary(data.summary || { critical: 0, high: 0, medium: 0, low: 0 })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os alertas de estoque',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => {
    void fetchAlerts()
  }, [fetchAlerts])

  const sendNotification = async (productId: string) => {
    setNotifying(productId)
    try {
      const res = await fetch('/api/inventory/alerts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      })

      if (!res.ok) throw new Error('Erro ao enviar notificação')

      const data = await res.json()
      toast({
        title: 'Notificação enviada',
        description: `${data.notificationsSent} administradores foram notificados`
      })
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar a notificação',
        variant: 'destructive'
      })
    } finally {
      setNotifying(null)
    }
  }

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge className="bg-red-600 hover:bg-red-700">Crítico</Badge>
      case 'HIGH':
        return <Badge className="bg-orange-500 hover:bg-orange-600">Alto</Badge>
      case 'MEDIUM':
        return <Badge className="bg-yellow-500 hover:bg-yellow-600">Médio</Badge>
      case 'LOW':
        return <Badge className="bg-blue-500 hover:bg-blue-600">Baixo</Badge>
      default:
        return <Badge>Desconhecido</Badge>
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">Carregando alertas...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Alertas de Estoque</h1>
        <p className="text-muted-foreground">Produtos com níveis abaixo do mínimo recomendado</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-red-600" />
              Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600">{summary.critical}</div>
            <p className="text-xs text-muted-foreground">Estoque zerado</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-500" />
              Alta Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-500">{summary.high}</div>
            <p className="text-xs text-muted-foreground">≤ 25% do mínimo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-yellow-500" />
              Média Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-600">{summary.medium}</div>
            <p className="text-xs text-muted-foreground">26-50% do mínimo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-500" />
              Baixa Prioridade
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600">{summary.low}</div>
            <p className="text-xs text-muted-foreground">51-100% do mínimo</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts List */}
      <Card>
        <CardHeader>
          <CardTitle>Produtos Necessitando Reposição</CardTitle>
          <CardDescription>
            {alerts.length} produto{alerts.length !== 1 ? 's' : ''} com estoque baixo
          </CardDescription>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Todos os produtos estão com estoque adequado! 🎉</p>
            </div>
          ) : (
            <div className="space-y-3">
              {alerts.map(alert => (
                <div
                  key={alert.productId}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{alert.productName}</h3>
                      {getSeverityBadge(alert.severity)}
                    </div>
                    <div className="text-sm text-muted-foreground space-x-4">
                      <span>Categoria: {alert.category}</span>
                      <span>Local: {alert.location}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-medium">
                        Estoque atual: <span className="text-red-600">{alert.currentStock} {alert.unit}</span>
                      </span>
                      <span className="text-muted-foreground">
                        Mínimo: {alert.minStockLevel} {alert.unit}
                      </span>
                      <span className="text-muted-foreground">
                        ({alert.percentageRemaining.toFixed(0)}% do mínimo)
                      </span>
                    </div>
                    {alert.suggestedOrderQuantity > 0 && (
                      <div className="text-sm font-medium text-blue-600">
                        Sugestão de pedido: {alert.suggestedOrderQuantity} {alert.unit}
                      </div>
                    )}
                  </div>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendNotification(alert.productId)}
                    disabled={notifying === alert.productId}
                    className="ml-4"
                  >
                    <Bell className="h-4 w-4 mr-2" />
                    {notifying === alert.productId ? 'Enviando...' : 'Notificar'}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

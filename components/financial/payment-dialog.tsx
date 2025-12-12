'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { 
  CreditCard, 
  QrCode, 
  Send, 
  Copy, 
  CheckCircle,
  XCircle,
  Clock,
  DollarSign
} from 'lucide-react'

interface Transaction {
  id: string
  description: string
  amount: number
  status: string
  dueDate: string
  patient?: {
    name: string
    email?: string
    phone?: string
  }
}

interface PaymentDialogProps {
  transaction: Transaction
  onClose: () => void
  onSuccess: () => void
}

export function PaymentDialog({ transaction, onClose, onSuccess }: PaymentDialogProps) {
  const { toast } = useToast()
  const [provider, setProvider] = useState<'mercadopago' | 'pix'>('mercadopago')
  const [installments, setInstallments] = useState(1)
  const [sendWhatsApp, setSendWhatsApp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [paymentResult, setPaymentResult] = useState<any>(null)

  const handleGeneratePayment = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/payment/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: transaction.id,
          provider,
          installments,
          sendWhatsApp,
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao gerar link de pagamento')
      }

      setPaymentResult(data)
      
      toast({
        title: '✅ Link de pagamento gerado!',
        description: sendWhatsApp 
          ? 'Link enviado por WhatsApp para o paciente'
          : 'Compartilhe o link com o paciente',
      })

      onSuccess()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: '✅ Copiado!',
      description: 'Link copiado para área de transferência',
    })
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>💳 Gerar Cobrança Online</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Info da transação */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Detalhes do Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paciente:</span>
                <span className="font-medium">{transaction.patient?.name || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Descrição:</span>
                <span className="font-medium">{transaction.description}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor:</span>
                <span className="font-bold text-lg text-green-600">
                  R$ {transaction.amount.toFixed(2)}
                </span>
              </div>
              {transaction.patient?.phone && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">WhatsApp:</span>
                  <span className="font-medium">{transaction.patient.phone}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {!paymentResult ? (
            <>
              {/* Selecionar provedor */}
              <div className="space-y-3">
                <label className="text-sm font-medium">Método de Pagamento</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setProvider('mercadopago')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      provider === 'mercadopago'
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <CreditCard className="h-6 w-6" />
                    <span className="font-medium">MercadoPago</span>
                    <span className="text-xs text-muted-foreground">
                      Cartão, PIX, Boleto
                    </span>
                  </button>

                  <button
                    onClick={() => setProvider('pix')}
                    className={`p-4 border-2 rounded-lg flex flex-col items-center gap-2 transition-colors ${
                      provider === 'pix'
                        ? 'border-green-500 bg-green-50 dark:bg-green-950'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <QrCode className="h-6 w-6" />
                    <span className="font-medium">PIX Direto</span>
                    <span className="text-xs text-muted-foreground">
                      QR Code
                    </span>
                  </button>
                </div>
              </div>

              {/* Parcelas (apenas MercadoPago) */}
              {provider === 'mercadopago' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Parcelamento</label>
                  <Select
                    value={String(installments)}
                    onValueChange={(v) => setInstallments(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 6, 10, 12].map(n => (
                        <SelectItem key={n} value={String(n)}>
                          {n}x de R$ {(transaction.amount / n).toFixed(2)}
                          {n === 1 ? ' (à vista)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Enviar por WhatsApp */}
              {transaction.patient?.phone && (
                <div className="flex items-center gap-3 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <input
                    type="checkbox"
                    id="sendWhatsApp"
                    checked={sendWhatsApp}
                    onChange={(e) => setSendWhatsApp(e.target.checked)}
                    className="h-4 w-4"
                  />
                  <label htmlFor="sendWhatsApp" className="text-sm cursor-pointer flex-1">
                    <Send className="inline h-4 w-4 mr-2" />
                    Enviar link automaticamente por WhatsApp para o paciente
                  </label>
                </div>
              )}

              {/* Botão de gerar */}
              <Button
                onClick={handleGeneratePayment}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? 'Gerando...' : '🚀 Gerar Link de Pagamento'}
              </Button>
            </>
          ) : (
            <>
              {/* Resultado do pagamento */}
              <Card className="border-green-500 bg-green-50 dark:bg-green-950">
                <CardHeader>
                  <CardTitle className="text-green-700 dark:text-green-300 flex items-center gap-2">
                    <CheckCircle className="h-5 w-5" />
                    Link Gerado com Sucesso!
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {paymentResult.paymentUrl && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Link de Pagamento:</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={paymentResult.paymentUrl}
                          readOnly
                          className="flex-1 p-2 border rounded text-sm"
                        />
                        <Button
                          onClick={() => copyToClipboard(paymentResult.paymentUrl)}
                          variant="outline"
                          size="sm"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                      <a
                        href={paymentResult.paymentUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        🔗 Abrir link em nova aba
                      </a>
                    </div>
                  )}

                  {paymentResult.qrCode && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">QR Code PIX:</label>
                      <div className="flex flex-col items-center gap-3 p-4 bg-white rounded-lg border">
                        <img
                          src={paymentResult.qrCode}
                          alt="QR Code PIX"
                          className="w-48 h-48"
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          Escaneie com o app do seu banco
                        </p>
                      </div>
                    </div>
                  )}

                  {paymentResult.qrCodeData && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Código PIX (Copia e Cola):</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={paymentResult.qrCodeData}
                          readOnly
                          className="flex-1 p-2 border rounded text-xs font-mono"
                        />
                        <Button
                          onClick={() => copyToClipboard(paymentResult.qrCodeData)}
                          variant="outline"
                          size="sm"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {sendWhatsApp && (
                    <div className="p-3 bg-green-100 dark:bg-green-900 rounded border border-green-300 dark:border-green-700">
                      <p className="text-sm text-green-800 dark:text-green-200">
                        ✅ Link enviado por WhatsApp para {transaction.patient?.name}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Button onClick={onClose} variant="outline" className="w-full">
                Fechar
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

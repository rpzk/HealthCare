'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Shield, ShieldCheck, AlertTriangle, Copy, Check } from 'lucide-react'

interface TwoFactorSetupProps {
  isEnabled: boolean
  onStatusChange: () => void
  embedded?: boolean // Quando true, não renderiza Card (para uso dentro de outro Card)
}

export function TwoFactorSetup({ isEnabled, onStatusChange, embedded = false }: TwoFactorSetupProps) {
  const [setupDialog, setSetupDialog] = useState(false)
  const [disableDialog, setDisableDialog] = useState(false)
  const [regenerateDialog, setRegenerateDialog] = useState(false)
  
  const [qrCode, setQrCode] = useState<string>('')
  const [secret, setSecret] = useState<string>('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [verificationToken, setVerificationToken] = useState('')
  const [password, setPassword] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [step, setStep] = useState<'qr' | 'verify' | 'backup'>('qr')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const startSetup = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST'
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao configurar 2FA')
      }
      
      const data = await response.json()
      setQrCode(data.qrCode)
      setSecret(data.secret)
      setBackupCodes(data.backupCodes)
      setStep('qr')
      setSetupDialog(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const verifyAndEnable = async () => {
    if (!verificationToken || verificationToken.length !== 6) {
      setError('Digite um código de 6 dígitos válido')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Código inválido')
      }
      
      setStep('backup')
      setVerificationToken('')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const finishSetup = () => {
    setSetupDialog(false)
    setStep('qr')
    setQrCode('')
    setSecret('')
    setBackupCodes([])
    onStatusChange()
  }

  const disableTwoFactor = async () => {
    if (!password) {
      setError('Digite sua senha')
      return
    }
    
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao desabilitar 2FA')
      }
      
      setDisableDialog(false)
      setPassword('')
      onStatusChange()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const regenerateCodes = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST'
      })
      
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Erro ao regenerar códigos')
      }
      
      const data = await response.json()
      setBackupCodes(data.backupCodes)
      setRegenerateDialog(true)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const copyAllCodes = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'))
    setCopiedIndex(-1)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const innerContent = (
    <div className={embedded ? 'space-y-4' : ''}>
      <div className={embedded ? 'flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2' : ''}>
        <div>
          <div className="font-semibold flex items-center gap-2">
              {isEnabled ? (
                <>
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                  Autenticação de Dois Fatores
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5 text-gray-400" />
                  Autenticação de Dois Fatores
                </>
              )}
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
              Adicione uma camada extra de segurança com código TOTP
            </p>
          </div>
          {isEnabled ? (
            <Badge variant="default" className="bg-green-600">
              <Check className="h-3 w-3 mr-1" />
              Habilitado
            </Badge>
          ) : (
            <Badge variant="secondary">Desabilitado</Badge>
          )}
        </div>
        <div className="space-y-4">
          {error && !setupDialog && !disableDialog && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          {!isEnabled ? (
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Use um aplicativo autenticador (Google Authenticator, Authy, 1Password, etc.) para gerar códigos de verificação.
              </p>
              <Button onClick={startSetup} disabled={loading}>
                {loading ? 'Configurando...' : 'Habilitar 2FA'}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-green-700 dark:text-green-400">
                ✓ Sua conta está protegida com autenticação de dois fatores
              </p>
              <div className="flex gap-2">
                <Button onClick={regenerateCodes} variant="outline" size="sm" disabled={loading}>
                  Gerar Novos Códigos de Backup
                </Button>
                <Button onClick={() => setDisableDialog(true)} variant="destructive" size="sm">
                  Desabilitar 2FA
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
  )

  return (
    <>
      {embedded ? (
        innerContent
      ) : (
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle className="flex items-center gap-2">
                {isEnabled ? (
                  <>
                    <ShieldCheck className="h-5 w-5 text-green-600" />
                    Autenticação de Dois Fatores
                  </>
                ) : (
                  <>
                    <Shield className="h-5 w-5 text-gray-400" />
                    Autenticação de Dois Fatores
                  </>
                )}
              </CardTitle>
              <CardDescription>
                Adicione uma camada extra de segurança com código TOTP
              </CardDescription>
            </div>
            {isEnabled ? (
              <Badge variant="default" className="bg-green-600">
                <Check className="h-3 w-3 mr-1" />
                Habilitado
              </Badge>
            ) : (
              <Badge variant="secondary">Desabilitado</Badge>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {error && !setupDialog && !disableDialog && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            {!isEnabled ? (
              <div>
                <p className="text-sm text-muted-foreground mb-4">
                  Use um aplicativo autenticador (Google Authenticator, Authy, 1Password, etc.) para gerar códigos de verificação.
                </p>
                <Button onClick={startSetup} disabled={loading}>
                  {loading ? 'Configurando...' : 'Habilitar 2FA'}
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-green-700 dark:text-green-400">
                  ✓ Sua conta está protegida com autenticação de dois fatores
                </p>
                <div className="flex gap-2">
                  <Button onClick={regenerateCodes} variant="outline" size="sm" disabled={loading}>
                    Gerar Novos Códigos de Backup
                  </Button>
                  <Button onClick={() => setDisableDialog(true)} variant="destructive" size="sm">
                    Desabilitar 2FA
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Setup Dialog */}
      <Dialog open={setupDialog} onOpenChange={setSetupDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {step === 'qr' && 'Configure seu Autenticador'}
              {step === 'verify' && 'Verifique o Código'}
              {step === 'backup' && 'Códigos de Backup'}
            </DialogTitle>
            <DialogDescription>
              {step === 'qr' && 'Escaneie o QR Code com seu aplicativo autenticador'}
              {step === 'verify' && 'Digite o código de 6 dígitos do aplicativo'}
              {step === 'backup' && 'Salve estes códigos em local seguro'}
            </DialogDescription>
          </DialogHeader>

          {step === 'qr' && (
            <div className="space-y-4">
              {qrCode && (
                <div className="flex justify-center">
                  {/* img nativo: data URLs não funcionam bem com Next/Image no Firefox */}
                  <img src={qrCode} alt="QR Code para app autenticador" width={200} height={200} className="rounded" />
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Ou digite manualmente:</label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 text-xs bg-muted p-2 rounded">{secret}</code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(secret, -2)}
                  >
                    {copiedIndex === -2 ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <Button onClick={() => setStep('verify')} className="w-full">
                Continuar
              </Button>
            </div>
          )}

          {step === 'verify' && (
            <div className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div>
                <label className="text-sm font-medium">Código de Verificação</label>
                <Input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationToken}
                  onChange={(e) => setVerificationToken(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="text-center text-2xl tracking-widest"
                />
              </div>
              <Button onClick={verifyAndEnable} disabled={loading} className="w-full">
                {loading ? 'Verificando...' : 'Verificar e Habilitar'}
              </Button>
            </div>
          )}

          {step === 'backup' && (
            <div className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Guarde estes códigos em local seguro. Cada um pode ser usado apenas uma vez se você perder acesso ao autenticador.
                </AlertDescription>
              </Alert>
              <div className="bg-muted p-4 rounded-lg space-y-2 max-h-64 overflow-y-auto">
                {backupCodes.map((code, index) => (
                  <div key={index} className="flex items-center justify-between gap-2">
                    <code className="text-sm">{code}</code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => copyToClipboard(code, index)}
                    >
                      {copiedIndex === index ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                    </Button>
                  </div>
                ))}
              </div>
              <Button onClick={copyAllCodes} variant="outline" className="w-full">
                {copiedIndex === -1 ? 'Copiado!' : 'Copiar Todos os Códigos'}
              </Button>
              <Button onClick={finishSetup} className="w-full">
                Concluir
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable Dialog */}
      <Dialog open={disableDialog} onOpenChange={setDisableDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Desabilitar 2FA</DialogTitle>
            <DialogDescription>
              Digite sua senha para confirmar a desabilitação da autenticação de dois fatores.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <div>
            <label className="text-sm font-medium">Senha</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Digite sua senha"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDisableDialog(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={disableTwoFactor} disabled={loading}>
              {loading ? 'Desabilitando...' : 'Desabilitar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate Codes Dialog */}
      <Dialog open={regenerateDialog} onOpenChange={setRegenerateDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novos Códigos de Backup</DialogTitle>
            <DialogDescription>
              Os códigos anteriores foram invalidados. Salve estes novos códigos em local seguro.
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Estes códigos substituíram os anteriores. Atualize onde você os guardou.
            </AlertDescription>
          </Alert>
          <div className="bg-muted p-4 rounded-lg space-y-2 max-h-64 overflow-y-auto">
            {backupCodes.map((code, index) => (
              <div key={index} className="flex items-center justify-between gap-2">
                <code className="text-sm">{code}</code>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => copyToClipboard(code, index)}
                >
                  {copiedIndex === index ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button onClick={copyAllCodes} variant="outline">
              {copiedIndex === -1 ? 'Copiado!' : 'Copiar Todos'}
            </Button>
            <Button onClick={() => setRegenerateDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

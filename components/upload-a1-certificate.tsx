'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { toastApiError } from '@/lib/toast-api-error'

export function UploadA1Certificate({ onSuccess }: { onSuccess?: () => void }) {
  const [uploading, setUploading] = useState(false)
  const [password, setPassword] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleUpload = async () => {
    if (!file || !password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Selecione o arquivo .pfx e informe a senha',
        variant: 'destructive',
      })
      return
    }

    try {
      setUploading(true)

      const formData = new FormData()
      formData.append('file', file)
      formData.append('password', password)

      const response = await fetch('/api/certificates/upload-a1', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        toastApiError(data, 'Erro ao fazer upload')
        return
      }

      toast({
        title: 'Certificado carregado! ✅',
        description: 'Seu certificado A1 foi configurado com sucesso',
      })

      // Limpar form
      setFile(null)
      setPassword('')
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

      if (onSuccess) {
        onSuccess()
      }

    } catch (error) {
      console.error('Erro ao fazer upload:', error)
      toast({
        title: 'Erro ao carregar certificado',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader className="bg-blue-50/50 dark:bg-blue-950/20">
        <div className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-blue-600" />
          <CardTitle>Carregar Certificado Digital A1</CardTitle>
        </div>
        <CardDescription>
          Faça upload do seu certificado ICP-Brasil (.pfx ou .p12) para assinar documentos digitalmente
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-6">
        <div>
          <Label htmlFor="pfx-file">Arquivo .pfx ou .p12</Label>
          <Input
            id="pfx-file"
            ref={fileInputRef}
            type="file"
            accept=".pfx,.p12"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            disabled={uploading}
          />
          {file && (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Arquivo selecionado: {file.name}
            </p>
          )}
        </div>

        <div>
          <Label htmlFor="pfx-password">Senha do Certificado</Label>
          <Input
            id="pfx-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Digite a senha do certificado"
            disabled={uploading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            A senha não será armazenada - você precisará digitá-la a cada assinatura
          </p>
        </div>

        <Button
          onClick={handleUpload}
          disabled={uploading || !file || !password}
          className="w-full"
          size="lg"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando e validando certificado...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Carregar Certificado
            </>
          )}
        </Button>

        <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 space-y-1 text-xs">
          <p className="font-medium text-blue-900 dark:text-blue-300 mb-2">ℹ️ O que acontece ao carregar:</p>
          <p className="text-blue-800 dark:text-blue-400">✅ Certificado é validado e armazenado com segurança</p>
          <p className="text-blue-800 dark:text-blue-400">✅ Certificados antigos são desativados automaticamente</p>
          <p className="text-blue-800 dark:text-blue-400">✅ Apenas você pode usar seu certificado</p>
          <p className="text-blue-800 dark:text-blue-400">✅ A senha será solicitada a cada assinatura</p>
        </div>
      </CardContent>
    </Card>
  )
}

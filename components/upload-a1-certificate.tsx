'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Upload, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

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

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer upload')
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
    <Card>
      <CardHeader>
        <CardTitle>Certificado Digital A1</CardTitle>
        <CardDescription>
          Faça upload do seu certificado ICP-Brasil para assinar documentos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
        </div>

        <Button
          onClick={handleUpload}
          disabled={uploading || !file || !password}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Carregando certificado...
            </>
          ) : (
            <>
              <Upload className="mr-2 h-4 w-4" />
              Carregar Certificado
            </>
          )}
        </Button>

        <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
          <p>✅ Seu certificado ficará armazenado de forma segura</p>
          <p>✅ A senha não é armazenada (será solicitada a cada assinatura)</p>
          <p>✅ Apenas você pode usar seu certificado</p>
        </div>
      </CardContent>
    </Card>
  )
}

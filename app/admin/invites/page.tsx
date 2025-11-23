"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Loader2, Copy, Check, Mail, Link as LinkIcon } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const ROLES = [
  { value: 'PATIENT', label: 'Paciente' },
  { value: 'DOCTOR', label: 'Médico' },
  { value: 'NURSE', label: 'Enfermeiro' },
  { value: 'RECEPTIONIST', label: 'Recepcionista' },
  { value: 'PHYSIOTHERAPIST', label: 'Fisioterapeuta' },
  { value: 'PSYCHOLOGIST', label: 'Psicólogo' },
  { value: 'HEALTH_AGENT', label: 'Agente de Saúde' },
  { value: 'DENTIST', label: 'Dentista' },
  { value: 'NUTRITIONIST', label: 'Nutricionista' },
  { value: 'SOCIAL_WORKER', label: 'Assistente Social' },
  { value: 'ADMIN', label: 'Administrador' },
]

export default function InvitesPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState('PATIENT')
  const [generatedLink, setGeneratedLink] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setGeneratedLink('')
    setCopied(false)

    try {
      const response = await fetch('/api/invites/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role })
      })

      if (!response.ok) {
        throw new Error('Falha ao gerar convite')
      }

      const data = await response.json()
      setGeneratedLink(data.link)
      toast({
        title: "Convite gerado!",
        description: "O link foi criado com sucesso.",
      })
    } catch (error) {
      console.error(error)
      toast({
        title: "Erro",
        description: "Não foi possível gerar o convite.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    toast({
      title: "Copiado!",
      description: "Link copiado para a área de transferência.",
    })
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="container mx-auto py-10 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Gerador de Convites</h1>
        <p className="text-muted-foreground mt-2">
          Gere links de cadastro para novos pacientes ou profissionais. 
          Eles poderão preencher seus dados e aceitar os termos de uso.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo Convite</CardTitle>
          <CardDescription>
            Preencha o email e o tipo de usuário para gerar um link único.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGenerate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email do Destinatário</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="exemplo@email.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Tipo de Usuário</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Gerando...
                </>
              ) : (
                <>
                  <LinkIcon className="mr-2 h-4 w-4" /> Gerar Link de Convite
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {generatedLink && (
        <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Convite Gerado com Sucesso!</AlertTitle>
            <AlertDescription className="mt-2">
              <p className="text-green-700 mb-2">
                Envie o link abaixo para o usuário completar o cadastro:
              </p>
              <div className="flex items-center gap-2 mt-2">
                <code className="relative rounded bg-white px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold border border-green-200 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                  {generatedLink}
                </code>
                <Button
                  size="icon"
                  variant="outline"
                  className="h-8 w-8 shrink-0 bg-white hover:bg-green-100 border-green-200"
                  onClick={copyToClipboard}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4 text-gray-500" />
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}

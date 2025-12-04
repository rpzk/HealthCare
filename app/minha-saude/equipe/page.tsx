'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, UserCheck, Phone, Mail, Stethoscope, AlertCircle, ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Profissional {
  id: string
  nome: string
  email: string
  telefone?: string
  especialidade?: string
  cargo: string
}

interface MembroEquipe {
  id: string
  profissional: Profissional
  tipo: string
  principal: boolean
  motivo?: string
  desde: string
}

interface EquipeCuidado {
  medicoResponsavel?: Profissional
  equipeCuidado: MembroEquipe[]
  totalMembros: number
}

export default function EquipeCuidadoPage() {
  const router = useRouter()
  const [data, setData] = useState<EquipeCuidado | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchEquipe()
  }, [])

  const fetchEquipe = async () => {
    try {
      const response = await fetch('/api/patients/me/care-team')
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Erro ao carregar equipe')
      }
      const result = await response.json()
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido')
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase()
  }

  const getBadgeVariant = (tipo: string) => {
    switch (tipo) {
      case 'Acesso Total': return 'default'
      case 'Consulta': return 'secondary'
      case 'Limitado': return 'outline'
      case 'Emergência': return 'destructive'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Skeleton className="h-8 w-64 mb-6" />
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <Card className="border-destructive">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-lg font-medium text-destructive">{error}</p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => router.push('/minha-saude')}
            >
              Voltar ao Início
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => router.push('/minha-saude')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6 text-primary" />
            Minha Equipe de Cuidado
          </h1>
          <p className="text-muted-foreground">
            Profissionais que cuidam da sua saúde
          </p>
        </div>
      </div>

      {/* Médico Responsável */}
      {data?.medicoResponsavel && (
        <Card className="mb-6 border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-primary" />
              Médico Responsável
            </CardTitle>
            <CardDescription>
              Seu médico principal de referência
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg bg-primary text-primary-foreground">
                  {getInitials(data.medicoResponsavel.nome)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">
                  {data.medicoResponsavel.nome}
                </h3>
                {data.medicoResponsavel.especialidade && (
                  <p className="text-muted-foreground flex items-center gap-1">
                    <Stethoscope className="h-4 w-4" />
                    {data.medicoResponsavel.especialidade}
                  </p>
                )}
                <div className="flex flex-wrap gap-4 mt-2 text-sm">
                  {data.medicoResponsavel.telefone && (
                    <a 
                      href={`tel:${data.medicoResponsavel.telefone}`}
                      className="flex items-center gap-1 text-primary hover:underline"
                    >
                      <Phone className="h-4 w-4" />
                      {data.medicoResponsavel.telefone}
                    </a>
                  )}
                  <a 
                    href={`mailto:${data.medicoResponsavel.email}`}
                    className="flex items-center gap-1 text-primary hover:underline"
                  >
                    <Mail className="h-4 w-4" />
                    {data.medicoResponsavel.email}
                  </a>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Equipe de Cuidado */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Equipe de Atendimento
          </CardTitle>
          <CardDescription>
            Profissionais com acesso ao seu prontuário
          </CardDescription>
        </CardHeader>
        <CardContent>
          {data?.equipeCuidado && data.equipeCuidado.length > 0 ? (
            <div className="space-y-4">
              {data.equipeCuidado.map((membro) => (
                <div 
                  key={membro.id}
                  className="flex items-start gap-4 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {getInitials(membro.profissional.nome)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-medium">{membro.profissional.nome}</h4>
                      {membro.principal && (
                        <Badge variant="default" className="text-xs">Principal</Badge>
                      )}
                      <Badge variant={getBadgeVariant(membro.tipo)} className="text-xs">
                        {membro.tipo}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {membro.profissional.cargo}
                      {membro.profissional.especialidade && ` • ${membro.profissional.especialidade}`}
                    </p>
                    {membro.motivo && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {membro.motivo}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      Desde {format(new Date(membro.desde), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    {membro.profissional.telefone && (
                      <a 
                        href={`tel:${membro.profissional.telefone}`}
                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                      >
                        <Phone className="h-3 w-3" />
                        {membro.profissional.telefone}
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum profissional na sua equipe ainda.</p>
              <p className="text-sm mt-1">
                Quando você agendar consultas, os profissionais serão adicionados automaticamente.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="mt-6 bg-muted/30">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            <strong>💡 Você sabia?</strong> Apenas os profissionais listados aqui podem 
            acessar seu prontuário médico. Quando você agenda uma consulta, o profissional 
            é automaticamente adicionado à sua equipe de cuidado com o nível de acesso 
            adequado.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

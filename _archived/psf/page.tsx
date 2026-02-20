"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Building, Users, MapPin, Calendar, Target } from "lucide-react"
import Link from "next/link"
import { MicroAreasOverlayMap } from "@/components/map/micro-areas-overlay"
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'

interface MicroArea {
  id: string
  name: string
  code?: string
  description?: string
  centroidLat?: number | null
  centroidLng?: number | null
}

export default function PSFPage() {
  const [microAreas, setMicroAreas] = useState<MicroArea[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/micro-areas')
        if (res.ok) {
          const data = await res.json()
          setMicroAreas(data || [])
        }
      } catch (err) {
        console.error('Erro ao carregar micro-áreas', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const totalAreas = microAreas.length
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 ml-64 p-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Saúde da Família (PSF)</h1>
              <p className="text-muted-foreground">
                Gestão de territórios, famílias e visitas domiciliares.
              </p>
            </div>
          </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Famílias Cadastradas
            </CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">
                Não disponível
              </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pessoas Acompanhadas
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">
                Não disponível
              </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Visitas no Mês
            </CardTitle>
            <MapPin className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">
                Não disponível
              </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Agendamentos
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">
                Não disponível
              </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Mapa do Território</CardTitle>
            <CardDescription>Baseado nas micro-áreas cadastradas</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[320px] bg-muted/40 rounded-md border p-2">
              {loading ? (
                <div className="h-full flex items-center justify-center text-muted-foreground">Carregando mapa...</div>
              ) : totalAreas === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-sm">
                  Nenhuma micro-área cadastrada.
                  <Link className="underline" href="/micro-areas">Cadastrar agora</Link>.
                </div>
              ) : (
                <MicroAreasOverlayMap heightClass="h-[300px]" />
              )}
            </div>
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Micro-áreas</CardTitle>
            <CardDescription>Lista rápida para navegação</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
            {loading ? (
              <p className="text-muted-foreground">Carregando micro-áreas...</p>
            ) : totalAreas === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhuma micro-área cadastrada.</p>
            ) : (
              microAreas.map((area) => (
                <div key={area.id} className="p-3 bg-white rounded-md shadow-sm border flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{area.name} {area.code ? `(${area.code})` : ''}</p>
                    {area.description && (
                      <p className="text-sm text-muted-foreground">{area.description}</p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground text-right">
                    {area.centroidLat && area.centroidLng ? (
                      <span>Centro: {area.centroidLat.toFixed(4)}, {area.centroidLng.toFixed(4)}</span>
                    ) : (
                      <span>Sem coordenadas</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Link href="/psf/families/new" className="flex items-center p-2 hover:bg-muted rounded-md transition-colors">
                <Building className="mr-2 h-4 w-4" />
                <span>Cadastrar Nova Família</span>
              </Link>
              <Link href="/psf/visits/new" className="flex items-center p-2 hover:bg-muted rounded-md transition-colors">
                <MapPin className="mr-2 h-4 w-4" />
                <span>Registrar Visita Domiciliar</span>
              </Link>
              <Link href="/micro-areas" className="flex items-center p-2 hover:bg-muted rounded-md transition-colors">
                <Target className="mr-2 h-4 w-4" />
                <span>Gerenciar Micro-áreas</span>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
        </main>
      </div>
    </div>
  )
}

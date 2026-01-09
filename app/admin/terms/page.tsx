'use client'

import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Markdown } from '@/components/ui/markdown'
import { Loader2, Plus, RefreshCcw, CheckCircle2 } from 'lucide-react'

type TermVersion = {
  id: string
  slug: string
  title: string
  content: string
  version: string
  isActive: boolean
  audience: 'ALL' | 'PATIENT' | 'PROFESSIONAL'
  createdAt: string
  updatedAt: string
  acceptancesCount: number
}

type TermGroup = {
  slug: string
  activeId: string | null
  versions: TermVersion[]
}

function formatDateTime(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleString('pt-BR')
}

export default function AdminTermsPage() {
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [groups, setGroups] = useState<TermGroup[]>([])
  const [filter, setFilter] = useState('')

  const [creating, setCreating] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [createSlug, setCreateSlug] = useState('')
  const [createTitle, setCreateTitle] = useState('')
  const [createVersion, setCreateVersion] = useState('')
  const [createContent, setCreateContent] = useState('')
  const [createActivate, setCreateActivate] = useState(true)
  const [createAudience, setCreateAudience] = useState<'ALL' | 'PATIENT' | 'PROFESSIONAL'>('ALL')

  const [activatingId, setActivatingId] = useState<string | null>(null)
  const [viewing, setViewing] = useState<TermVersion | null>(null)

  const load = async () => {
    try {
      const res = await fetch('/api/admin/terms')
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Erro ao carregar termos')
        return
      }
      setGroups(Array.isArray(data?.terms) ? data.terms : [])
    } catch (e) {
      console.error(e)
      toast.error('Erro ao carregar termos')
    }
  }

  useEffect(() => {
    ;(async () => {
      setLoading(true)
      await load()
      setLoading(false)
    })()
  }, [])

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return groups
    return groups
      .map((g) => ({
        ...g,
        versions: g.versions.filter((v) =>
          [v.slug, v.title, v.version].some((x) => x.toLowerCase().includes(q))
        ),
      }))
      .filter((g) => g.versions.length > 0)
  }, [groups, filter])

  const openCreateForGroup = (g: TermGroup) => {
    const latest = g.versions[0]
    setCreateSlug(g.slug)
    setCreateTitle(latest?.title || '')
    setCreateVersion('')
    setCreateContent(latest?.content || '')
    setCreateActivate(true)
    setCreateAudience(latest?.audience || 'ALL')
    setCreateOpen(true)
  }

  const handleRefresh = async () => {
    try {
      setRefreshing(true)
      await load()
      toast.success('Lista atualizada')
    } finally {
      setRefreshing(false)
    }
  }

  const handleActivate = async (id: string) => {
    try {
      setActivatingId(id)
      const res = await fetch('/api/admin/terms/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Erro ao ativar')
        return
      }
      toast.success('Versão ativada')
      await load()
    } catch (e) {
      console.error(e)
      toast.error('Erro ao ativar')
    } finally {
      setActivatingId(null)
    }
  }

  const handleCreate = async () => {
    if (!createSlug.trim() || !createTitle.trim() || !createVersion.trim() || !createContent.trim()) {
      toast.error('Preencha slug, título, versão e conteúdo')
      return
    }

    try {
      setCreating(true)
      const res = await fetch('/api/admin/terms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: createSlug.trim(),
          title: createTitle.trim(),
          version: createVersion.trim(),
          content: createContent,
          audience: createAudience,
          activate: createActivate,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data?.error || 'Erro ao criar termo')
        return
      }

      toast.success('Nova versão criada')
      setCreateOpen(false)
      setCreateVersion('')
      setCreateContent('')
      await load()
    } catch (e) {
      console.error(e)
      toast.error('Erro ao criar termo')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Termos e Versionamento</h1>
          <p className="text-muted-foreground">
            Crie versões auditáveis de Termos/Políticas e defina qual versão está ativa.
          </p>
        </div>

        <div className="flex gap-2">
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> Nova versão
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Criar nova versão</DialogTitle>
                <DialogDescription>
                  Para manter auditoria, crie uma nova versão em vez de editar versões antigas.
                </DialogDescription>
              </DialogHeader>

              <div className="grid grid-cols-1 gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="slug">Slug (identificador)</Label>
                    <Input id="slug" value={createSlug} onChange={(e) => setCreateSlug(e.target.value)} placeholder="terms-of-use" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="version">Versão</Label>
                    <Input id="version" value={createVersion} onChange={(e) => setCreateVersion(e.target.value)} placeholder="1.1" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Público</Label>
                  <Select value={createAudience} onValueChange={(v) => setCreateAudience(v as 'ALL' | 'PATIENT' | 'PROFESSIONAL')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">Todos</SelectItem>
                      <SelectItem value="PATIENT">Paciente</SelectItem>
                      <SelectItem value="PROFESSIONAL">Profissional</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="title">Título</Label>
                  <Input id="title" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} placeholder="Termos de Uso" />
                </div>

                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="content">Conteúdo (Markdown ou texto)</Label>
                    <Textarea
                      id="content"
                      value={createContent}
                      onChange={(e) => setCreateContent(e.target.value)}
                      rows={14}
                      placeholder="Cole aqui o texto oficial aprovado pela clínica"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Pré-visualização</Label>
                    <div className="max-h-[30vh] overflow-auto rounded-md border bg-muted p-3">
                      <Markdown content={createContent || ''} className="text-sm" />
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <p className="font-medium">Ativar esta versão</p>
                    <p className="text-sm text-muted-foreground">Se ativo, desativa outras versões do mesmo slug.</p>
                  </div>
                  <Button
                    type="button"
                    variant={createActivate ? 'default' : 'outline'}
                    onClick={() => setCreateActivate((v) => !v)}
                  >
                    {createActivate ? 'Ativa' : 'Inativa'}
                  </Button>
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={creating}>
                  Cancelar
                </Button>
                <Button onClick={handleCreate} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                  Criar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={handleRefresh} disabled={refreshing}>
            {refreshing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCcw className="h-4 w-4 mr-2" />}
            Atualizar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Busca</CardTitle>
          <CardDescription>Filtre por slug, título ou versão.</CardDescription>
        </CardHeader>
        <CardContent>
          <Input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Ex.: terms-of-use, privacidade, 2.0..." />
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Nenhum termo encontrado</CardTitle>
            <CardDescription>
              Crie a primeira versão para começar. Sugestões de slugs: <Badge variant="secondary">terms-of-use</Badge>{' '}
              <Badge variant="secondary">privacy-policy</Badge>
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((g) => (
            <Card key={g.slug}>
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <span className="font-mono text-sm">{g.slug}</span>
                    {g.activeId ? <Badge>Ativo</Badge> : <Badge variant="secondary">Sem ativo</Badge>}
                  </CardTitle>
                  <CardDescription>
                    {g.versions.length} versão(ões)
                  </CardDescription>
                </div>
                <Button variant="outline" onClick={() => openCreateForGroup(g)}>
                  <Plus className="h-4 w-4 mr-2" /> Nova versão deste slug
                </Button>
              </CardHeader>

              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 gap-2">
                  {g.versions.map((v) => (
                    <div key={v.id} className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{v.title}</span>
                          <Badge variant="secondary">v{v.version}</Badge>
                          {v.isActive ? <Badge>Ativa</Badge> : <Badge variant="outline">Inativa</Badge>}
                          {v.audience !== 'ALL' ? (
                            <Badge variant="outline">{v.audience === 'PATIENT' ? 'Paciente' : 'Profissional'}</Badge>
                          ) : null}
                          <Badge variant="outline">Aceites: {v.acceptancesCount}</Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Criado: {formatDateTime(v.createdAt)} • Atualizado: {formatDateTime(v.updatedAt)}
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => setViewing(v)}>
                          Ver texto
                        </Button>
                        <Button
                          size="sm"
                          variant={v.isActive ? 'secondary' : 'default'}
                          onClick={() => handleActivate(v.id)}
                          disabled={v.isActive || activatingId === v.id}
                        >
                          {activatingId === v.id ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                          Ativar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          <Dialog open={!!viewing} onOpenChange={(open) => { if (!open) setViewing(null) }}>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Conteúdo do termo</DialogTitle>
                <DialogDescription>
                  {viewing ? (
                    <>
                      <span className="font-mono">{viewing.slug}</span> • v{viewing.version}
                    </>
                  ) : null}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {viewing?.isActive ? <Badge>Ativa</Badge> : <Badge variant="outline">Inativa</Badge>}
                  {viewing?.audience && viewing.audience !== 'ALL' ? (
                    <Badge variant="outline">{viewing.audience === 'PATIENT' ? 'Paciente' : 'Profissional'}</Badge>
                  ) : null}
                  {typeof viewing?.acceptancesCount === 'number' ? (
                    <Badge variant="outline">Aceites: {viewing.acceptancesCount}</Badge>
                  ) : null}
                </div>
                <div className="max-h-[60vh] overflow-auto rounded-md border bg-muted p-3">
                  <Markdown content={viewing?.content ?? ''} className="text-sm" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setViewing(null)}>
                  Fechar
                </Button>
                <Button
                  onClick={() => {
                    if (!viewing) return
                    setCreateSlug(viewing.slug)
                    setCreateTitle(viewing.title)
                    setCreateVersion('')
                    setCreateContent(viewing.content)
                    setCreateActivate(true)
                    setCreateAudience(viewing.audience || 'ALL')
                    setCreateOpen(true)
                    setViewing(null)
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" /> Criar nova versão a partir desta
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}

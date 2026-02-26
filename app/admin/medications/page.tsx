'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Pill, ArrowLeft, Plus, Search, Loader2, Pencil, Trash2 } from 'lucide-react'
import { toast } from '@/hooks/use-toast'

const PRESCRIPTION_TYPES = [
  { value: 'SIMPLE', label: 'Simples' },
  { value: 'ANTIMICROBIAL', label: 'Antimicrobiano' },
  { value: 'CONTROLLED_A', label: 'Controlado A (Amarela)' },
  { value: 'CONTROLLED_B', label: 'Controlado B (Azul)' },
  { value: 'CONTROLLED_B2', label: 'Controlado B2' },
  { value: 'CONTROLLED_C1', label: 'Controle Especial C1' },
  { value: 'CONTROLLED_C2', label: 'Retinoides C2' },
  { value: 'CONTROLLED_C4', label: 'Antirretroviral C4' },
  { value: 'CONTROLLED_C5', label: 'Anabolizante C5' },
  { value: 'CONTROLLED_TALIDOMIDA', label: 'Talidomida' },
]

interface Medication {
  id: string
  name: string
  synonym?: string | null
  tradeName?: string | null
  prescriptionType: string
  susCode?: string | null
  route?: string | null
  form?: string | null
  active: boolean
}

export default function AdminMedicationsPage() {
  const [items, setItems] = useState<Medication[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [prescriptionFilter, setPrescriptionFilter] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Medication | null>(null)
  const [form, setForm] = useState({
    name: '',
    synonym: '',
    tradeName: '',
    prescriptionType: 'SIMPLE',
    susCode: '',
    route: '',
    form: '',
    instructions: '',
    active: true,
  })
  const [stats, setStats] = useState<{ total?: number } | null>(null)

  const limit = 25

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (search.trim()) params.set('q', search.trim())
      if (includeInactive) params.set('includeInactive', 'true')
      if (prescriptionFilter) params.set('prescriptionType', prescriptionFilter)
      const res = await fetch(`/api/admin/medications?${params}`)
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setItems(data.items)
      setTotal(data.total)
    } catch {
      toast({ title: 'Erro', description: 'Falha ao carregar medicamentos', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [page, search, includeInactive, prescriptionFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    fetch('/api/medications/stats')
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setStats(d))
      .catch(() => {})
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({
      name: '',
      synonym: '',
      tradeName: '',
      prescriptionType: 'SIMPLE',
      susCode: '',
      route: '',
      form: '',
      instructions: '',
      active: true,
    })
    setDialogOpen(true)
  }

  const openEdit = (m: Medication) => {
    setEditing(m)
    setForm({
      name: m.name,
      synonym: m.synonym || '',
      tradeName: m.tradeName || '',
      prescriptionType: m.prescriptionType,
      susCode: m.susCode || '',
      route: m.route || '',
      form: m.form || '',
      instructions: '',
      active: m.active,
    })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.name.trim()) {
      toast({ title: 'Nome obrigatório', variant: 'destructive' })
      return
    }
    try {
      if (editing) {
        const res = await fetch(`/api/admin/medications/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            synonym: form.synonym.trim() || null,
            tradeName: form.tradeName.trim() || null,
            prescriptionType: form.prescriptionType,
            susCode: form.susCode.trim() || null,
            route: form.route.trim() || null,
            form: form.form.trim() || null,
            instructions: form.instructions.trim() || null,
            active: form.active,
          }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Erro')
        toast({ title: 'Medicamento atualizado' })
      } else {
        const res = await fetch('/api/admin/medications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: form.name.trim(),
            synonym: form.synonym.trim() || null,
            tradeName: form.tradeName.trim() || null,
            prescriptionType: form.prescriptionType,
            susCode: form.susCode.trim() || null,
            route: form.route.trim() || null,
            form: form.form.trim() || null,
            instructions: form.instructions.trim() || null,
            active: form.active,
          }),
        })
        if (!res.ok) throw new Error((await res.json()).error || 'Erro')
        toast({ title: 'Medicamento criado' })
      }
      setDialogOpen(false)
      load()
    } catch (e) {
      toast({ title: 'Erro', description: String((e as Error).message), variant: 'destructive' })
    }
  }

  const deactivate = async (m: Medication) => {
    if (!confirm(`Desativar "${m.name}"?`)) return
    try {
      const res = await fetch(`/api/admin/medications/${m.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Erro')
      toast({ title: 'Medicamento desativado' })
      load()
    } catch {
      toast({ title: 'Erro ao desativar', variant: 'destructive' })
    }
  }

  const totalPages = Math.ceil(total / limit)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link
            href="/admin/master-data"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="h-4 w-4" /> Dados Mestres
          </Link>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Pill className="h-6 w-6" />
            Catálogo de Medicamentos
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {stats?.total != null ? `${stats.total} medicamentos ativos` : 'Carregando...'} no banco
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, sinônimo, Código SUS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={prescriptionFilter} onValueChange={setPrescriptionFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Tipo de receita" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                {PRESCRIPTION_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
              />
              Incluir inativos
            </label>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div className="rounded-md border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-3 font-medium">Nome</th>
                      <th className="text-left p-3 font-medium hidden md:table-cell">Tipo</th>
                      <th className="text-left p-3 font-medium hidden lg:table-cell">Via/Forma</th>
                      <th className="text-left p-3 w-24">Status</th>
                      <th className="text-right p-3 w-24">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((m) => (
                      <tr key={m.id} className="border-b hover:bg-muted/30">
                        <td className="p-3">
                          <div className="font-medium">{m.name}</div>
                          {(m.synonym || m.tradeName) && (
                            <div className="text-xs text-muted-foreground truncate max-w-[200px]">
                              {[m.synonym, m.tradeName].filter(Boolean).join(' • ')}
                            </div>
                          )}
                        </td>
                        <td className="p-3 hidden md:table-cell">
                          <Badge variant="outline" className="text-xs">
                            {PRESCRIPTION_TYPES.find((t) => t.value === m.prescriptionType)?.label || m.prescriptionType}
                          </Badge>
                        </td>
                        <td className="p-3 hidden lg:table-cell text-muted-foreground">
                          {[m.route, m.form].filter(Boolean).join(' / ') || '—'}
                        </td>
                        <td className="p-3">
                          {m.active ? (
                            <Badge variant="default" className="bg-green-600">Ativo</Badge>
                          ) : (
                            <Badge variant="secondary">Inativo</Badge>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => openEdit(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {m.active && (
                            <Button variant="ghost" size="sm" onClick={() => deactivate(m)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {total === 0 && (
                <p className="text-center py-8 text-muted-foreground">
                  Nenhum medicamento encontrado. Use &quot;Novo&quot; para adicionar ou importe via CSV.
                </p>
              )}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-sm text-muted-foreground">
                    {total} registro(s) • Página {page} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Próxima
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar medicamento' : 'Novo medicamento'}</DialogTitle>
            <DialogDescription>
              Preencha os campos principais. Outros podem ser editados via importação.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="name">Nome *</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex: Paracetamol"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Sinônimo</Label>
                <Input
                  value={form.synonym}
                  onChange={(e) => setForm((f) => ({ ...f, synonym: e.target.value }))}
                  placeholder="Nome alternativo"
                />
              </div>
              <div>
                <Label>Nome comercial</Label>
                <Input
                  value={form.tradeName}
                  onChange={(e) => setForm((f) => ({ ...f, tradeName: e.target.value }))}
                  placeholder="Ex: Tylenol"
                />
              </div>
            </div>
            <div>
              <Label>Tipo de receita</Label>
              <Select value={form.prescriptionType} onValueChange={(v) => setForm((f) => ({ ...f, prescriptionType: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRESCRIPTION_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Código SUS</Label>
                <Input
                  value={form.susCode}
                  onChange={(e) => setForm((f) => ({ ...f, susCode: e.target.value }))}
                />
              </div>
              <div>
                <Label>Via</Label>
                <Input
                  value={form.route}
                  onChange={(e) => setForm((f) => ({ ...f, route: e.target.value }))}
                  placeholder="Oral, IM, etc"
                />
              </div>
            </div>
            <div>
              <Label>Forma farmacêutica</Label>
              <Input
                value={form.form}
                onChange={(e) => setForm((f) => ({ ...f, form: e.target.value }))}
                placeholder="Comprimido, solução, etc"
              />
            </div>
            {editing && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                />
                Ativo
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={save}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

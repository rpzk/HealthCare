'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from '@/hooks/use-toast'
import { Loader2, Users } from 'lucide-react'

type UserItem = {
  id: string
  name: string | null
  email: string | null
  role: string
  managerUserId: string | null
  manager?: { id: string; name: string | null; email: string | null } | null
}

function labelUser(u: UserItem) {
  const name = (u.name || '').trim()
  const email = (u.email || '').trim()
  const base = name || email || u.id
  return `${base}${email && name ? ` (${email})` : ''} — ${u.role}`
}

export function OrgManagerAdmin() {
  const [userSearch, setUserSearch] = useState('')
  const [managerSearch, setManagerSearch] = useState('')
  const [userResults, setUserResults] = useState<UserItem[]>([])
  const [managerResults, setManagerResults] = useState<UserItem[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>('')
  const [selectedManagerId, setSelectedManagerId] = useState<string>('')
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [loadingManagers, setLoadingManagers] = useState(false)
  const [saving, setSaving] = useState(false)

  const fetchUsers = async (kind: 'user' | 'manager') => {
    try {
      if (kind === 'user') setLoadingUsers(true)
      else setLoadingManagers(true)

      const q = (kind === 'user' ? userSearch : managerSearch).trim()
      const res = await fetch(`/api/admin/users/search?search=${encodeURIComponent(q)}&limit=25`)
      const data = await res.json()

      if (!res.ok) {
        toast({ title: 'Erro', description: data?.error || 'Falha ao buscar usuários', variant: 'destructive' })
        return
      }

      if (kind === 'user') setUserResults(data.users || [])
      else setManagerResults(data.users || [])
    } catch {
      toast({ title: 'Erro', description: 'Falha ao buscar usuários', variant: 'destructive' })
    } finally {
      if (kind === 'user') setLoadingUsers(false)
      else setLoadingManagers(false)
    }
  }

  const applyManager = async () => {
    if (!selectedUserId) {
      toast({ title: 'Erro', description: 'Selecione um usuário', variant: 'destructive' })
      return
    }

    try {
      setSaving(true)

      const managerUserId = selectedManagerId === '__none__' ? null : (selectedManagerId || null)

      const res = await fetch('/api/org/manager', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, managerUserId })
      })

      const data = await res.json()
      if (!res.ok) {
        toast({ title: 'Erro', description: data?.error || 'Falha ao atualizar gestor', variant: 'destructive' })
        return
      }

      toast({
        title: 'Gestor atualizado',
        description: data?.user?.manager ? `Novo gestor: ${data.user.manager.name || data.user.manager.email || data.user.manager.id}` : 'Gestor removido'
      })

      // Refresh list to reflect new manager
      await fetchUsers('user')
    } catch {
      toast({ title: 'Erro', description: 'Falha ao atualizar gestor', variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const selectedUser = userResults.find(u => u.id === selectedUserId)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Hierarquia (MoR)
        </CardTitle>
        <CardDescription>
          Defina o gestor direto (reporting line). O MoR das avaliações de cargo é inferido a partir do gestor do avaliador.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-3">
          <div className="flex gap-2">
            <Input
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              placeholder="Buscar usuário (nome/email)…"
            />
            <Button type="button" variant="secondary" onClick={() => fetchUsers('user')} disabled={loadingUsers}>
              {loadingUsers ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
            </Button>
          </div>

          <Select value={selectedUserId} onValueChange={setSelectedUserId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o usuário" />
            </SelectTrigger>
            <SelectContent>
              {userResults.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {labelUser(u)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {selectedUser && (
            <div className="text-sm text-muted-foreground">
              Gestor atual: {selectedUser.manager ? (selectedUser.manager.name || selectedUser.manager.email || selectedUser.manager.id) : '—'}
            </div>
          )}
        </div>

        <div className="grid gap-3">
          <div className="flex gap-2">
            <Input
              value={managerSearch}
              onChange={(e) => setManagerSearch(e.target.value)}
              placeholder="Buscar gestor (nome/email)…"
            />
            <Button type="button" variant="secondary" onClick={() => fetchUsers('manager')} disabled={loadingManagers}>
              {loadingManagers ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Buscar'}
            </Button>
          </div>

          <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o gestor (ou remover)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">(Remover gestor)</SelectItem>
              {managerResults
                .filter((u) => u.id !== selectedUserId)
                .map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {labelUser(u)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>

          <Button type="button" onClick={applyManager} disabled={saving || !selectedUserId}>
            {saving ? (
              <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Salvando…</span>
            ) : (
              'Salvar'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

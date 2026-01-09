'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

export function RequestAccessForm() {
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      setSubmitting(true)

      const res = await fetch('/api/register/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, message })
      })

      const data = await res.json().catch(() => null)

      if (!res.ok) {
        toast.error('Não foi possível enviar o pedido', {
          description: data?.error || 'Tente novamente mais tarde.'
        })
        return
      }

      toast.success('Pedido enviado', {
        description: 'A equipe responsável receberá sua solicitação.'
      })

      setName('')
      setEmail('')
      setMessage('')
    } catch {
      toast.error('Erro ao enviar', {
        description: 'Tente novamente mais tarde.'
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <div className="grid gap-2">
        <Label htmlFor="request-name">Nome</Label>
        <Input
          id="request-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={submitting}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="request-email">Email</Label>
        <Input
          id="request-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          required
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="request-message">Mensagem (opcional)</Label>
        <Textarea
          id="request-message"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          disabled={submitting}
        />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Enviando…' : 'Solicitar cadastro'}
        </Button>
      </div>
    </form>
  )
}

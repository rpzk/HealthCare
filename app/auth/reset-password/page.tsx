'use client'

import { Suspense, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { AuthCard } from '@/components/auth/auth-card'

export const dynamic = 'force-dynamic'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = useMemo(() => searchParams?.get('token') || '', [searchParams])

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!token) {
      setError('Token ausente')
      return
    }

    if (newPassword.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/password-reset/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data?.error || 'Não foi possível redefinir a senha')
        return
      }

      setSuccess(true)
      setTimeout(() => {
        router.push('/auth/signin')
        router.refresh()
      }, 800)
    } catch {
      setError('Erro ao redefinir a senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Criar nova senha"
      description="Defina uma nova senha para sua conta"
    >
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {success ? (
        <div className="p-3 rounded-lg border bg-muted/50">
          <p className="text-sm">Senha redefinida com sucesso. Redirecionando...</p>
        </div>
      ) : token ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="newPassword" className="text-sm font-medium">Nova senha</label>
            <Input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="text-sm font-medium">Confirmar nova senha</label>
            <Input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Salvando...' : 'Redefinir senha'}
          </Button>

          <div className="text-center">
            <Link
              href="/auth/signin"
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              Voltar para o login
            </Link>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div className="p-3 rounded-lg border bg-muted/50">
            <p className="text-sm">Link inválido ou incompleto.</p>
          </div>
          <Link href="/auth/forgot-password">
            <Button variant="outline" className="w-full">Solicitar novo link</Button>
          </Link>
        </div>
      )}
    </AuthCard>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <ResetPasswordContent />
    </Suspense>
  )
}

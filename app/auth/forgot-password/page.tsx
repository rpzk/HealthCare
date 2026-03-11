'use client'

import { Suspense, useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import { AuthCard } from '@/components/auth/auth-card'

export const dynamic = 'force-dynamic'

function ForgotPasswordContent() {
  const searchParams = useSearchParams()
  const initialEmail = useMemo(() => searchParams?.get('email') || '', [searchParams])

  const [email, setEmail] = useState(initialEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/password-reset/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.error || 'Não foi possível processar sua solicitação')
        return
      }

      setSubmitted(true)
    } catch {
      setError('Erro ao solicitar redefinição. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthCard
      title="Recuperar senha"
      description="Enviaremos um link para redefinir a senha no seu email"
    >
      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {submitted ? (
        <div className="space-y-4">
          <div className="p-3 rounded-lg border bg-muted/50">
            <p className="text-sm">
              Se esse email existir no sistema, você receberá um link para redefinir sua senha.
            </p>
          </div>
          <Link href="/auth/signin">
            <Button variant="outline" className="w-full">Voltar para o login</Button>
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Enviando...' : 'Enviar link de recuperação'}
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
      )}
    </AuthCard>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <ForgotPasswordContent />
    </Suspense>
  )
}

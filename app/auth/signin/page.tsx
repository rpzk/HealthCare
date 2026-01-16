'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { AlertCircle, HeartPulse } from 'lucide-react'
import { startAuthentication } from '@simplewebauthn/browser'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const router = useRouter()

  const getSafeRedirectPath = () => {
    if (typeof window === 'undefined') return '/'

    const params = new URLSearchParams(window.location.search)
    const callbackUrl = params.get('callbackUrl') || params.get('next')
    if (!callbackUrl) return '/'

    // Only allow same-origin redirects to avoid open-redirect issues.
    try {
      if (callbackUrl.startsWith('/')) return callbackUrl
      const url = new URL(callbackUrl)
      if (url.origin === window.location.origin) {
        return url.pathname + url.search + url.hash
      }
    } catch {
      // Ignore invalid URLs
    }
    return '/'
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const safeEmail = email.trim()
      const result = await signIn('credentials', {
        email: safeEmail,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Credenciais inválidas')
      } else {
        // Recarregar a sessão
        const session = await getSession()
        if (session) {
          const target = getSafeRedirectPath()
          const userRole = (session.user as any)?.role
          const availableRoles = (session.user as any)?.availableRoles || []
          const isAdmin = userRole === 'ADMIN' || availableRoles.includes('ADMIN')
          const safeTarget = !isAdmin && target.startsWith('/admin') ? '/appointments/dashboard' : target

          router.push(safeTarget)
          router.refresh()
        }
      }
    } catch (error) {
      setError('Erro ao fazer login. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handlePasskey = async () => {
    const safeEmail = email.trim()
    if (!safeEmail) {
      setError('Informe o email para usar Passkey')
      return
    }
    setError('')
    setPasskeyLoading(true)
    try {
      const optionsRes = await fetch('/api/auth/webauthn/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: safeEmail })
      })
      if (!optionsRes.ok) {
        const data = await optionsRes.json()
        throw new Error(data.error || 'Não foi possível iniciar Passkey')
      }
      const options = await optionsRes.json()
      const assertion = await startAuthentication(options)
      const result = await signIn('passkey', {
        redirect: false,
        email: safeEmail,
        assertion: JSON.stringify(assertion)
      })
      if (result?.error) {
        throw new Error('Falha ao autenticar com Passkey')
      }
      const session = await getSession()
      if (session) {
        const target = getSafeRedirectPath()
        const userRole = (session.user as any)?.role
        const availableRoles = (session.user as any)?.availableRoles || []
        const isAdmin = userRole === 'ADMIN' || availableRoles.includes('ADMIN')
        const safeTarget = !isAdmin && target.startsWith('/admin') ? '/appointments/dashboard' : target

        router.push(safeTarget)
        router.refresh()
      }
    } catch (err: any) {
      console.error('Passkey login error', err)
      setError(err?.message || 'Erro ao autenticar com Passkey')
    } finally {
      setPasskeyLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-6 sm:p-8 space-y-6">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-primary text-primary-foreground rounded-full">
              <HeartPulse className="w-8 h-8" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Sistema HealthCare</h1>
            <p className="text-muted-foreground">Entre com suas credenciais</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
              <AlertCircle className="w-4 h-4" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Email
            </label>
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

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium">
              Senha
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              autoComplete="current-password"
            />
            <div className="text-right">
              <Link
                href={`/auth/forgot-password?email=${encodeURIComponent(email.trim())}`}
                className="text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
              >
                Esqueci minha senha
              </Link>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full"
            disabled={loading}
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            disabled={passkeyLoading}
            onClick={handlePasskey}
          >
            {passkeyLoading ? 'Autenticando...' : 'Entrar com Passkey'}
          </Button>

          <div className="pt-2 text-center">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
            >
              Voltar ao início
            </Link>
          </div>
        </form>
      </Card>
    </div>
  )
}

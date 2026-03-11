'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, Fingerprint } from 'lucide-react'
import { startAuthentication } from '@simplewebauthn/browser'
import { AuthCard } from '@/components/auth/auth-card'

export default function SignIn() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [twoFactorCode, setTwoFactorCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [passkeyLoading, setPasskeyLoading] = useState(false)
  const [showTwoFactor, setShowTwoFactor] = useState(false)
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null)
  const router = useRouter()

  const getSafeRedirectPath = () => {
    if (typeof window === 'undefined') return '/'
    const params = new URLSearchParams(window.location.search)
    const callbackUrl = params.get('callbackUrl') || params.get('next')
    if (!callbackUrl) return '/'
    try {
      if (callbackUrl.startsWith('/')) return callbackUrl
      const url = new URL(callbackUrl)
      if (url.origin === window.location.origin) {
        return url.pathname + url.search + url.hash
      }
    } catch {}
    return '/'
  }

  const redirectAfterLogin = (target: string) => {
    router.push(target)
    router.refresh()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const safeEmail = email.trim()

      if (showTwoFactor && pendingCredentials) {
        if (!twoFactorCode.trim()) {
          setError('Digite o código de autenticação')
          setLoading(false)
          return
        }

        const verifyRes = await fetch('/api/auth/2fa/verify-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: pendingCredentials.email,
            password: pendingCredentials.password,
            token: twoFactorCode.trim()
          })
        })

        if (!verifyRes.ok) {
          const data = await verifyRes.json()
          setError(data.error || 'Código inválido')
          setLoading(false)
          return
        }

        const result = await signIn('credentials', {
          email: pendingCredentials.email,
          password: pendingCredentials.password,
          redirect: false,
        })

        if (result?.error) {
          setError('Erro ao completar login')
        } else {
          const session = await getSession()
          if (session) {
            const target = getSafeRedirectPath()
            const userRole = (session.user as any)?.role
            const availableRoles = (session.user as any)?.availableRoles || []
            const isAdmin = userRole === 'ADMIN' || availableRoles.includes('ADMIN')
            const safeTarget = !isAdmin && target.startsWith('/admin') ? '/appointments/dashboard' : target
            redirectAfterLogin(safeTarget)
          }
        }
        setLoading(false)
        return
      }

      const checkRes = await fetch('/api/auth/2fa/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: safeEmail, password })
      })

      if (!checkRes.ok) {
        const isServerError = checkRes.status >= 500
        setError(isServerError ? 'Erro no servidor. Verifique se o banco de dados está acessível.' : 'Credenciais inválidas')
        setLoading(false)
        return
      }

      const { twoFactorEnabled } = await checkRes.json()

      if (twoFactorEnabled) {
        setShowTwoFactor(true)
        setPendingCredentials({ email: safeEmail, password })
        setLoading(false)
        return
      }

      const result = await signIn('credentials', {
        email: safeEmail,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Credenciais inválidas')
      } else {
        const session = await getSession()
        if (session) {
          const target = getSafeRedirectPath()
          const userRole = (session.user as any)?.role
          const availableRoles = (session.user as any)?.availableRoles || []
          const isAdmin = userRole === 'ADMIN' || availableRoles.includes('ADMIN')
          const safeTarget = !isAdmin && target.startsWith('/admin') ? '/appointments/dashboard' : target
          redirectAfterLogin(safeTarget)
        }
      }
    } catch {
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
        redirectAfterLogin(safeTarget)
      }
    } catch (err: any) {
      console.error('Passkey login error', err)
      setError(err?.message || 'Erro ao autenticar com Passkey')
    } finally {
      setPasskeyLoading(false)
    }
  }

  return (
    <AuthCard
      title={showTwoFactor ? 'Código de Autenticação' : 'Entrar'}
      description={showTwoFactor ? 'Digite o código do autenticador ou backup' : 'Entre com suas credenciais'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {showTwoFactor ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="twoFactorCode" className="text-sm font-medium">
                Código (6 dígitos)
              </label>
              <Input
                id="twoFactorCode"
                type="text"
                inputMode="numeric"
                value={twoFactorCode}
                onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                required
                disabled={loading}
                autoFocus
                placeholder="000000"
                maxLength={8}
                className="text-center text-lg tracking-widest"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Verificando...' : 'Verificar Código'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              className="w-full"
              onClick={() => {
                setShowTwoFactor(false)
                setPendingCredentials(null)
                setTwoFactorCode('')
                setError('')
              }}
            >
              Voltar
            </Button>
          </div>
        ) : (
          <>
            {/* Email e Senha */}
            <div className="space-y-4">
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

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">Senha</label>
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

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Entrando...' : 'Entrar com email e senha'}
              </Button>
            </div>

            {/* Divisor */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">ou</span>
              </div>
            </div>

            {/* Passkey */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={passkeyLoading}
                onClick={handlePasskey}
              >
                <Fingerprint className="w-4 h-4 mr-2" />
                {passkeyLoading ? 'Autenticando...' : 'Entrar com Passkey'}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Face ID, Touch ID ou chave de segurança
              </p>
            </div>

            <div className="pt-4 text-center">
              <p className="text-sm text-muted-foreground">
                Não tem conta?{' '}
                <Link href="/auth/register" className="text-primary hover:underline font-medium">
                  Cadastre-se
                </Link>
              </p>
            </div>
          </>
        )}
      </form>
    </AuthCard>
  )
}

'use client'

import { useState } from 'react'
import { signIn, getSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Credenciais inválidas')
      } else {
        // Recarregar a sessão
        const session = await getSession()
        if (session) {
          router.push('/')
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
    if (!email) {
      setError('Informe o email para usar Passkey')
      return
    }
    setError('')
    setPasskeyLoading(true)
    try {
      const optionsRes = await fetch('/api/auth/webauthn/authenticate/options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!optionsRes.ok) {
        const data = await optionsRes.json()
        throw new Error(data.error || 'Não foi possível iniciar Passkey')
      }
      const options = await optionsRes.json()
      const assertion = await startAuthentication(options)
      const result = await signIn('passkey', {
        redirect: false,
        email,
        assertion: JSON.stringify(assertion)
      })
      if (result?.error) {
        throw new Error('Falha ao autenticar com Passkey')
      }
      const session = await getSession()
      if (session) {
        router.push('/')
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md p-8 space-y-6 shadow-xl">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-600 rounded-full">
              <HeartPulse className="w-8 h-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sistema HealthCare</h1>
            <p className="text-gray-600">Entre com suas credenciais</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-gray-700">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@healthcare.com"
              required
              disabled={loading}
              autoComplete="username"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-gray-700">
              Senha
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              disabled={loading}
              autoComplete="current-password"
            />
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
        </form>

        <div className="text-center space-y-2">
          <div className="text-sm text-gray-500">
            Credenciais de teste:
          </div>
          <div className="text-xs text-gray-400 font-mono bg-gray-50 p-2 rounded">
            admin@healthcare.com / admin123
          </div>
        </div>
      </Card>
    </div>
  )
}

'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Markdown } from '@/components/ui/markdown'

export const dynamic = 'force-dynamic'

type PendingTerm = {
  id: string
  slug: string
  title: string
  version: string
  content: string
  audience: 'ALL' | 'PATIENT' | 'PROFESSIONAL'
  updatedAt: string
}

function safeSameOriginPath(input: string | null): string {
  if (!input) return '/'
  if (input.startsWith('/')) return input
  try {
    const url = new URL(input)
    if (typeof window !== 'undefined' && url.origin === window.location.origin) {
      return url.pathname + url.search + url.hash
    }
  } catch {
    // ignore
  }
  return '/'
}

function AcceptTermsContent() {
  const router = useRouter()
  const params = useSearchParams()

  const returnTo = useMemo(
    () => safeSameOriginPath(params?.get('returnTo') ?? null),
    [params]
  )
  const idsParam = params?.get('ids') ?? null

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [terms, setTerms] = useState<PendingTerm[]>([])
  const [accepted, setAccepted] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const qs = new URLSearchParams()
        if (idsParam) qs.set('ids', idsParam)
        const res = await fetch(`/api/terms/pending?${qs.toString()}`)
        const data = await res.json().catch(() => ({}))

        if (res.status === 401) {
          const next = encodeURIComponent(`/terms/accept?${new URLSearchParams({ returnTo, ...(idsParam ? { ids: idsParam } : {}) }).toString()}`)
          window.location.href = `/auth/signin?next=${next}`
          return
        }

        if (!res.ok) {
          toast.error(data?.error || 'Erro ao carregar termos pendentes')
          setTerms([])
          return
        }

        const list = Array.isArray(data?.terms) ? (data.terms as PendingTerm[]) : []
        setTerms(list)
        setAccepted(Object.fromEntries(list.map((t) => [t.id, false])))
      } catch (e) {
        console.error(e)
        toast.error('Erro ao carregar termos pendentes')
        setTerms([])
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [idsParam, returnTo])

  const allChecked = terms.length > 0 && terms.every((t) => accepted[t.id])

  const handleAccept = async () => {
    if (terms.length === 0) {
      router.push(returnTo)
      return
    }

    if (!allChecked) {
      toast.error('Você precisa aceitar todos os termos para continuar')
      return
    }

    try {
      setSubmitting(true)
      const res = await fetch('/api/terms/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ termIds: terms.map((t) => t.id) }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data?.error || 'Erro ao registrar aceite')
        return
      }

      toast.success('Aceite registrado')
      router.push(returnTo)
      router.refresh()
    } catch (e) {
      console.error(e)
      toast.error('Erro ao registrar aceite')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto max-w-3xl py-10 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Termos/consentimentos obrigatórios</CardTitle>
          <CardDescription>
            Para continuar, confirme a leitura e o aceite dos termos abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Você pode consultar também: <Link href="/terms" className="underline">Termos de Uso</Link> e{' '}
            <Link href="/privacy" className="underline">Política de Privacidade</Link>.
          </p>

          {loading ? (
            <p className="text-sm text-muted-foreground">Carregando...</p>
          ) : terms.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum termo pendente.</p>
          ) : (
            <div className="space-y-4">
              {terms.map((t) => (
                <Card key={t.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{t.title}</CardTitle>
                    <CardDescription>
                      Slug: {t.slug} • Versão {t.version}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Markdown content={t.content} className="text-sm" />
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`accept-${t.id}`}
                        checked={Boolean(accepted[t.id])}
                        onCheckedChange={(v) => setAccepted((prev) => ({ ...prev, [t.id]: Boolean(v) }))}
                      />
                      <label htmlFor={`accept-${t.id}`} className="text-sm">
                        Li e aceito
                      </label>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Button onClick={handleAccept} disabled={loading || submitting} className="w-full">
            {submitting ? 'Salvando...' : 'Aceitar e continuar'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AcceptTermsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <AcceptTermsContent />
    </Suspense>
  )
}

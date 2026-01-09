"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Loader2, ArrowLeft, Save } from 'lucide-react'

const EMPTY_TEMPLATE = {
  name: '',
  description: '',
  patientIntro: '',
  therapeuticSystem: 'GENERAL',
  estimatedMinutes: 10,
  allowPause: true,
  showProgress: true,
  randomizeQuestions: false,
  themeColor: '',
  iconEmoji: '',
  isPublic: false,
  aiAnalysisPrompt: '',
  scoringLogic: null,
  categories: [],
}

export default function NewQuestionnaireTemplatePage() {
  const router = useRouter()
  const [jsonText, setJsonText] = useState(JSON.stringify(EMPTY_TEMPLATE, null, 2))
  const [saving, setSaving] = useState(false)

  async function createTemplate() {
    setSaving(true)
    try {
      const parsed = JSON.parse(jsonText)

      const res = await fetch('/api/questionnaires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(parsed),
      })

      if (res.ok) {
        const created = await res.json()
        router.push(`/questionnaires/${created.id}`)
        return
      }

      const err = await res.json().catch(() => null)
      alert(`Erro: ${err?.error || 'Falha ao criar questionário'}`)
    } catch (e: any) {
      alert(`Erro: ${e?.message || 'JSON inválido'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex pt-16">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <div className="max-w-5xl mx-auto space-y-6">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => router.push('/questionnaires')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">Criar Questionário</h1>
                <p className="text-muted-foreground">Crie um template colando um JSON válido (sem dados simulados).</p>
              </div>
              <Button onClick={createTemplate} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Salvar
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Template (JSON)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Label>Estrutura esperada</Label>
                <Textarea
                  value={jsonText}
                  onChange={(e) => setJsonText(e.target.value)}
                  className="min-h-[520px] font-mono"
                  spellCheck={false}
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  )
}

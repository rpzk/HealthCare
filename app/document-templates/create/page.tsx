'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateEditor } from '@/components/document-templates/template-editor'
import { toast } from 'sonner'

export default function CreateTemplatePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleSave = async (formData: any) => {
    try {
      setLoading(true)
      const res = await fetch('/api/document-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao criar template')
      }

      const template = await res.json()
      toast.success('Template criado com sucesso!')
      router.push(`/document-templates/${template.id}`)
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao criar template')
      throw error
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Criar Novo Template</h1>
        <p className="text-gray-600 mt-2">
          Configure o layout customizado do seu documento
        </p>
      </div>

      <TemplateEditor onSave={handleSave} loading={loading} />
    </div>
  )
}

'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TemplateEditor } from '@/components/document-templates/template-editor'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

export default function EditTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const [template, setTemplate] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [id, setId] = useState<string>('')

  useEffect(() => {
    const load = async () => {
      try {
        const { id: templateId } = await params
        setId(templateId)
        const res = await fetch(`/api/document-templates/${templateId}`)
        const data = await res.json()
        setTemplate(data)
      } catch (error) {
        toast.error('Erro ao carregar template')
        console.error(error)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [params])

  const handleSave = async (formData: any) => {
    try {
      setSaving(true)
      const res = await fetch(`/api/document-templates/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'Erro ao atualizar template')
      }

      const updated = await res.json()
      setTemplate(updated)
      toast.success('Template atualizado com sucesso!')
    } catch (error: any) {
      toast.error(error?.message || 'Erro ao atualizar template')
      throw error
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    )
  }

  if (!template) {
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">Template não encontrado</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Editar Template</h1>
        <p className="text-gray-600 mt-2">{template.name}</p>
      </div>

      <TemplateEditor template={template} onSave={handleSave} loading={saving} />
    </div>
  )
}

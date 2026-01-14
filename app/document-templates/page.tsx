'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Plus, Edit2, Trash2, Copy, Loader2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert'

interface Template {
  id: string
  name: string
  documentType: string
  description?: string
  isActive: boolean
  isDefault: boolean
  createdByUser: {
    id: string
    name: string
  }
  createdAt: string
}

export default function DocumentTemplatesPage() {
  const router = useRouter()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [filter, setFilter] = useState<string | null>(null)

  useEffect(() => {
    loadTemplates()
  }, [filter])

  const loadTemplates = async () => {
    try {
      setLoading(true)
      const url = new URL('/api/document-templates', window.location.origin)
      if (filter) url.searchParams.set('documentType', filter)

      const res = await fetch(url)
      const data = await res.json()
      setTemplates(data.templates || [])
    } catch (error) {
      toast.error('Erro ao carregar templates')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este template?')) {
      return
    }

    try {
      setDeleting(id)
      const res = await fetch(`/api/document-templates/${id}`, {
        method: 'DELETE',
      })

      if (!res.ok) throw new Error('Erro ao deletar')

      setTemplates(templates.filter((t) => t.id !== id))
      toast.success('Template deletado com sucesso')
    } catch (error) {
      toast.error('Erro ao deletar template')
      console.error(error)
    } finally {
      setDeleting(null)
    }
  }

  const handleDuplicate = async (id: string) => {
    try {
      const res = await fetch(`/api/document-templates/${id}/duplicate`, {
        method: 'POST',
      })

      if (!res.ok) throw new Error('Erro ao duplicar')

      const newTemplate = await res.json()
      setTemplates([newTemplate, ...templates])
      toast.success('Template duplicado com sucesso')
    } catch (error) {
      toast.error('Erro ao duplicar template')
      console.error(error)
    }
  }

  const documentTypes = Array.from(
    new Set(templates.map((t) => t.documentType))
  )

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Templates de Documentos</h1>
          <p className="text-gray-600 mt-2">
            Crie e customize layouts de documentos (prescrições, atestados, etc.)
          </p>
        </div>
        <Button onClick={() => router.push('/document-templates/create')} size="lg">
          <Plus className="mr-2 h-4 w-4" />
          Novo Template
        </Button>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === null ? 'default' : 'outline'}
          onClick={() => setFilter(null)}
        >
          Todos
        </Button>
        {documentTypes.map((type) => (
          <Button
            key={type}
            variant={filter === type ? 'default' : 'outline'}
            onClick={() => setFilter(type)}
          >
            {type}
          </Button>
        ))}
      </div>

      {/* Info */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Customize completamente o layout de seus documentos usando placeholders 
          como {'{'}clinic.name{'}'}, {'{'}doctor.name{'}'}, etc. Veja as variáveis disponíveis 
          no formulário de criação/edição.
        </AlertDescription>
      </Alert>

      {/* Lista */}
      <div className="grid gap-4">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : templates.length === 0 ? (
          <Card>
            <CardContent className="pt-6 text-center text-gray-500">
              Nenhum template encontrado. Crie um novo!
            </CardContent>
          </Card>
        ) : (
          templates.map((template) => (
            <Card key={template.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      {template.name}
                      {template.isDefault && (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          Padrão
                        </span>
                      )}
                      {!template.isActive && (
                        <span className="text-xs bg-gray-100 text-gray-800 px-2 py-1 rounded">
                          Inativo
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <span className="bg-gray-100 px-2 py-1 rounded text-sm mr-2">
                        {template.documentType}
                      </span>
                      {template.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  Criado por {template.createdByUser.name} em{' '}
                  {new Date(template.createdAt).toLocaleDateString('pt-BR')}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/document-templates/${template.id}`)
                    }
                  >
                    <Edit2 className="mr-2 h-4 w-4" />
                    Editar
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      router.push(`/document-templates/${template.id}/preview`)
                    }
                  >
                    Visualizar
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDuplicate(template.id)}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicar
                  </Button>

                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(template.id)}
                    disabled={deleting === template.id}
                  >
                    {deleting === template.id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Deletar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Upload, Loader2, AlertCircle, Check } from 'lucide-react'
import { toast } from 'sonner'

interface BulkUploadProps {
  onDatesLoaded: (dates: string[]) => void
  loading?: boolean
}

export function BulkDateUpload({ onDatesLoaded, loading = false }: BulkUploadProps) {
  const [dates, setDates] = useState('')
  const [parseError, setParseError] = useState('')
  const [parsedDates, setParsedDates] = useState<string[]>([])

  const parseDates = (input: string) => {
    const lines = input.split('\n').filter((line) => line.trim())
    const parsed: string[] = []
    const errors: string[] = []

    lines.forEach((line, idx) => {
      const trimmed = line.trim()
      if (!trimmed) return

      // Try different date formats
      const formats = [
        // DD/MM/YYYY
        /^(\d{2})\/(\d{2})\/(\d{4})$/,
        // YYYY-MM-DD
        /^(\d{4})-(\d{2})-(\d{2})$/,
        // DD-MM-YYYY
        /^(\d{2})-(\d{2})-(\d{4})$/,
        // DD.MM.YYYY
        /^(\d{2})\.(\d{2})\.(\d{4})$/,
      ]

      let date: Date | null = null
      let format = ''

      for (const [i, regex] of formats.entries()) {
        const match = trimmed.match(regex)
        if (match) {
          if (i === 0) {
            // DD/MM/YYYY
            date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
            format = 'DD/MM/YYYY'
          } else if (i === 1) {
            // YYYY-MM-DD
            date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]))
            format = 'YYYY-MM-DD'
          } else if (i === 2) {
            // DD-MM-YYYY
            date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
            format = 'DD-MM-YYYY'
          } else if (i === 3) {
            // DD.MM.YYYY
            date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]))
            format = 'DD.MM.YYYY'
          }
          break
        }
      }

      if (!date || isNaN(date.getTime())) {
        errors.push(`Linha ${idx + 1}: "${trimmed}" - formato inválido`)
      } else {
        parsed.push(date.toISOString().split('T')[0])
      }
    })

    if (errors.length > 0) {
      setParseError(errors.join('\n'))
    } else {
      setParseError('')
    }

    setParsedDates(parsed)
    return parsed
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    e.preventDefault()
    const pastedText = e.clipboardData.getData('text')
    setDates(pastedText)
    setTimeout(() => {
      const parsed = parseDates(pastedText)
      if (parsed.length > 0 && !parseError) {
        toast.success(`${parsed.length} data(s) importada(s)`)
      }
    }, 0)
  }

  const handleImport = () => {
    if (parsedDates.length === 0) {
      toast.error('Nenhuma data válida para importar')
      return
    }

    onDatesLoaded(parsedDates)
    setDates('')
    setParsedDates([])
    setParseError('')
    toast.success(`${parsedDates.length} data(s) importada(s) com sucesso`)
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      setDates(content)
      setTimeout(() => {
        const parsed = parseDates(content)
        if (parsed.length > 0 && !parseError) {
          toast.success(`${parsed.length} data(s) encontrada(s)`)
        }
      }, 0)
    }
    reader.readAsText(file)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importar Datas em Lote
        </CardTitle>
        <CardDescription>
          Copie e cole datas de um arquivo ou planilha. Formatos suportados: DD/MM/YYYY, YYYY-MM-DD, DD-MM-YYYY, DD.MM.YYYY
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Dica:</strong> Copie uma coluna de datas do Excel, Google Sheets ou qualquer planilha e cole aqui. Uma data por linha.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="dates-input">Cole as datas aqui:</Label>
          <Textarea
            id="dates-input"
            placeholder="01/01/2026
02/01/2026
03/01/2026

ou Cole direto do Excel/Sheets"
            value={dates}
            onChange={(e) => parseDates(e.target.value)}
            onPaste={handlePaste}
            className="h-32 font-mono text-sm"
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" asChild className="flex-1">
            <label className="cursor-pointer">
              <Upload className="mr-2 h-4 w-4" />
              Abrir arquivo
              <input
                type="file"
                accept=".txt,.csv"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </Button>
        </div>

        {parseError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs whitespace-pre-wrap">
              {parseError}
            </AlertDescription>
          </Alert>
        )}

        {parsedDates.length > 0 && !parseError && (
          <Alert className="bg-green-50 border-green-200">
            <Check className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <strong>{parsedDates.length} data(s) válida(s) encontrada(s)</strong>
              <div className="mt-2 max-h-32 overflow-y-auto">
                <div className="grid grid-cols-4 gap-2 text-xs">
                  {parsedDates.slice(0, 20).map((date, idx) => (
                    <div key={idx} className="bg-white px-2 py-1 rounded border border-green-200">
                      {new Date(date).toLocaleDateString('pt-BR')}
                    </div>
                  ))}
                  {parsedDates.length > 20 && (
                    <div className="text-xs text-green-700 font-semibold col-span-4">
                      ... e mais {parsedDates.length - 20} data(s)
                    </div>
                  )}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Button
          onClick={handleImport}
          disabled={parsedDates.length === 0 || loading || !!parseError}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Importar {parsedDates.length > 0 && `(${parsedDates.length} data${parsedDates.length > 1 ? 's' : ''})`}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}

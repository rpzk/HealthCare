'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { toast } from '@/hooks/use-toast'
import { FileText, Loader2, CheckCircle } from 'lucide-react'
import { format } from 'date-fns'
import { logger } from '@/lib/logger'

interface CertificateFormProps {
  patientId: string
  patientName: string
  consultationId?: string
  onSuccess?: (certificate: any) => void
}

const CERTIFICATE_TYPES = [
  { value: 'MEDICAL_LEAVE', label: 'Atestado de Afastamento' },
  { value: 'FITNESS', label: 'Atestado de Aptidão Física' },
  { value: 'ACCOMPANIMENT', label: 'Atestado de Acompanhante' },
  { value: 'TIME_OFF', label: 'Atestado de Comparecimento' },
  { value: 'CUSTOM', label: 'Atestado Personalizado' },
]

export function CertificateForm({ patientId, patientName, consultationId, onSuccess }: CertificateFormProps) {
  const [loading, setLoading] = useState(false)
  const [type, setType] = useState('MEDICAL_LEAVE')
  const [days, setDays] = useState('1')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [includeCid, setIncludeCid] = useState(false)
  const [cidCode, setCidCode] = useState('')
  const [cidDescription, setCidDescription] = useState('')
  const [content, setContent] = useState('')
  const [observations, setObservations] = useState('')
  const [useDefaultContent, setUseDefaultContent] = useState(true)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/certificates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientId,
          consultationId,
          type,
          days: type === 'MEDICAL_LEAVE' ? parseInt(days) : undefined,
          startDate,
          includeCid,
          cidCode: includeCid ? cidCode : undefined,
          cidDescription: includeCid ? cidDescription : undefined,
          content: useDefaultContent ? undefined : content,
          observations
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.error || 'Erro ao emitir atestado')
      }

      toast({
        title: '✅ Atestado Emitido',
        description: `Nº ${data.certificate.sequenceNumber.toString().padStart(6, '0')}/${data.certificate.year}`,
      })

      onSuccess?.(data.certificate)

      // Reset form
      setType('MEDICAL_LEAVE')
      setDays('1')
      setStartDate(format(new Date(), 'yyyy-MM-dd'))
      setIncludeCid(false)
      setCidCode('')
      setCidDescription('')
      setContent('')
      setObservations('')

    } catch (error: unknown) {
      logger.error('[Certificate] Erro:', error)
      toast({
        title: 'Erro',
        description: error instanceof Error ? error.message : 'Erro ao emitir atestado',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <FileText className="w-6 h-6 text-blue-600" />
        <h2 className="text-2xl font-bold">Emitir Atestado Médico</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Paciente */}
        <div>
          <Label>Paciente</Label>
          <Input value={patientName} disabled className="bg-gray-50" />
        </div>

        {/* Tipo de Atestado */}
        <div>
          <Label htmlFor="type">Tipo de Atestado *</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CERTIFICATE_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {/* Data Inicial */}
          <div>
            <Label htmlFor="startDate">Data Inicial *</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>

          {/* Dias de Afastamento */}
          {type === 'MEDICAL_LEAVE' && (
            <div>
              <Label htmlFor="days">Dias de Afastamento *</Label>
              <Input
                id="days"
                type="number"
                min="1"
                max="365"
                value={days}
                onChange={(e) => setDays(e.target.value)}
                required
              />
            </div>
          )}
        </div>

        {/* CID-10 (Opcional) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor="includeCid">Incluir CID-10 (opcional)</Label>
            <Switch
              id="includeCid"
              checked={includeCid}
              onCheckedChange={setIncludeCid}
            />
          </div>

          {includeCid && (
            <div className="grid md:grid-cols-2 gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div>
                <Label htmlFor="cidCode">Código CID-10</Label>
                <Input
                  id="cidCode"
                  value={cidCode}
                  onChange={(e) => setCidCode(e.target.value.toUpperCase())}
                  placeholder="Ex: M54.5"
                  maxLength={10}
                />
              </div>
              <div>
                <Label htmlFor="cidDescription">Descrição</Label>
                <Input
                  id="cidDescription"
                  value={cidDescription}
                  onChange={(e) => setCidDescription(e.target.value)}
                  placeholder="Ex: Lombalgia"
                />
              </div>
              <div className="col-span-2 text-xs text-amber-700">
                ⚠️ <strong>Atenção:</strong> O paciente tem direito a receber atestado SEM o CID-10 
                se assim desejar (Resolução CFM nº 1.658/2002).
              </div>
            </div>
          )}
        </div>

        {/* Conteúdo */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Texto do Atestado</Label>
            <div className="flex items-center gap-2">
              <Switch
                id="useDefault"
                checked={useDefaultContent}
                onCheckedChange={setUseDefaultContent}
              />
              <Label htmlFor="useDefault" className="text-sm text-gray-600">
                Usar texto padrão
              </Label>
            </div>
          </div>

          {!useDefaultContent && (
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Digite o texto do atestado..."
              rows={6}
              required={!useDefaultContent}
            />
          )}
        </div>

        {/* Observações */}
        <div>
          <Label htmlFor="observations">Observações Adicionais</Label>
          <Textarea
            id="observations"
            value={observations}
            onChange={(e) => setObservations(e.target.value)}
            placeholder="Observações opcionais..."
            rows={3}
          />
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="submit"
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Emitindo...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Emitir Atestado
              </>
            )}
          </Button>
        </div>
      </form>
    </Card>
  )
}

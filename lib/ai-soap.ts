import { z } from 'zod'
import ollamaClient from '@/lib/ollama-client'
import { startSpan } from '@/lib/tracing'

export const soapSchema = z.object({
  subjective: z.object({
    chiefComplaint: z.string().optional(),
    historyOfPresentIllness: z.string().optional(),
    pastMedicalHistory: z.array(z.string()).optional(),
    medications: z.array(z.string()).optional(),
    allergies: z.array(z.string()).optional(),
    socialHistory: z.string().optional()
  }),
  objective: z.object({
    vitals: z.record(z.string(), z.any()).optional(),
    physicalExam: z.string().optional(),
    labsAndImaging: z.array(z.string()).optional()
  }),
  assessment: z.object({
    diagnoses: z.array(z.object({
      label: z.string(),
      certainty: z.number().min(0).max(1).optional(),
      rationale: z.string().optional()
    })).optional(),
    summary: z.string().optional()
  }),
  plan: z.object({
    medications: z.array(z.string()).optional(),
    tests: z.array(z.string()).optional(),
    treatments: z.array(z.string()).optional(),
    education: z.array(z.string()).optional(),
    followUp: z.string().optional()
  }),
  metadata: z.object({
    model: z.string(),
    version: z.string().optional(),
    warnings: z.array(z.string()).optional()
  })
})

export type SoapNote = z.infer<typeof soapSchema>

function buildPrompt(transcript: string, locale: string, speciality?: string) {
  return `Você é um médico assistente. Converta o diálogo transcrito abaixo em uma evolução clínica no formato SOAP (Subjective, Objective, Assessment, Plan).

Regras:
- Saída ESTRITAMENTE em JSON válido (sem comentários, sem texto fora do JSON).
- Preencha apenas o que está suportado pelo conteúdo; se algo não estiver presente, omita o campo.
- Use linguagem médica concisa, em ${locale}.
${speciality ? `- Considere a especialidade: ${speciality}.` : ''}

Transcript:
"""
${transcript}
"""

Modelo JSON alvo:
{
  "subjective": {
    "chiefComplaint": string?,
    "historyOfPresentIllness": string?,
    "pastMedicalHistory": string[]?,
    "medications": string[]?,
    "allergies": string[]?,
    "socialHistory": string?
  },
  "objective": {
    "vitals": { "PA": string?, "FC": number?, "FR": number?, "Temp": number? }?,
    "physicalExam": string?,
    "labsAndImaging": string[]?
  },
  "assessment": {
    "diagnoses": [{ "label": string, "certainty": number?, "rationale": string? }]?,
    "summary": string?
  },
  "plan": {
    "medications": string[]?,
    "tests": string[]?,
    "treatments": string[]?,
    "education": string[]?,
    "followUp": string?
  },
  "metadata": { "model": "${process.env.OLLAMA_MODEL || 'llama3'}", "warnings": string[]? }
}`
}

export async function generateSoapFromTranscript(params: { transcript: string; locale?: string; speciality?: string }): Promise<SoapNote> {
  const transcript = (params.transcript || '').slice(0, 20000)
  const locale = params.locale || 'pt-BR'
  const speciality = params.speciality
  const model = ollamaClient.getGenerativeModel({ model: process.env.OLLAMA_MODEL || 'llama3' })
  const prompt = buildPrompt(transcript, locale, speciality)

  const result = await startSpan('ai.soap.generate', async () => model.generateContent(prompt))
  const raw = result.response.text()
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Resposta do modelo não contém JSON válido')
  const parsed = JSON.parse(jsonMatch[0])
  const validated = soapSchema.safeParse(parsed)
  if (!validated.success) {
    throw new Error('SOAP gerado inválido: ' + validated.error.issues.map(i => i.message).join('; '))
  }
  return validated.data
}

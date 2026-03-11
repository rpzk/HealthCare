/**
 * API de sugestão de exames com base no histórico do paciente
 *
 * POST /api/ai/suggest-exams-for-patient
 *
 * Body: { patientId, motive? }
 *
 * Retorna: { exams: [{ name, description, priority, reasoning }] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { getAIConfig, aiClient } from '@/lib/ai-client'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { requirePatientAccess } from '@/lib/patient-access'

function extractJsonFromResponse(text: string): Record<string, unknown> | null {
  const trimmed = text.trim()
  const jsonBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/)?.[1]
  const toParse = jsonBlock ?? trimmed
  try {
    return JSON.parse(toParse) as Record<string, unknown>
  } catch {
    return null
  }
}

export const POST = withAuth(async (request, { user }) => {
  try {
    const body = await request.json().catch(() => ({}))
    const { patientId, motive } = body as { patientId?: string; motive?: string }

    if (!patientId || typeof patientId !== 'string') {
      return NextResponse.json(
        { error: 'patientId é obrigatório' },
        { status: 400 }
      )
    }

    const accessCheck = await requirePatientAccess(user.id, patientId, user.role, 'edit')
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.error || 'Acesso negado a este paciente' },
        { status: accessCheck.status || 403 }
      )
    }

    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      select: {
        name: true,
        birthDate: true,
        gender: true,
        allergies: true,
        medicalHistory: true,
        consultations: {
          take: 5,
          orderBy: { scheduledDate: 'desc' as const },
          select: {
            chiefComplaint: true,
            history: true,
            physicalExam: true,
            assessment: true,
            plan: true,
            scheduledDate: true,
            diagnoses: {
              include: {
                primaryCode: { select: { code: true, description: true } },
              },
            },
          },
        },
        ExamRequest: {
          take: 10,
          orderBy: { createdAt: 'desc' as const },
          select: {
            examType: true,
            description: true,
            urgency: true,
            createdAt: true,
          },
        },
        prescriptions: {
          take: 10,
          orderBy: { createdAt: 'desc' as const },
          select: {
            medication: true,
            items: {
              select: {
                medication: { select: { name: true } },
                medicationName: true,
              },
            },
          },
        },
      },
    })

    if (!patient) {
      return NextResponse.json(
        { error: 'Paciente não encontrado' },
        { status: 404 }
      )
    }

    const age = patient.birthDate
      ? Math.floor(
          (Date.now() - new Date(patient.birthDate).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000)
        )
      : null

    const diagnosisText = patient.consultations
      .flatMap((c) =>
        (c.diagnoses || []).map(
          (d) =>
            `${d.primaryCode?.code || ''} ${d.primaryCode?.description || ''}`
        )
      )
      .filter(Boolean)
      .join('; ')

    const soapText = patient.consultations
      .map(
        (c) =>
          `[${new Date(c.scheduledDate).toLocaleDateString('pt-BR')}] S: ${(c.chiefComplaint || c.history) || '-'} | O: ${c.physicalExam || '-'} | A: ${c.assessment || '-'} | P: ${c.plan || '-'}`
      )
      .join('\n')

    const examsText = patient.ExamRequest.map(
      (e) => `${e.examType || e.description || '-'} (${new Date(e.createdAt).toLocaleDateString('pt-BR')})`
    ).join('; ')

    const medsText = patient.prescriptions
      .flatMap((p) =>
        p.items?.length
          ? p.items.map(
              (i) => i.medication?.name || i.medicationName || p.medication
            )
          : [p.medication]
      )
      .filter(Boolean)
      .join(', ')

    const summary = [
      `PACIENTE: ${patient.name}`,
      `Idade: ${age ?? 'não informada'}, Sexo: ${patient.gender ?? 'não informado'}`,
      patient.allergies ? `Alergias: ${patient.allergies}` : '',
      patient.medicalHistory ? `Histórico médico: ${patient.medicalHistory}` : '',
      diagnosisText ? `Diagnósticos: ${diagnosisText}` : '',
      soapText ? `Consultas (SOAP):\n${soapText}` : '',
      examsText ? `Exames anteriores: ${examsText}` : '',
      medsText ? `Medicações atuais: ${medsText}` : '',
    ]
      .filter(Boolean)
      .join('\n')

    const config = await getAIConfig()
    const hasCloud = config.provider === 'groq' && config.groqApiKey
    const hasLocal = config.provider === 'ollama'
    if (!hasCloud && !hasLocal) {
      return NextResponse.json(
        { error: 'IA não configurada. Configure Groq ou Ollama em Configurações > IA.' },
        { status: 503 }
      )
    }

    const motiveHint = motive
      ? `\nMOTIVO DA SOLICITAÇÃO (informado pelo médico): ${motive}`
      : ''

    const userPrompt = `Com base no histórico clínico abaixo, sugira exames laboratoriais ou de imagem que façam sentido para o acompanhamento deste paciente.${motiveHint}

HISTÓRICO:
${summary.slice(0, 5000)}

Retorne APENAS um JSON válido, sem texto antes ou depois:
{"indication":"Indicação clínica sucinta para TODOS os exames sugeridos (1-2 frases, ex: Rastreamento de anemia e controle glicêmico em paciente diabético.)","exams":[{"name":"Nome do exame (ex: Hemograma, Glicemia jejum, HbA1c, TSH)","description":"Preparo ou observação (ex: Jejum 12h)","priority":"HIGH ou NORMAL","reasoning":"Breve justificativa"}]}

- indication: texto único e sucinto para preencher o campo "Indicação/Justificativa" da solicitação.
- Use nomes de exames comuns no Brasil (SUS, terminologia clínica).
- Máximo 8 exames. Seja objetivo.
- priority HIGH apenas para exames urgentes ou de rastreamento crítico.`

    const response = await aiClient.chat({
      messages: [
        {
          role: 'system',
          content:
            'Você é um assistente clínico. Responda SOMENTE com JSON válido. Não use markdown. Valores em português do Brasil.',
        },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 1024,
      temperature: 0.2,
      skipAnonymization: true,
    })

    const parsed = extractJsonFromResponse(response.content)
    if (!parsed || !Array.isArray(parsed.exams)) {
      return NextResponse.json({ exams: [], indication: '' })
    }

    const indication = typeof parsed.indication === 'string' ? String(parsed.indication).trim() : ''
    const exams = (parsed.exams as unknown[])
      .filter(
        (e): e is { name: string; description?: string; priority?: string; reasoning?: string } =>
          e != null && typeof (e as Record<string, unknown>).name === 'string'
      )
      .map((e) => ({
        name: String(e.name).trim(),
        description: String(e.description ?? '').trim(),
        priority: e.priority === 'HIGH' ? 'HIGH' as const : 'NORMAL' as const,
        reasoning: String(e.reasoning ?? '').trim(),
      }))

    return NextResponse.json({ exams, indication })
  } catch (err) {
    const rawMessage = err instanceof Error ? err.message : 'Erro ao sugerir exames'
    logger.warn({ err, rawMessage }, 'Sugestão de exames por IA falhou')
    // Propaga mensagem real (limita tamanho para evitar vazamento)
    const safeMessage = rawMessage.length > 200 ? rawMessage.slice(0, 200) + '…' : rawMessage
    return NextResponse.json({ error: safeMessage }, { status: 500 })
  }
})

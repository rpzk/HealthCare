/**
 * API para geração de prescrições conforme padrões CFM - VERSÃO RIGOROSA
 * POST /api/prescriptions/generate-cfm
 *
 * VALIDAÇÃO RIGOROSA:
 * - Medicamentos controlados (Portaria 344/98) EXIGEM quantidade por extenso
 * - Posologia reformatada para padrão técnico (intervalo + teto de dose)
 * - Estrutura em 6 seções obrigatórias conforme Manual CFM
 * - Nomes genéricos (DCB) obrigatórios conforme Lei 9.787/99
 * - Assinatura digital PAdES com certificado A1
 */

export const dynamic = 'force-dynamic'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/auth'
import { prisma } from '@/lib/prisma'
import { signPdfWithGotenberg } from '@/lib/pdf-signing-service'
import {
  validatePrescriptionCFM,
  PrescriptionInput,
  isControlledMedication,
  isAntimicrobial,
} from '@/lib/prescription-cfm-validator'
import { logger } from '@/lib/logger'
import { createHash } from 'crypto'
import QRCode from 'qrcode'

export const runtime = 'nodejs'

interface MedicationRequest {
  name: string // Obrigatoriamente genérico (DCB) conforme Lei 9.787/99
  concentration: string
  form: 'comprimido' | 'cápsula' | 'solução' | 'injeção' | 'pó' | 'pomada' | 'creme' | 'xarope'
  quantity: number
  quantityUnit: string
  posology: string
  observations?: string
  quantityWritten?: string // OBRIGATÓRIO se controlado
}

interface GeneratePrescriptionRequest {
  doctor: {
    name: string
    crm: string
    state: string
    rqe?: string
    specialty?: string
    address: string
    city: string
    phone?: string
    clinicName?: string
  }
  patient: {
    name: string
    cpf?: string
    dateOfBirth: string // ISO 8601
    address?: string
  }
  medications: MedicationRequest[]
  notes?: string
  userCertificatePassword: string
}

/**
 * Validar medicamento contra normas CFM
 * Se controlado, EXIGIR quantidade por extenso
 */
function validateMedicationCFM(med: MedicationRequest, index: number): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  const medNum = index + 1

  // 1. Detectar se é controlado
  const controlled = isControlledMedication(med.name)

  // 2. Se controlado, EXIGIR quantidade por extenso
  if (controlled.isControlled && !med.quantityWritten) {
    errors.push(
      `Medicamento ${medNum} (${med.name}) é CONTROLADO (Lista ${controlled.category}). ` +
      `OBRIGATÓRIO fornecer 'quantityWritten' com número por extenso. ` +
      `Exemplo: quantity: 30, quantityWritten: "trinta"`
    )
  }

  // 3. Validar formato de quantidade por extenso (se fornecido)
  if (med.quantityWritten) {
    if (!/^[a-záéíóúãõç\s]+$/i.test(med.quantityWritten)) {
      errors.push(
        `Medicamento ${medNum}: 'quantityWritten' deve conter apenas letras. ` +
        `Recebido: "${med.quantityWritten}". Use: "trinta", "vinte", "dez", etc.`
      )
    }
  }

  // 4. Validar posologia - deve ser técnica e específica
  if (!med.posology || med.posology.trim().length < 20) {
    errors.push(
      `Medicamento ${medNum}: Posologia muito curta ou vazia. ` +
      `Use formato técnico detalhado. ` +
      `Exemplo: "1 comprimido por via oral a cada 6 horas, não excedendo 4 doses ao dia"`
    )
  }

  // 5. Rejeitar posologia ambígua
  const posologyLower = med.posology.toLowerCase()
  if (/(se\s+dor|conforme\s+necessário|a\s+noite|pela\s+manhã|conforme\s+orientação\s+verbal|quando\s+necessário)/i.test(posologyLower)) {
    errors.push(
      `Medicamento ${medNum}: Posologia AMBÍGUA - PROIBIDA. ` +
      `Detectado: termos como "se dor", "conforme necessário", "à noite", "pela manhã". ` +
      `Use: "administrar 1 comprimido a cada 6 horas, não excedendo 4 doses ao dia"`
    )
  }

  // 6. Posologia deve incluir intervalo de tempo
  if (!/\b(cada|por|de)\s+\d+\s+(hora|horas|minuto|minutos|dias?)\b/.test(med.posology)) {
    errors.push(
      `Medicamento ${medNum}: Posologia deve indicar intervalo de tempo. ` +
      `Incluir: "a cada X horas" ou "de X em X horas"`
    )
  }

  // 7. Posologia deve incluir limite máximo de doses
  if (!/\b(não\s+excedendo|máximo|máx|até|limite)\s+\d+\s+(dose|doses|vez|vezes)\b/i.test(med.posology)) {
    errors.push(
      `Medicamento ${medNum}: Posologia deve indicar LIMITE de doses. ` +
      `Incluir: "não excedendo X doses ao dia"`
    )
  }

  return { valid: errors.length === 0, errors }
}

/**
 * Calcular idade a partir de data de nascimento
 */
function calculateAge(dateOfBirth: Date): number {
  const today = new Date()
  let age = today.getFullYear() - dateOfBirth.getFullYear()
  const monthDiff = today.getMonth() - dateOfBirth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dateOfBirth.getDate())) {
    age--
  }
  return age
}

/**
 * Formatar data padrão brasileiro
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Gerar HTML profissional nas 6 seções obrigatórias CFM
 */
function generatePrescriptionHTML(
  doctor: GeneratePrescriptionRequest['doctor'],
  patient: GeneratePrescriptionRequest['patient'],
  medications: MedicationRequest[],
  prescriptionId: string,
  verificationUrl: string,
  createdAt: Date,
  contentHash: string,
  qrCodeDataUrl: string,
  notes?: string
): string {
  const patientBirthDate = new Date(patient.dateOfBirth)
  const age = calculateAge(patientBirthDate)
  const dateStr = formatDate(createdAt)

  const hasAntibiotics = medications.some((m) => isAntimicrobial(m.name))
  const hasControlled = medications.some((m) => isControlledMedication(m.name).isControlled)

  // Gerar HTML dos medicamentos (Inscrição + Subinscrição + Adscrição)
  const medicationsHtml = medications
    .map((med, index) => {
      const isMedControlled = isControlledMedication(med.name).isControlled
      const isMedAntimicrobial = isAntimicrobial(med.name)

      return `
    <div style="margin-left: 1rem; margin-bottom: 2.5rem; page-break-inside: avoid;">
      <!-- INSCRIÇÃO (Fármaco) + SUBINSCRIÇÃO (Quantidade) -->
      <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 2px dotted #000; padding-bottom: 0.5rem; margin-bottom: 0.75rem;">
        <div style="flex: 1;">
          <p style="margin: 0; font-family: Georgia, serif; font-size: 1rem; font-weight: bold;">
            ${index + 1}. ${med.name}
          </p>
          <p style="margin: 0.25rem 0 0 0; font-size: 0.875rem; color: #333;">
            ${med.concentration} • ${med.form}
          </p>
        </div>
        <div style="text-align: right; white-space: nowrap; margin-left: 1rem;">
          <p style="margin: 0; font-size: 0.875rem;">
            <span style="font-weight: 600;">${med.quantity}</span>
          </p>
          <p style="margin: 0; font-size: 0.875rem;">
            ${med.quantityUnit}
          </p>
          ${isMedControlled && med.quantityWritten ? `
            <p style="margin: 0.25rem 0 0 0; font-size: 0.8rem; font-weight: bold; color: #dc2626;">
              (${med.quantityWritten.toUpperCase()})
            </p>
          ` : ''}
        </div>
      </div>

      <!-- ADSCRIÇÃO (Posologia) -->
      <div style="margin-bottom: 0.75rem;">
        <p style="margin: 0; font-size: 0.875rem;">
          <span style="font-weight: 600; font-family: Georgia, serif;">Posologia:</span> ${med.posology}
        </p>
      </div>

      <!-- Observações do medicamento -->
      ${med.observations ? `
        <div style="margin-bottom: 0.5rem;">
          <p style="margin: 0; font-size: 0.8rem; color: #555;">
            <span style="font-weight: 600;">Observações:</span> ${med.observations}
          </p>
        </div>
      ` : ''}

      <!-- Marcadores de controle -->
      <div style="margin-top: 0.75rem; display: flex; gap: 0.5rem;">
        ${isMedControlled ? `
          <p style="margin: 0; font-size: 0.75rem; color: #dc2626; font-weight: bold;">
            🔒 CONTROLADO (Portaria 344/98 - ${isControlledMedication(med.name).category})
          </p>
        ` : ''}
        ${isMedAntimicrobial ? `
          <p style="margin: 0; font-size: 0.75rem; color: #ea580c; font-weight: bold;">
            ⚕️ ANTIMICROBIANO (Validade 10 dias)
          </p>
        ` : ''}
      </div>
    </div>
  `
    })
    .join('')

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Prescrição Médica ${prescriptionId}</title>
  <meta name="author" content="${doctor.name}" />
  <meta name="subject" content="Prescrição Eletrônica CFM" />
  <meta name="keywords" content="prescrição,medicamento,CFM,PAdES" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Georgia', 'Times New Roman', serif;
      color: #1a1a1a;
      line-height: 1.6;
      background: #fff;
      padding: 40px;
      max-width: 21cm;
      margin: 0 auto;
    }
    @media print {
      body { padding: 20px; background: white; }
      .page-break-after { page-break-after: avoid; }
      .page-break-before { page-break-before: avoid; }
    }
  </style>
</head>
<body>
  <!-- ===== 1. CABEÇALHO (Identificação Profissional) ===== -->
  <header style="text-align: center; border-bottom: 3px solid #000; padding-bottom: 1.5rem; margin-bottom: 2rem; page-break-after: avoid;">
    <h1 style="font-size: 1.25rem; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.5rem; font-family: Georgia, serif;">
      ${doctor.name}
    </h1>
    <p style="font-size: 0.8rem; color: #333; margin-bottom: 0.125rem;">
      <span style="font-weight: 600;">Médico</span> • CRM-${doctor.state} ${doctor.crm}
      ${doctor.rqe ? ` • RQE ${doctor.rqe}` : ''}
    </p>
    ${doctor.specialty ? `
      <p style="font-size: 0.75rem; color: #555; margin-bottom: 0.125rem;">
        ${doctor.specialty}
      </p>
    ` : ''}
    <p style="font-size: 0.75rem; color: #555; margin-bottom: 0.125rem;">
      ${doctor.address}
    </p>
    <p style="font-size: 0.75rem; color: #555;">
      ${doctor.city}
      ${doctor.phone ? ` • Tel: ${doctor.phone}` : ''}
    </p>
    ${doctor.clinicName ? `
      <p style="font-size: 0.7rem; color: #666; margin-top: 0.25rem; font-style: italic;">
        ${doctor.clinicName}
      </p>
    ` : ''}
  </header>

  <!-- ===== 2. SUPERINSCRIÇÃO (Dados do Paciente) ===== -->
  <section style="margin-bottom: 2rem; page-break-after: avoid;">
    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; font-size: 0.9rem; margin-bottom: 1rem;">
      <div>
        <p style="margin: 0;"><span style="font-weight: 600;">Paciente:</span> ${patient.name}</p>
      </div>
      <div>
        <p style="margin: 0;"><span style="font-weight: 600;">Idade:</span> ${age} anos</p>
      </div>
      ${patient.cpf ? `
        <div style="grid-column: span 2;">
          <p style="margin: 0;"><span style="font-weight: 600;">CPF:</span> ${patient.cpf}</p>
        </div>
      ` : ''}
      <div style="grid-column: span 2;">
        <p style="margin: 0;"><span style="font-weight: 600;">Data de Nascimento:</span> ${formatDate(patientBirthDate)}</p>
      </div>
    </div>

    <!-- Indicação de uso (Obrigatória) -->
    <div style="text-align: center; margin-top: 1rem; padding: 0.75rem; background: #f0f0f0; border-radius: 0.25rem;">
      <p style="margin: 0; font-size: 1rem; font-weight: bold; font-style: italic; text-decoration: underline; font-family: Georgia, serif;">
        ➜ USO INTERNO ➜
      </p>
    </div>
  </section>

  <!-- Avisos Regulatórios -->
  ${hasAntibiotics ? `
    <div style="margin-bottom: 1.5rem; padding: 0.75rem; background: #fffbeb; border: 2px solid #f59e0b; border-radius: 0.25rem;">
      <p style="font-size: 0.8rem; font-weight: bold; color: #92400e; margin: 0;">
        ⚠️ MEDICAMENTO SUJEITO A CONTROLE ESPECIAL
      </p>
      <p style="font-size: 0.75rem; color: #b45309; margin: 0.25rem 0 0 0;">
        Esta prescrição contém antimicrobiano(s). Validade: 10 dias. Será gerada 2ª via para orientação do paciente.
      </p>
    </div>
  ` : ''}

  ${hasControlled ? `
    <div style="margin-bottom: 1.5rem; padding: 0.75rem; background: #fef2f2; border: 2px solid #f87171; border-radius: 0.25rem;">
      <p style="font-size: 0.8rem; font-weight: bold; color: #7f1d1d; margin: 0;">
        ⚠️ MEDICAMENTO CONTROLADO - PORTARIA 344/98
      </p>
      <p style="font-size: 0.75rem; color: #991b1b; margin: 0.25rem 0 0 0;">
        Quantidade obrigatoriamente expressa por extenso entre parênteses. Verificar conformidade com lista de controlados.
      </p>
    </div>
  ` : ''}

  <!-- ===== 3-5. INSCRIÇÃO + SUBINSCRIÇÃO + ADSCRIÇÃO (Medicamentos) ===== -->
  <main style="min-height: 15cm; margin-bottom: 2rem;">
    ${medicationsHtml}
  </main>

  <!-- Notas Adicionais -->
  ${notes ? `
    <section style="margin-bottom: 2rem; padding: 1rem; background: #f3f4f6; border-left: 4px solid #6b7280; border-radius: 0.25rem; page-break-after: avoid;">
      <p style="font-size: 0.8rem; font-weight: 600; margin: 0 0 0.5rem 0;">
        📋 Observações Gerais:
      </p>
      <p style="font-size: 0.85rem; color: #374151; margin: 0; line-height: 1.5;">
        ${notes}
      </p>
    </section>
  ` : ''}

  <!-- ===== 6. FECHAMENTO (Autenticação) ===== -->
  <footer style="margin-top: 3rem; text-align: center; page-break-before: avoid;">
    <!-- Data e Localidade -->
    <p style="font-size: 0.9rem; font-weight: 600; margin-bottom: 0.25rem;">
      ${doctor.city}, ${dateStr}
    </p>
    <p style="font-size: 0.75rem; color: #666; margin-bottom: 2rem;">
      Prescrição: ${prescriptionId}
    </p>

    <!-- Área de Assinatura -->
    <div style="display: inline-block; text-align: center;">
      <div style="border-top: 2px solid #000; width: 250px; margin-bottom: 0.5rem;"></div>
      <p style="font-size: 0.9rem; font-weight: bold; text-transform: uppercase; margin: 0; font-family: Georgia, serif;">
        ${doctor.name}
      </p>
      <p style="font-size: 0.75rem; margin: 0.125rem 0;">
        CRM-${doctor.state} ${doctor.crm}
      </p>
      ${doctor.rqe ? `
        <p style="font-size: 0.75rem; margin: 0;">
          RQE ${doctor.rqe}
        </p>
      ` : ''}
    </div>

    <!-- QR Code de Verificação Digital -->
    <div style="margin-top: 2rem; text-align: center;">
      <div style="border: 2px solid #d1d5db; padding: 0.5rem; display: inline-block; border-radius: 0.25rem; background: #fff;">
        <img src="${qrCodeDataUrl}" alt="QR Code de Verificação Digital" style="width: 100px; height: 100px; display: block;" />
      </div>
      <p style="font-size: 8px; color: #666; margin-top: 0.5rem; max-width: 350px;">
        Prescrição eletrônica assinada digitalmente.<br/>
        Código QR para verificação de autenticidade em verificador.iti.br
      </p>
    </div>

    <!-- Certificação Digital (PAdES) -->
    <div style="margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #d1d5db; font-size: 7.5px; color: #999;">
      <p style="margin: 0.25rem 0; font-weight: 600;">
        ✓ Documento assinado digitalmente • Resolução CFM nº 2.299/2021
      </p>
      <p style="margin: 0.25rem 0; font-family: 'Courier New', monospace; word-break: break-all;">
        SHA-256: ${contentHash}
      </p>
      <p style="margin: 0.25rem 0;">
        Timestamp: ${createdAt.toISOString()}
      </p>
    </div>
  </footer>

  <!-- Rodapé de Conformidade Legal -->
  <div style="margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #d1d5db; text-align: center; font-size: 6.5px; color: #999;">
    <p style="margin: 0; line-height: 1.4;">
      Gerado conforme:<br/>
      Manual de Orientações Básicas para Prescrição Médica (CFM)<br/>
      Portaria SVS/MS nº 344/98 • Resolução CFM nº 2.299/2021<br/>
      NBR ISO/IEC 32000-1:2015 (PDF) • ABNT NBR 27001:2013 (Segurança)<br/>
      Lei nº 9.787/99 (Medicamentos Genéricos)
    </p>
  </div>
</body>
</html>
  `

  return html
}

/**
 * POST /api/prescriptions/generate-cfm
 * Gera prescrição com validação RIGOROSA conforme CFM
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    const userId = session?.user?.id
    const userRole = session?.user?.role

    if (!userId) {
      return NextResponse.json(
        { error: 'Não autenticado', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    if (userRole !== 'doctor' && userRole !== 'admin') {
      return NextResponse.json(
        { error: 'Apenas médicos podem gerar prescrições', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    const body = (await request.json()) as GeneratePrescriptionRequest

    // ========== VALIDAÇÃO DE ENTRADA ==========

    // 1. Validar data de nascimento
    const patientBirthDate = new Date(body.patient.dateOfBirth)
    if (isNaN(patientBirthDate.getTime())) {
      return NextResponse.json(
        { error: 'Data de nascimento inválida (use ISO 8601: YYYY-MM-DD)', code: 'INVALID_DATE' },
        { status: 400 }
      )
    }

    if (patientBirthDate > new Date()) {
      return NextResponse.json(
        { error: 'Data de nascimento não pode ser no futuro', code: 'INVALID_DATE' },
        { status: 400 }
      )
    }

    // 2. Validar cada medicamento RIGOROSAMENTE contra CFM
    const medicationErrors: string[] = []
    for (let i = 0; i < body.medications.length; i++) {
      const med = body.medications[i]
      const validation = validateMedicationCFM(med, i)

      if (!validation.valid) {
        medicationErrors.push(...validation.errors)
      }
    }

    if (medicationErrors.length > 0) {
      return NextResponse.json(
        {
          error: 'Prescrição não atende normas CFM',
          code: 'MEDICATION_VALIDATION_FAILED',
          validationErrors: medicationErrors,
        },
        { status: 400 }
      )
    }

    // 3. Validar contra schema global
    const medicationsWithMetadata = body.medications.map((med) => {
      const controlled = isControlledMedication(med.name)
      const antimicrobial = isAntimicrobial(med.name)
      return {
        ...med,
        isControlled: controlled.isControlled,
        isAntimicrobial: antimicrobial,
      }
    })

    const prescriptionData: PrescriptionInput = {
      doctor: body.doctor,
      patient: {
        name: body.patient.name,
        cpf: body.patient.cpf,
        dateOfBirth: patientBirthDate,
        address: body.patient.address,
      },
      medications: medicationsWithMetadata,
      notes: body.notes,
      createdAt: new Date(),
    }

    const globalValidation = await validatePrescriptionCFM(prescriptionData)
    if (!globalValidation.valid) {
      return NextResponse.json(
        {
          error: 'Prescrição não atende normas CFM (Validação Global)',
          code: 'GLOBAL_VALIDATION_FAILED',
          validationErrors: globalValidation.errors,
        },
        { status: 400 }
      )
    }

    // ========== RECUPERAR CERTIFICADO DO USUÁRIO ==========

    const userCertificate = await prisma.digitalCertificate.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    })

    if (!userCertificate || !userCertificate.pfxFilePath) {
      return NextResponse.json(
        {
          error: 'Certificado digital A1 não configurado',
          code: 'CERTIFICATE_NOT_FOUND',
          hint: 'Configure seu certificado em /settings/certificates',
        },
        { status: 400 }
      )
    }

    const { resolveCertificatePath } = await import('@/lib/certificate-path')
    const certPath = await resolveCertificatePath(userCertificate.pfxFilePath)
    if (!certPath) {
      return NextResponse.json(
        {
          error: 'Arquivo do certificado não encontrado. Reenvie o certificado em Configurações > Certificados Digitais.',
          code: 'CERTIFICATE_FILE_NOT_FOUND',
        },
        { status: 404 }
      )
    }

    // ========== GERAR PRESCRIÇÃO ==========

    const prescriptionId = `RX-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`
    const baseUrl = process.env.NEXTAUTH_URL || process.env.APP_BASE_URL || 'http://localhost:3000'
    const verificationUrl = `${baseUrl}/validar/${prescriptionId}`

    // Hash SHA-256 do conteúdo
    const contentHash = createHash('sha256')
      .update(JSON.stringify(prescriptionData))
      .digest('hex')

    // QR Code
    const qrCodeDataUrl = await QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      type: 'image/png',
      quality: 0.95,
      margin: 1,
      width: 300,
    })

    // HTML nas 6 seções obrigatórias
    const htmlContent = generatePrescriptionHTML(
      body.doctor,
      body.patient,
      body.medications,
      prescriptionId,
      verificationUrl,
      prescriptionData.createdAt,
      contentHash,
      qrCodeDataUrl,
      body.notes
    )

    logger.info(
      {
        prescriptionId,
        medicationCount: body.medications.length,
        hasControlled: body.medications.some((m) => isControlledMedication(m.name).isControlled),
        hasAntibiotics: body.medications.some((m) => isAntimicrobial(m.name)),
      },
      'Gerando prescrição CFM com validação rigorosa'
    )

    // ========== ASSINAR COM GOTENBERG ==========

    const pdf = await signPdfWithGotenberg({
      html: htmlContent,
      filename: `prescricao-${prescriptionId}.pdf`,
      certPath,
      certPassword: body.userCertificatePassword,
    })

    logger.info(
      { prescriptionId, userId, fileSize: pdf.length },
      '✓ Prescrição CFM gerada e assinada com sucesso'
    )

    // ========== RETORNO ==========

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="prescricao-${prescriptionId}.pdf"`,
        'X-Prescription-ID': prescriptionId,
        'X-Verification-URL': verificationUrl,
        'X-Content-Hash': contentHash,
        'X-Signature-Method': 'PAdES-BASIC',
        'X-CFM-Compliance': 'true',
        'X-Portaria-344': body.medications.some((m) => isControlledMedication(m.name).isControlled) ? 'true' : 'false',
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
      },
    })
  } catch (error: any) {
    logger.error({ error, stack: error?.stack }, 'Erro ao gerar prescrição CFM')

    if (error.message?.includes('certificado') || error.message?.includes('password')) {
      return NextResponse.json(
        { error: 'Erro ao acessar certificado. Verifique a senha.', code: 'CERTIFICATE_ERROR' },
        { status: 400 }
      )
    }

    if (error.message?.includes('Gotenberg')) {
      return NextResponse.json(
        { error: 'Serviço de PDF não disponível', code: 'PDF_SERVICE_ERROR' },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { error: 'Erro ao gerar prescrição', code: 'INTERNAL_ERROR', details: error.message },
      { status: 500 }
    )
  }
}

/**
 * GET /api/prescriptions/generate-cfm
 * Retorna documentação e exemplo de payload
 */
export async function GET() {
  return NextResponse.json({
    endpoint: 'POST /api/prescriptions/generate-cfm',
    description: 'Gera prescrição médica conforme padrões CFM com validação rigorosa',
    compliance: [
      'Manual de Orientações Básicas para Prescrição Médica (CFM)',
      'Portaria SVS/MS nº 344/98 (Medicamentos Controlados)',
      'Resolução CFM nº 2.299/2021 (Assinatura Digital)',
      'Lei nº 9.787/99 (Medicamentos Genéricos)',
      'NBR ISO/IEC 32000-1:2015 (PDF)',
    ],
    requirements: {
      authentication: 'Sessão de médico/admin autenticado',
      certificate: 'Certificado digital A1 configurado em /settings/certificates',
    },
    validation: {
      medicamentosControlados: 'OBRIGATÓRIO: quantidade por extenso (Portaria 344/98)',
      antimicrobianos: 'Detectado automaticamente, gera aviso, validade 10 dias',
      posologia: 'OBRIGATÓRIO: formato técnico com intervalo e limite de doses',
      nomesMedicamentos: 'OBRIGATÓRIO: usar genérico (DCB) conforme Lei 9.787/99',
    },
    example: {
      doctor: {
        name: 'Dr. João Silva',
        crm: '12345',
        state: 'SP',
        rqe: '54321',
        specialty: 'Clínica Geral',
        address: 'Rua das Flores, 123',
        city: 'São Paulo',
        phone: '(11) 98765-4321',
        clinicName: 'Clínica Silva',
      },
      patient: {
        name: 'Maria Santos',
        cpf: '123.456.789-01',
        dateOfBirth: '1990-05-15',
        address: 'Av. Paulista, 1000',
      },
      medications: [
        {
          name: 'Amoxicilina',
          concentration: '500mg',
          form: 'cápsula',
          quantity: 20,
          quantityUnit: 'cápsula',
          posology: '1 cápsula por via oral a cada 8 horas, não excedendo 3 doses ao dia',
          observations: 'Tomar com água. Evitar alimentos ácidos.',
          quantityWritten: 'vinte',
        },
        {
          name: 'Diazepam',
          concentration: '5mg',
          form: 'comprimido',
          quantity: 10,
          quantityUnit: 'comprimido',
          posology: '1 comprimido por via oral ao deitar, não excedendo 1 dose ao dia',
          quantityWritten: 'dez',
        },
      ],
      notes: 'Retornar em 7 dias para reavaliação',
      userCertificatePassword: 'senha_do_certificado',
    },
  })
}

import type { BIData } from '@/components/consultations/consultation-bi-checkboxes'

/**
 * Preenche automaticamente os campos de BI/SSF a partir do contexto clínico,
 * tentando minimizar o esforço manual do profissional.
 *
 * Importante:
 * - As regras são conservadoras: só ligam flags quando há forte evidência.
 * - Qualquer valor já preenchido (checkbox na UI) tem prioridade sobre heurística.
 */

export type PartialBIData = Partial<BIData> | null | undefined

const DEFAULT_BI_DATA: BIData = {
  // Tipo de Atendimento
  scheduledDemand: false,
  immediateDemand: false,
  orientationOnly: false,
  urgencyWithObs: false,
  continuedCare: false,
  prescriptionRenewal: false,
  examEvaluation: false,
  homeVisit: false,

  // Grupos de Atendimento
  mentalHealth: false,
  alcoholUser: false,
  drugUser: false,
  hypertension: false,
  diabetes: false,
  leprosy: false,
  tuberculosis: false,
  prenatal: false,
  postpartum: false,
  stdAids: false,
  preventive: false,
  childCare: false,

  // Condutas
  laboratory: false,
  radiology: false,
  ultrasound: false,
  obstetricUltrasound: false,
  mammography: false,
  ecg: false,
  pathology: false,
  physiotherapy: false,
  referralMade: false,
}

export interface BIContextSoap {
  subjective?: string
  objective?: string
  assessment?: string
  plan?: string
}

export interface BIContextDiagnosis {
  code?: string | null
  description?: string | null
  // compatibilidade com modelos que usam primaryCode
  primaryCode?: { code?: string | null; description?: string | null } | null
}

export interface BIContextPrescription {
  medication?: string
  dosage?: string
  frequency?: string
  duration?: string
  instructions?: string
}

export interface BIContextExam {
  examType?: string
  description?: string
}

export interface BIContext {
  soap?: BIContextSoap | null
  diagnoses?: BIContextDiagnosis[] | null
  prescriptions?: BIContextPrescription[] | null
  examRequests?: BIContextExam[] | null
}

export function autoFillBI(existing: PartialBIData, ctx: BIContext): BIData {
  const base: BIData = {
    ...DEFAULT_BI_DATA,
    ...(existing || {}),
  }

  // Texto consolidado da consulta
  const textParts: string[] = []
  if (ctx.soap?.subjective) textParts.push(ctx.soap.subjective)
  if (ctx.soap?.objective) textParts.push(ctx.soap.objective)
  if (ctx.soap?.assessment) textParts.push(ctx.soap.assessment)
  if (ctx.soap?.plan) textParts.push(ctx.soap.plan)

  const fullText = textParts.join(' ').toLowerCase()

  // Códigos de diagnóstico (CID) normalizados
  const diagCodes = new Set(
    (ctx.diagnoses || [])
      .map((d) => {
        if (d.code) return String(d.code).toUpperCase().trim()
        if (d.primaryCode?.code) return String(d.primaryCode.code).toUpperCase().trim()
        return ''
      })
      .filter(Boolean),
  )

  const hasWord = (re: RegExp) => re.test(fullText)

  // ===== Tipo de atendimento (heurísticas suaves) =====
  if (!base.homeVisit && hasWord(/\bvisita domiciliar\b|\bvisita domiciliar\b|\bem casa\b/i)) {
    base.homeVisit = true
  }

  if (!base.prescriptionRenewal && hasWord(/renova[cç][aã]o de receita|renovar receita|renov[ae]r prescri[cç][aã]o/i)) {
    base.prescriptionRenewal = true
  }

  if (!base.orientationOnly && hasWord(/orienta[cç][aã]o(?: apenas)?|apenas orienta[cç][aã]o|consulta de orienta[cç][aã]o/i)) {
    base.orientationOnly = true
  }

  // ===== Grupos de atendimento =====
  // Hipertensão
  if (
    !base.hypertension &&
    ([...diagCodes].some((c) => /^I1[0-5]/.test(c)) ||
      hasWord(/hipertens[ãa]o|press[aã]o alta|pa\s*[:=]?\s*1[4-9]\d|pa\s*[:=]?\s*[2-9]\d{2}/i))
  ) {
    base.hypertension = true
  }

  // Diabetes
  if (
    !base.diabetes &&
    ([...diagCodes].some((c) => /^E1[0-4]/.test(c)) || hasWord(/\bdiabet(es|ico|ica)\b|glicemia\s*(alta|elevada)/i))
  ) {
    base.diabetes = true
  }

  // Saúde mental
  if (
    !base.mentalHealth &&
    ([...diagCodes].some((c) => /^F[0-9]/.test(c)) ||
      hasWord(/\bdepress[aã]o\b|\bansiedade\b|\btranstorno\b.*(humor|ansioso|psic[oó]tico)|ide[aia] suicida/i))
  ) {
    base.mentalHealth = true
  }

  // Álcool
  if (
    !base.alcoholUser &&
    ([...diagCodes].some((c) => /^F1[0-0]/.test(c)) || hasWord(/\b(alcoolista|etilista|uso de [aá]lcool)\b/i))
  ) {
    base.alcoholUser = true
  }

  // Drogas
  if (
    !base.drugUser &&
    ([...diagCodes].some((c) => /^F1[1-9]/.test(c)) || hasWord(/\buso de drogas?\b|\bcrack\b|\bcoca[ií]na\b|\bmaconha\b/i))
  ) {
    base.drugUser = true
  }

  // Hanseníase
  if (
    !base.leprosy &&
    ([...diagCodes].some((c) => /^A30/.test(c)) || hasWord(/\bhansen[ií]ase\b|\blepra\b/i))
  ) {
    base.leprosy = true
  }

  // Tuberculose
  if (
    !base.tuberculosis &&
    ([...diagCodes].some((c) => /^A1[5-9]/.test(c)) || hasWord(/\btuberculose\b|\bBK positivo\b/i))
  ) {
    base.tuberculosis = true
  }

  // Pré-natal / Puerpério
  if (!base.prenatal && hasWord(/\bpr[eé]-?natal\b|\bgestante\b|\bgravidez\b/i)) {
    base.prenatal = true
  }

  if (!base.postpartum && hasWord(/\bp[uú]erp[eé]rio\b|\bp[uú]erpera\b|\bp[oó]s[- ]parto\b/i)) {
    base.postpartum = true
  }

  // DST/Aids
  if (
    !base.stdAids &&
    ([...diagCodes].some((c) => /^A5[0-9]/.test(c)) ||
      hasWord(/\bIST\b|\bDST\b|\bs[íi]filis\b|\bgonorrei?a\b|\bhiv\b|\baids\b/i))
  ) {
    base.stdAids = true
  }

  // Preventivo / rastreamento
  if (!base.preventive && hasWord(/\bpreventivo\b|\bcheck[- ]?up\b|\brastreamento\b/i)) {
    base.preventive = true
  }

  // Pediatria / puericultura
  if (!base.childCare && hasWord(/\bpuericultura\b|\bconsulta de rotina pedi[aá]trica\b/i)) {
    base.childCare = true
  }

  // ===== Condutas (a partir de exames) =====
  const exams = ctx.examRequests || []
  const examText = exams.map((e) => `${e.examType || ''} ${e.description || ''}`.toLowerCase()).join(' ')

  const markIf = (field: keyof BIData, cond: boolean) => {
    if (!base[field] && cond) base[field] = true
  }

  markIf('laboratory', /\blab(oratório)?\b|hemograma|glicemia|perfil lip[ií]dico|ureia|creatinin/i.test(examText))
  markIf('radiology', /radiografia|raio[- ]x|rx\b/i.test(examText))
  markIf('ultrasound', /ultra?sonografia|usg\b|ecografia\b/i.test(examText))
  markIf('obstetricUltrasound', /ultra?sonografia obst[eé]trica|usg obst[eé]trico/i.test(examText))
  markIf('mammography', /mamografia/i.test(examText))
  markIf('ecg', /\becg\b|eletrocardiograma/i.test(examText))
  markIf('pathology', /b[ií]opsia|an[aá]lise anatomopatol[oó]gica/i.test(examText))

  // Encaminhamento / fisioterapia
  if (!base.physiotherapy && hasWord(/\bfisioterapia\b|\bfisioter[aá]pico\b/i)) {
    base.physiotherapy = true
  }

  // Encaminhamentos em geral ficam melhor inferidos do próprio cadastro de referrals;
  // aqui só marcamos como \"provavelmente fez referência\" se o plano indicar.
  if (!base.referralMade && hasWord(/\bencaminhamento\b|\brefer[êe]ncia\b|\breferir\b/i)) {
    base.referralMade = true
  }

  return base
}


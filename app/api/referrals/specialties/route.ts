/**
 * API de autocomplete de especialidades para encaminhamento
 * 
 * GET /api/referrals/specialties
 * 
 * Parâmetros:
 * - q: termo de busca (opcional)
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Lista de especialidades médicas comuns no SUS/Brasil
const SPECIALTIES = [
  { code: 'CARDIO', name: 'Cardiologia', description: 'Doenças do coração e sistema cardiovascular' },
  { code: 'DERMATO', name: 'Dermatologia', description: 'Doenças da pele' },
  { code: 'ENDOCRINO', name: 'Endocrinologia', description: 'Distúrbios hormonais e metabólicos' },
  { code: 'GASTRO', name: 'Gastroenterologia', description: 'Doenças do sistema digestivo' },
  { code: 'GERIATRIA', name: 'Geriatria', description: 'Saúde do idoso' },
  { code: 'GINECO', name: 'Ginecologia', description: 'Saúde da mulher' },
  { code: 'HEMATO', name: 'Hematologia', description: 'Doenças do sangue' },
  { code: 'INFECTO', name: 'Infectologia', description: 'Doenças infecciosas' },
  { code: 'MASTOLOGIA', name: 'Mastologia', description: 'Doenças da mama' },
  { code: 'NEFRO', name: 'Nefrologia', description: 'Doenças dos rins' },
  { code: 'NEURO', name: 'Neurologia', description: 'Doenças do sistema nervoso' },
  { code: 'NUTRI', name: 'Nutrição', description: 'Orientação nutricional' },
  { code: 'OFTALMO', name: 'Oftalmologia', description: 'Doenças dos olhos' },
  { code: 'ONCO', name: 'Oncologia', description: 'Tratamento do câncer' },
  { code: 'ORTOPEDIA', name: 'Ortopedia', description: 'Doenças dos ossos e articulações' },
  { code: 'OTORRINO', name: 'Otorrinolaringologia', description: 'Doenças de ouvido, nariz e garganta' },
  { code: 'PEDIATRIA', name: 'Pediatria', description: 'Saúde da criança' },
  { code: 'PNEUMO', name: 'Pneumologia', description: 'Doenças respiratórias' },
  { code: 'PROCTOLOGIA', name: 'Proctologia', description: 'Doenças do intestino grosso' },
  { code: 'PSIQUIATRIA', name: 'Psiquiatria', description: 'Saúde mental' },
  { code: 'PSICOLOGIA', name: 'Psicologia', description: 'Acompanhamento psicológico' },
  { code: 'REUMATO', name: 'Reumatologia', description: 'Doenças reumáticas' },
  { code: 'UROLOGIA', name: 'Urologia', description: 'Doenças do sistema urinário' },
  { code: 'VASCULAR', name: 'Angiologia/Vascular', description: 'Doenças vasculares' },
  { code: 'FISIO', name: 'Fisioterapia', description: 'Reabilitação física' },
  { code: 'FONO', name: 'Fonoaudiologia', description: 'Distúrbios de fala e audição' },
  { code: 'TO', name: 'Terapia Ocupacional', description: 'Reabilitação ocupacional' },
  { code: 'CIRURGIA_GERAL', name: 'Cirurgia Geral', description: 'Procedimentos cirúrgicos' },
  { code: 'CIRURGIA_PLASTICA', name: 'Cirurgia Plástica', description: 'Cirurgia plástica reparadora' },
  { code: 'NEUROCIRUGIA', name: 'Neurocirurgia', description: 'Cirurgia neurológica' },
  { code: 'CLINICA_DOR', name: 'Clínica da Dor', description: 'Tratamento da dor crônica' },
  { code: 'PRENATAL_AR', name: 'Pré-Natal Alto Risco', description: 'Gestação de alto risco' },
  { code: 'PLANEJAMENTO_FAM', name: 'Planejamento Familiar', description: 'Orientação contraceptiva' },
  { code: 'CAPS', name: 'CAPS', description: 'Centro de Atenção Psicossocial' },
  { code: 'NASF', name: 'NASF', description: 'Núcleo de Apoio à Saúde da Família' },
  { code: 'CEO', name: 'CEO - Odontologia', description: 'Centro de Especialidades Odontológicas' },
  { code: 'UBS', name: 'UBS de referência', description: 'Unidade Básica de Saúde' },
  { code: 'UPA', name: 'UPA', description: 'Unidade de Pronto Atendimento' },
  { code: 'HOSPITAL', name: 'Hospital', description: 'Internação hospitalar' }
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.toLowerCase()

    let results = SPECIALTIES

    if (query && query.length >= 2) {
      results = SPECIALTIES.filter(spec =>
        spec.name.toLowerCase().includes(query) ||
        spec.code.toLowerCase().includes(query) ||
        spec.description.toLowerCase().includes(query)
      )
    }

    // Também buscar especialidades usadas anteriormente pelo médico
    // para sugestões personalizadas
    const previousReferrals = await prisma.referral.groupBy({
      by: ['specialty'],
      _count: { specialty: true },
      orderBy: { _count: { specialty: 'desc' } },
      take: 5
    })

    // Combinar com a lista padrão, priorizando as mais usadas
    const usedSpecialties = previousReferrals.map(r => r.specialty)
    
    // Ordenar: usadas primeiro, depois alfabético
    results.sort((a, b) => {
      const aUsed = usedSpecialties.includes(a.name)
      const bUsed = usedSpecialties.includes(b.name)
      if (aUsed && !bUsed) return -1
      if (!aUsed && bUsed) return 1
      return a.name.localeCompare(b.name)
    })

    return NextResponse.json(results)
  } catch (error) {
    console.error('Erro ao listar especialidades:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar especialidades' },
      { status: 500 }
    )
  }
}

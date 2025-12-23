/**
 * API de busca de medicamentos
 * 
 * GET /api/medications/search
 * 
 * Parâmetros:
 * - q: termo de busca
 * - prescriptionType: filtro por tipo de receita
 * - route: filtro por via de administração
 * - isBasicPharmacy: filtro farmácia básica
 * - isPopularPharmacy: filtro farmácia popular
 * - isHospital: filtro hospitalar
 * - patientAge: idade do paciente (filtra restrições)
 * - patientSex: sexo do paciente (M/F)
 * - page: página (default: 1)
 * - limit: itens por página (default: 20)
 */

import { NextRequest, NextResponse } from 'next/server'
import { MedicationService } from '@/lib/medication-service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const options = {
      query: searchParams.get('q') || undefined,
      prescriptionType: searchParams.get('prescriptionType') || undefined,
      route: searchParams.get('route') || undefined,
      form: searchParams.get('form') || undefined,
      
      // Disponibilidade
      isBasicPharmacy: searchParams.has('isBasicPharmacy') 
        ? searchParams.get('isBasicPharmacy') === 'true' 
        : undefined,
      isMunicipal: searchParams.has('isMunicipal')
        ? searchParams.get('isMunicipal') === 'true'
        : undefined,
      isState: searchParams.has('isState')
        ? searchParams.get('isState') === 'true'
        : undefined,
      isHospital: searchParams.has('isHospital')
        ? searchParams.get('isHospital') === 'true'
        : undefined,
      isPopularPharmacy: searchParams.has('isPopularPharmacy')
        ? searchParams.get('isPopularPharmacy') === 'true'
        : undefined,
      isCommercial: searchParams.has('isCommercial')
        ? searchParams.get('isCommercial') === 'true'
        : undefined,
      isCompounded: searchParams.has('isCompounded')
        ? searchParams.get('isCompounded') === 'true'
        : undefined,
      
      // Restrições do paciente
      patientAge: searchParams.has('patientAge')
        ? parseInt(searchParams.get('patientAge')!)
        : undefined,
      patientSex: searchParams.get('patientSex') as 'M' | 'F' | undefined,
      
      // Paginação
      page: parseInt(searchParams.get('page') || '1'),
      limit: Math.min(parseInt(searchParams.get('limit') || '20'), 100),
      
      // Ordenação
      orderBy: (searchParams.get('orderBy') as 'name' | 'code' | 'prescriptionType') || 'name',
      orderDir: (searchParams.get('orderDir') as 'asc' | 'desc') || 'asc'
    }

    const result = await MedicationService.searchMedications(options)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Erro na busca de medicamentos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar medicamentos' },
      { status: 500 }
    )
  }
}

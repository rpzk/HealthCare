/**
 * API de autocomplete de medicamentos
 * 
 * GET /api/medications/autocomplete
 * 
 * Parâmetros:
 * - q: termo de busca (mínimo 2 caracteres)
 * - patientAge: idade do paciente (opcional, filtra restrições)
 * - patientSex: sexo do paciente M/F (opcional, filtra restrições)
 * - availability: filtro de disponibilidade (basic, popular, hospital, all)
 * 
 * Retorna até 10 sugestões mais relevantes
 */

import { NextRequest, NextResponse } from 'next/server'
import { MedicationService } from '@/lib/medication-service'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    const query = searchParams.get('q')
    
    if (!query || query.length < 2) {
      return NextResponse.json([])
    }

    const options = {
      patientAge: searchParams.has('patientAge')
        ? parseInt(searchParams.get('patientAge')!)
        : undefined,
      patientSex: searchParams.get('patientSex') as 'M' | 'F' | undefined,
      availabilityFilter: (searchParams.get('availability') as 'basic' | 'popular' | 'hospital' | 'all') || 'all'
    }

    const suggestions = await MedicationService.autocomplete(query, options)

    // Formatar resposta para autocomplete
    const formatted = suggestions.map(med => ({
      id: med.id,
      code: med.code,
      name: med.name,
      displayName: med.brandName ? `${med.name} (${med.brandName})` : med.name,
      synonyms: med.synonyms,
      prescriptionType: med.prescriptionType,
      prescriptionTypeLabel: getPrescriptionTypeLabel(med.prescriptionType),
      route: med.route,
      routeLabel: getRouteLabel(med.route),
      form: med.form,
      
      // Valores padrão para prescrição
      defaultDosage: med.defaultDosage,
      defaultFrequency: med.defaultFrequency,
      defaultDuration: med.defaultDuration,
      defaultQuantity: med.defaultQuantity,
      unit: med.unit,
      
      // Disponibilidade
      availability: getAvailabilityLabels(med),
      
      // Restrições
      hasRestrictions: !!(med.minAge || med.maxAge || med.sexRestriction),
      restrictions: getRestrictionLabels(med)
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('Erro no autocomplete de medicamentos:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar sugestões' },
      { status: 500 }
    )
  }
}

function getPrescriptionTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    'SIMPLE': 'Receita Simples',
    'CONTROLLED': 'Controlado',
    'SPECIAL_A': 'Receita Amarela (A)',
    'SPECIAL_B': 'Receita Azul (B)'
  }
  return labels[type] || type
}

function getRouteLabel(route: string): string {
  const labels: Record<string, string> = {
    'ORAL': 'Via Oral',
    'INTRAVENOUS': 'Endovenosa (EV)',
    'INTRAMUSCULAR': 'Intramuscular (IM)',
    'SUBCUTANEOUS': 'Subcutânea (SC)',
    'TOPICAL': 'Tópica',
    'INHALATION': 'Inalatória',
    'NASAL': 'Nasal',
    'OPHTHALMIC': 'Oftálmica',
    'OTIC': 'Otológica',
    'RECTAL': 'Retal',
    'VAGINAL': 'Vaginal',
    'SUBLINGUAL': 'Sublingual',
    'TRANSDERMAL': 'Transdérmica'
  }
  return labels[route] || route
}

function getAvailabilityLabels(med: any): string[] {
  const labels: string[] = []
  
  if (med.isBasicPharmacy) labels.push('Farmácia Básica')
  if (med.isPopularPharmacy) labels.push('Farmácia Popular')
  if (med.isHospital) labels.push('Hospitalar')
  
  return labels
}

function getRestrictionLabels(med: any): string[] {
  const labels: string[] = []
  
  if (med.minAge) labels.push(`Idade mínima: ${med.minAge} anos`)
  if (med.maxAge) labels.push(`Idade máxima: ${med.maxAge} anos`)
  if (med.sexRestriction) {
    labels.push(`Apenas sexo ${med.sexRestriction === 'MALE' ? 'masculino' : 'feminino'}`)
  }
  
  return labels
}

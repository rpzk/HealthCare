import { redirect } from 'next/navigation'

/**
 * A IA no HealthCare é um assistente contextual integrado ao fluxo de atendimento.
 * Não existe página separada: sugestões, transcrição e interações aparecem durante a consulta.
 * Redireciona para Consultas.
 */
export default function AIMedicalRedirectPage() {
  redirect('/consultations')
}

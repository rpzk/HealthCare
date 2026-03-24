import { Metadata } from 'next'
import { AccessManagement } from '@/components/admin/access-management'

export const metadata: Metadata = {
  title: 'Equipes de Cuidado - HealthCare',
  description: 'Gestão centralizada de equipes e acessos de pacientes',
}

export default function CareTeamsPage() {
  return <AccessManagement />
}

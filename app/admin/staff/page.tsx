import { Metadata } from 'next'
import { StaffManagement } from '@/components/admin/staff-management'

export const metadata: Metadata = {
  title: 'Gestão de Pessoal - HealthCare',
  description: 'Gerenciamento de profissionais do sistema',
}

export default function StaffPage() {
  return <StaffManagement />
}

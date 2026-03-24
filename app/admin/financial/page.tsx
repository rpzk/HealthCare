import { Metadata } from 'next'
import { FinancialDashboard } from '@/components/financial/financial-dashboard'

export const metadata: Metadata = {
  title: 'Financeiro | HealthCare',
  description: 'Gestão financeira da clínica',
}

export default function FinancialPage() {
  return <FinancialDashboard />
}

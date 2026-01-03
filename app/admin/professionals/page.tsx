import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { ProfessionalManagement } from '@/components/admin/professional-management'

export const metadata = {
  title: 'Gerenciamento de Profissionais',
  description: 'Painel administrativo para gerenciar profissionais de saúde'
}

export default async function ProfessionalsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user) {
    redirect('/auth/signin')
  }

  if (session.user.role !== 'ADMIN') {
    redirect('/')
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-auto">
          <ProfessionalManagement />
        </main>
      </div>
    </div>
  )
}

'use client'

import { AdminDashboard } from '@/components/dashboard/admin-dashboard'
import { Require2FAWrapper } from '@/components/auth/require-2fa-wrapper'

export default function AdminPage() {
  return (
    <Require2FAWrapper>
      <AdminDashboard />
    </Require2FAWrapper>
  )
}

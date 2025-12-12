import { Suspense } from 'react';
import BiDashboard from '@/components/bi/bi-dashboard';

export const metadata = {
  title: 'Business Intelligence | HealthCare',
  description: 'Dashboard gerencial com métricas e analytics'
};

export default function BiPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    }>
      <BiDashboard />
    </Suspense>
  );
}

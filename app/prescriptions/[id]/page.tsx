'use client'

import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import PrescriptionDetails from '@/components/prescriptions/prescription-details'

export default function PrescriptionDetailPage({ params }: { params: { id: string } }) {
	return (
		<div className="min-h-screen bg-background transition-colors duration-300">
			<Header />
			<div className="flex pt-16">
				<Sidebar />
				<main className="flex-1 ml-64 p-6 space-y-6">
					<PageHeader
						title="Prescrição"
						description="Detalhes da prescrição médica"
						breadcrumbs={[
							{ label: 'Prescrições', href: '/prescriptions' },
							{ label: 'Detalhes' }
						]}
					/>
					<PrescriptionDetails id={params.id} />
				</main>
			</div>
		</div>
	)
}

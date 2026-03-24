import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { Header } from '@/components/layout/header'
import { Sidebar } from '@/components/layout/sidebar'
import { PageHeader } from '@/components/navigation/page-header'
import { HydrationGuard } from '@/components/hydration-guard'
import { PatientDetailsContent } from '@/components/patients/patient-details-content'
import { StartConsultationButton } from '@/components/consultations/start-consultation-button'
import { decrypt, hashCPF } from '@/lib/crypto'
import { applyPatientMasking } from '@/lib/masking'
import { checkPatientAccess } from '@/lib/patient-access'
import { RestrictedPatientView } from '@/components/patients/restricted-patient-view'

export const metadata: Metadata = {
  title: 'Detalhes do Paciente - Sistema de Prontuário Eletrônico',
  description: 'Visualizar detalhes do paciente',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PatientDetailsPage({ params }: PageProps) {
  const { id } = await params
  
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: {
      // Consultas com dados completos
      consultations: {
        take: 10,
        orderBy: { scheduledDate: 'desc' },
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              speciality: true,
              crmNumber: true
            }
          },
          // NOVO: Diagnósticos (CIDs)
          diagnoses: {
            include: {
              primaryCode: true
            }
          },
          // NOVO: Sinais vitais
          vitalSigns: {
            orderBy: { recordedAt: 'desc' },
            take: 1
          },
          // NOVO: Procedimentos SIGTAP
          procedures: {
            include: {
              procedure: true,
              executorCBO: {
                include: {
                  occupation: true
                }
              }
            }
          }
        }
      },
      // Prescrições com itens detalhados
      prescriptions: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              crmNumber: true
            }
          },
          // Itens da prescrição (Medication unificada com RENAME)
          items: {
            include: {
              medication: true
            }
          }
        }
      },
      // Exames com procedimentos SIGTAP
      ExamRequest: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: {
            select: {
              id: true,
              name: true
            }
          },
          // NOVO: Procedimento SIGTAP vinculado
          procedimento: true
        }
      },
      // NOVO: Encaminhamentos
      referrals: {
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: {
          doctor: {
            select: {
              id: true,
              name: true
            }
          },
          // Ocupação de destino (CBO)
          targetOccupation: true,
          // Unidade de destino
          destinationUnit: true
        }
      },
      // NOVO: Sinais vitais histórico
      vitalSigns: {
        orderBy: { recordedAt: 'desc' },
        take: 20
      },
      // Atestados médicos
      medicalCertificates: {
        orderBy: { issuedAt: 'desc' },
        take: 20,
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              crmNumber: true,
              speciality: true
            }
          },
          consultation: {
            select: {
              id: true,
              scheduledDate: true
            }
          }
        }
      },
      // Registros/Evoluções (MedicalRecord - SOAP, anotações)
      medicalRecords: {
        where: { deletedAt: null },
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          doctor: {
            select: {
              id: true,
              name: true,
              speciality: true
            }
          }
        }
      }
    },
  })

  if (!patient) {
    notFound()
  }

  // Merge data from any duplicate record matched by CPF hash (if present)
  let mergedBloodType: string | null | undefined = patient.bloodType
  let mergedAllergies: string | null | undefined = decrypt(patient.allergies as string | null)
  const decryptedCpf = decrypt(patient.cpf as string | null)
  const cpfHash = hashCPF(decryptedCpf || undefined)

  if ((!mergedBloodType || mergedBloodType === '') && cpfHash) {
    const counterpart = await prisma.patient.findFirst({
      where: { cpfHash },
      select: { id: true, bloodType: true, allergies: true },
    })
    if (counterpart) {
      if (counterpart.bloodType) mergedBloodType = counterpart.bloodType
      const counterpartAllergies = decrypt(counterpart.allergies as string | null)
      if (!mergedAllergies && counterpartAllergies) mergedAllergies = counterpartAllergies
    }
  }

  let patientView: Record<string, unknown> = {
    ...patient,
    cpf: decryptedCpf,
    bloodType: mergedBloodType || null,
    allergies: mergedAllergies || null,
  }

  // Identificação do usuário atual
  const session = await getServerSession(authOptions)
  const role = (session?.user as { role?: string })?.role
  const userId = (session?.user as { id?: string })?.id

  // Checagem LGPD: Médicos fora da equipe veem apenas a tela de restrição/emergência
  const access = await checkPatientAccess(userId || '', id, role)
  if (!access.hasAccess && !access.isAdmin && !access.isFacilitator) {
    const maskedCpf = patientView.cpf ? `***.${String(patientView.cpf).slice(3, 6)}.***-**` : 'Sem CPF'
    return (
      <div className="min-h-screen bg-background transition-colors duration-300">
        <Header />
        <div className="flex pt-32">
          <Sidebar />
          <main className="flex-1 ml-64 p-6">
            <RestrictedPatientView 
              patientId={patient.id} 
              patientName={String(patientView.name ?? '')} 
              patientCpf={maskedCpf} 
            />
          </main>
        </div>
      </div>
    )
  }

  // LGPD: Admin/Manager vê dados pseudonimizados
  const isAdmin = role === 'ADMIN' || role === 'OWNER' || role === 'MANAGER'
  if (isAdmin) {
    patientView = applyPatientMasking(patientView as never, { isAdmin: true }) as Record<string, unknown>
  }

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      <Header />
      <div className="flex pt-32">
        <Sidebar />
        <main className="flex-1 ml-64 p-6">
          <PageHeader
            title={String(patientView.name ?? '')}
            description={`CPF: ${String(patientView.cpf ?? 'Não informado')} • ${String(patientView.email ?? 'Email não informado')}`}
            breadcrumbs={[
              { label: 'Pacientes', href: '/patients' },
              { label: String(patientView.name ?? '') }
            ]}
            showBackButton={true}
            showHomeButton={true}
            actions={
              <StartConsultationButton
                patientId={patient.id}
                patientName={String(patientView.name ?? '')}
                variant="default"
                size="sm"
              />
            }
          />
          <HydrationGuard fallback={<div className="text-sm text-gray-500">Carregando...</div>}>
            <PatientDetailsContent patient={patientView as import('@prisma/client').Patient} />
          </HydrationGuard>
        </main>
      </div>
    </div>
  )
}

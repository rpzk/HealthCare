import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🔧 Configurando módulos do sistema...')

  const modules = [
    {
      key: 'core',
      name: 'Núcleo Clínico',
      description: 'Funcionalidades essenciais: Agenda, Prontuário, Prescrição.',
      isEnabled: true,
      features: ['appointments', 'records', 'prescriptions']
    },
    {
      key: 'psf',
      name: 'Estratégia Saúde da Família',
      description: 'Ferramentas para Atenção Primária: Vínculo Familiar, Visita Domiciliar, Vacinas, CIAP-2.',
      isEnabled: false,
      features: ['family_link', 'home_visit', 'vaccines', 'ciap2']
    },
    {
      key: 'integrative',
      name: 'Medicina Integrativa',
      description: 'Ferramentas Holísticas: Astrologia Médica, Homeopatia, Acupuntura.',
      isEnabled: false,
      features: ['astrology_chart', 'homeopathy_repertory', 'acupuncture_points']
    },
    {
      key: 'bi_analytics',
      name: 'Gestão & BI',
      description: 'Painel do Gestor: Saúde Populacional, Produtividade, Epidemiologia.',
      isEnabled: false,
      features: ['population_health', 'productivity_reports', 'epidemiology_map']
    }
  ]

  for (const mod of modules) {
    await prisma.systemModule.upsert({
      where: { key: mod.key },
      update: {
        name: mod.name,
        description: mod.description,
        features: mod.features
      },
      create: {
        key: mod.key,
        name: mod.name,
        description: mod.description,
        isEnabled: mod.isEnabled,
        features: mod.features
      }
    })
    console.log(`📦 Módulo verificado: ${mod.name}`)
  }

  console.log('✅ Configuração de módulos concluída!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

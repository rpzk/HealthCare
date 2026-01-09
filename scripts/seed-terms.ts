import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const terms = [
  {
    slug: 'terms-of-use',
    title: 'Termos de Uso',
    version: '1.0',
    content: `
# Termos de Uso - HealthCare System

Bem-vindo ao HealthCare System. Ao utilizar nosso sistema, você concorda com os seguintes termos:

1. **Uso do Sistema**: O sistema deve ser utilizado apenas para fins médicos e administrativos autorizados.
2. **Responsabilidade**: Você é responsável por manter a confidencialidade de suas credenciais.
3. **Dados**: Os dados inseridos devem ser verídicos e atualizados.

Data de vigência: 23/11/2025
    `
  },
  {
    slug: 'privacy-policy',
    title: 'Política de Privacidade',
    version: '1.0',
    content: `
# Política de Privacidade

Nós levamos sua privacidade a sério.

1. **Coleta de Dados**: Coletamos dados pessoais e médicos para prestação de serviços de saúde.
2. **Compartilhamento**: Seus dados podem ser compartilhados com outros profissionais de saúde envolvidos no seu tratamento.
3. **Segurança**: Utilizamos criptografia e medidas de segurança para proteger seus dados.

Data de vigência: 23/11/2025
    `
  },
  {
    slug: 'recording-consent',
    title: 'Consentimento de Gravação de Consultas',
    version: '1.0',
    content: `
# Consentimento de Gravação

Autorizo a gravação de áudio e/ou vídeo das minhas consultas para fins de:

1. **Registro em Prontuário**: Transcrição automática e registro histórico.
2. **Auditoria**: Verificação de qualidade do atendimento.

Entendo que posso revogar este consentimento a qualquer momento.
    `
  },
  {
    slug: 'ai-consent',
    title: 'Consentimento de Uso de Inteligência Artificial',
    version: '1.0',
    content: `
# Uso de Inteligência Artificial

Este sistema utiliza recursos de Inteligência Artificial para:

1. **Auxílio Diagnóstico**: Sugestões baseadas em dados clínicos.
2. **Transcrição**: Conversão de fala em texto.
3. **Análise de Dados**: Identificação de padrões de saúde.

A decisão final sobre o tratamento é sempre do profissional de saúde humano.
    `
  }
]

async function main() {
  console.log('Seeding terms...')

  for (const term of terms) {
    const existing = await prisma.term.findFirst({
      where: { slug: term.slug, version: term.version }
    })

    if (!existing) {
      await prisma.term.create({
        data: term
      })
      console.log(`Created term: ${term.title}`)
    } else {
      console.log(`Term already exists: ${term.title}`)
    }
  }

  console.log('Terms seeding completed.')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

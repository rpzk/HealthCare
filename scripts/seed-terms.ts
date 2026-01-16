import { PrismaClient, TermAudience } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL não configurado')
  }

  const adapter = new PrismaPg({ connectionString: databaseUrl })

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

const prisma = createPrismaClient()

type SeedTerm = {
  slug: string
  title: string
  version: string
  audience: TermAudience
  content: string
  isActive?: boolean
}

const terms: SeedTerm[] = [
  {
    slug: 'terms-of-use',
    title: 'Termos de Uso',
    version: '1.0',
    audience: TermAudience.ALL,
    content: `# Termos de Uso

Estes Termos de Uso regulam o acesso e a utilização da plataforma de gestão clínica, prontuário eletrônico, teleatendimento, portal do paciente e demais funcionalidades disponibilizadas (\"Plataforma\").

Ao criar uma conta, acessar ou utilizar a Plataforma, você declara que leu e concorda com estes Termos.

## 1. Definições e papéis

- **Usuário**: pessoa que acessa a Plataforma (paciente, profissional de saúde, equipe administrativa e/ou responsável legal, quando aplicável).
- **Clínica/Unidade/Prestador**: organização que opera o atendimento e utiliza a Plataforma para seus serviços.
- **Controlador** e **Operador**: termos utilizados conforme a LGPD (Lei 13.709/2018). Em regra, a Clínica/Unidade define as finalidades e meios do tratamento (Controlador). Dependendo do arranjo de operação, a Plataforma pode atuar como Operador (tratando dados em nome da Clínica/Unidade).

## 2. Elegibilidade e cadastro

- O uso pode exigir convite, vínculo com a Clínica/Unidade e/ou confirmação de identidade.
- Você se compromete a fornecer informações corretas e atualizadas, na medida do necessário para a prestação de serviços de saúde e administrativos.

## 3. Credenciais, segurança e acesso

- Você é responsável por manter a confidencialidade de suas credenciais.
- Você deve adotar medidas razoáveis de segurança (ex.: senha forte, não compartilhar acesso, encerrar sessão em dispositivos públicos).
- Em caso de suspeita de uso indevido, comunique a Clínica/Unidade para medidas de contenção.

## 4. Uso permitido e condutas proibidas

Você concorda em utilizar a Plataforma apenas para finalidades legítimas relacionadas à assistência à saúde e à gestão do atendimento.

É proibido:

- Acessar, coletar, compartilhar ou tentar obter dados sem autorização.
- Inserir conteúdo ilegal, enganoso, difamatório ou que viole sigilo profissional.
- Tentar burlar medidas de segurança, explorar vulnerabilidades ou interferir no funcionamento.

## 5. Prontuário, documentos e registros

- A Plataforma pode armazenar registros clínicos, documentos, prescrições, certificados, imagens, anotações e outros dados vinculados ao atendimento.
- O conteúdo inserido deve refletir o atendimento realizado e/ou informações fornecidas pelo paciente. Profissionais são responsáveis pela qualidade e veracidade técnica do registro sob sua autoria.

## 6. Funcionalidades sensíveis (teleatendimento, gravação, imagens e IA)

- Algumas funcionalidades podem exigir consentimentos específicos (ex.: teleatendimento, gravação, uso de imagens e processamento por IA).
- Quando uma funcionalidade exigir consentimento, ela poderá ficar indisponível até que o consentimento seja concedido.

## 7. Limitações e responsabilidade

- A Plataforma é um meio de registro e suporte operacional. Ela não substitui o julgamento clínico, protocolos, normas éticas e legislação aplicável.
- Pacientes devem seguir orientações da Clínica/Unidade e procurar serviços de urgência/emergência quando necessário.

## 8. Disponibilidade e manutenção

- A Plataforma pode passar por manutenções, atualizações e indisponibilidades temporárias.
- A Clínica/Unidade pode definir políticas internas de acesso, perfis e permissões.

## 9. Alterações destes Termos

- Estes Termos podem ser atualizados. Quando aplicável, uma nova versão poderá exigir novo aceite.

## 10. Contato

- Para dúvidas, solicitações e suporte, utilize os canais oficiais disponibilizados pela Clínica/Unidade.
`,
  },
  {
    slug: 'privacy-policy',
    title: 'Política de Privacidade',
    version: '1.0',
    audience: TermAudience.ALL,
    content: `# Política de Privacidade

Esta Política descreve como ocorre o tratamento de dados pessoais na Plataforma, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018) e demais normas aplicáveis.

## 1. Quem trata seus dados (papéis na LGPD)

- Em geral, a **Clínica/Unidade/Prestador** que convida o Usuário e conduz o atendimento atua como **Controlador** (define finalidades e meios do tratamento).
- A Plataforma pode atuar como **Operador**, tratando dados em nome do Controlador, conforme instruções e contrato aplicável.

## 2. Dados tratados

Podemos tratar, conforme o uso da Plataforma:

- **Dados cadastrais e de contato**: nome, e-mail, telefone, CPF, data de nascimento, endereço.
- **Dados de saúde** (sensíveis): histórico clínico, sintomas, diagnósticos, prescrições, exames, anotações, documentos e evoluções.
- **Dados de teleatendimento**: metadados de sessão, e quando habilitado, gravações/transcrições.
- **Dados técnicos e de segurança**: logs, IP, user-agent, data/hora de acesso, eventos de auditoria.

## 3. Finalidades do tratamento

Os dados podem ser tratados para:

- Prestação e gestão do atendimento em saúde.
- Emissão e guarda de documentos clínicos e administrativos.
- Continuidade do cuidado e comunicação com o paciente.
- Segurança da informação, prevenção a fraudes e auditoria.
- Operação de funcionalidades contratadas (ex.: teleatendimento, recursos de IA), quando habilitadas.

## 4. Bases legais (LGPD)

As bases legais podem incluir, conforme o caso:

- **Execução de contrato** e procedimentos preliminares.
- **Cumprimento de obrigação legal/regulatória**.
- **Tutela da saúde**, quando aplicável.
- **Legítimo interesse**, com avaliação e salvaguardas.
- **Consentimento**, quando exigido (ex.: gravação, uso de imagem, determinadas integrações e funcionalidades).

## 5. Compartilhamento

Seus dados podem ser compartilhados:

- Com profissionais e equipes autorizadas, envolvidos no seu atendimento.
- Com prestadores de serviços essenciais à operação (ex.: e-mail, infraestrutura, armazenamento, transcrição, modelos de IA), quando habilitados/configurados, observando-se medidas contratuais e de segurança.
- Quando necessário para cumprimento de obrigações legais, ordens de autoridade competente ou proteção de direitos.

## 6. Retenção e guarda

Os dados são retidos pelo tempo necessário às finalidades e conforme exigências legais/regulatórias aplicáveis à área da saúde. A Clínica/Unidade pode manter políticas internas de retenção.

## 7. Direitos do titular

Você pode solicitar, nos termos da LGPD e conforme aplicável:

- Confirmação de tratamento e acesso.
- Correção e atualização.
- Informação sobre compartilhamentos.
- Revogação de consentimentos (quando esta for a base legal), ciente de que a revogação pode impactar funcionalidades específicas.

As solicitações devem ser realizadas pelos canais oficiais da Clínica/Unidade.

## 8. Segurança

Aplicamos medidas técnicas e administrativas para proteger os dados, incluindo controles de acesso, registros de auditoria e boas práticas de segurança. Ainda assim, nenhum sistema é completamente imune a riscos.

## 9. Transferências e serviços de terceiros

Dependendo da configuração, funcionalidades (ex.: transcrição/IA) podem envolver processamento por serviços de terceiros e/ou infraestrutura fora do país. Quando isso ocorrer, o tratamento deverá observar as exigências legais aplicáveis.

## 10. Alterações desta Política

Esta Política pode ser atualizada. Quando aplicável, poderá ser solicitada nova ciência/aceite.
`,
  },
  {
    slug: 'ai-consent',
    title: 'Consentimento para Uso de Inteligência Artificial',
    version: '1.0',
    audience: TermAudience.ALL,
    content: `# Consentimento para Uso de Inteligência Artificial

Ao aceitar este termo, você autoriza o uso de recursos de Inteligência Artificial (\"IA\") na Plataforma, quando habilitados, para apoiar processos clínicos e administrativos.

## 1. Para que a IA pode ser usada

A IA pode ser utilizada para:

- **Transcrição** de áudio em texto e organização de informações.
- **Geração de rascunhos** (ex.: anotações, sumários, estruturas tipo SOAP), para revisão do profissional.
- **Análises e sugestões** (ex.: organização de sintomas, interações medicamentosas, insights), sempre como suporte.

## 2. Importante: suporte, não decisão

- A IA não substitui a avaliação do profissional de saúde.
- A decisão clínica e a responsabilidade pelo conteúdo final (registros, prescrições, laudos, condutas) permanecem do profissional.

## 3. Dados que podem ser processados

Para executar as funcionalidades, podem ser processados dados clínicos e administrativos inseridos na Plataforma, incluindo dados sensíveis de saúde, quando necessário para a finalidade solicitada.

## 4. Onde o processamento pode ocorrer

Dependendo da configuração da Clínica/Unidade, o processamento pode ocorrer:

- Em infraestrutura local (modelos locais), e/ou
- Em serviços externos especializados (ex.: transcrição/modelos), quando configurados.

## 5. Revogação

Você pode revogar este consentimento a qualquer momento pelos canais da Clínica/Unidade, ciente de que a revogação pode tornar indisponíveis funcionalidades de IA.
`,
  },
  {
    slug: 'recording-consent',
    title: 'Consentimento para Gravação de Atendimento',
    version: '1.0',
    audience: TermAudience.ALL,
    content: `# Consentimento para Gravação de Atendimento

Ao aceitar este termo, você autoriza a gravação de áudio e/ou vídeo de atendimentos realizados por meio da Plataforma, quando a gravação estiver habilitada.

## 1. Finalidades

A gravação pode ser utilizada para:

- Apoiar a elaboração de registros clínicos e administrativos.
- Permitir **transcrição** e organização do conteúdo do atendimento.
- Auditoria interna, segurança e melhoria de processos, quando aplicável.

## 2. Acesso e confidencialidade

- O acesso às gravações deve ser restrito a pessoas autorizadas pela Clínica/Unidade e vinculadas ao atendimento, observando o sigilo profissional e as políticas internas.

## 3. Retenção

- A retenção das gravações deve seguir política da Clínica/Unidade e obrigações legais/regulatórias aplicáveis.

## 4. Revogação e consequências

- Você pode revogar este consentimento a qualquer momento pelos canais da Clínica/Unidade.
- A recusa ou revogação pode impedir o uso de funcionalidades que dependam de gravação/transcrição.
`,
  },
  {
    slug: 'telemedicine-consent-patient',
    title: 'Consentimento para Teleatendimento (Paciente)',
    version: '1.0',
    audience: TermAudience.PATIENT,
    content: `# Consentimento para Teleatendimento (Paciente)

Ao aceitar este termo, você concorda com a realização de atendimentos a distância (teleatendimento), quando oferecidos pela Clínica/Unidade por meio da Plataforma.

## 1. Natureza do teleatendimento

- O teleatendimento ocorre por meio de recursos de comunicação (áudio/vídeo e troca de mensagens/documentos).
- Pode haver limitações decorrentes do ambiente remoto (conexão, áudio/vídeo, ausência de exame físico presencial).

## 2. Recomendações e emergências

- O teleatendimento não é indicado para situações de urgência/emergência. Em caso de risco imediato, procure serviços de emergência.

## 3. Privacidade durante a sessão

- Utilize, sempre que possível, um local privado.
- Não compartilhe links, senhas ou códigos de acesso.

## 4. Documentos e informações

- Você pode enviar informações e documentos relevantes para seu atendimento. Envie apenas o necessário e verifique se o material pertence a você.

## 5. Revogação

- Você pode revogar este consentimento a qualquer momento. A revogação pode impedir o agendamento/realização de teleatendimentos pela Plataforma.
`,
  },
  {
    slug: 'telemedicine-consent-professional',
    title: 'Consentimento e Responsabilidades no Teleatendimento (Profissional)',
    version: '1.0',
    audience: TermAudience.PROFESSIONAL,
    content: `# Consentimento e Responsabilidades no Teleatendimento (Profissional)

Ao aceitar este termo, você declara ciência e concordância com o uso da Plataforma para atendimentos a distância (teleatendimento), quando aplicável.

## 1. Responsabilidade profissional

- Você mantém a responsabilidade técnica e ética pelo atendimento, registro e conduta.
- Você se compromete a observar as normas profissionais, regulatórias e institucionais aplicáveis ao teleatendimento.

## 2. Limitações e boas práticas

- Avalie se o caso é adequado ao teleatendimento e oriente atendimento presencial quando necessário.
- Verifique identificação do paciente e condições mínimas de privacidade.

## 3. Registros e documentação

- Registre o atendimento de forma adequada no prontuário.
- Quando habilitado, a Plataforma pode apoiar com documentação e organização de dados.

## 4. Segurança

- Não compartilhe credenciais e siga as políticas de acesso e sigilo.
`,
  },
  {
    slug: 'image-consent-patient',
    title: 'Consentimento para Uso e Armazenamento de Imagens (Paciente)',
    version: '1.0',
    audience: TermAudience.PATIENT,
    content: `# Consentimento para Uso e Armazenamento de Imagens (Paciente)

Ao aceitar este termo, você autoriza a captura, envio, armazenamento e utilização de imagens e documentos (ex.: fotos, exames, laudos, documentos clínicos) na Plataforma, quando necessários ao seu atendimento.

## 1. Finalidades

- Suporte ao cuidado e acompanhamento clínico.
- Registro em prontuário e documentação do atendimento.

## 2. Orientações

- Envie apenas imagens pertinentes e necessárias.
- Evite incluir informações de terceiros sem autorização.

## 3. Revogação

- Você pode revogar este consentimento a qualquer momento pelos canais da Clínica/Unidade, ciente de que isso pode limitar funcionalidades que dependam do envio/armazenamento de imagens.
`,
  },
  {
    slug: 'image-consent-professional',
    title: 'Responsabilidades sobre Imagens e Documentos (Profissional)',
    version: '1.0',
    audience: TermAudience.PROFESSIONAL,
    content: `# Responsabilidades sobre Imagens e Documentos (Profissional)

Ao aceitar este termo, você declara ciência de que a Plataforma pode ser utilizada para captura, envio e armazenamento de imagens e documentos clínicos, e se compromete a observar boas práticas e normas aplicáveis.

## 1. Finalidades e necessidade

- Utilize imagens/documentos apenas quando necessários ao atendimento e ao registro clínico.

## 2. Sigilo e acesso

- Respeite o sigilo profissional e as políticas de acesso.
- Evite armazenar ou compartilhar conteúdo fora da Plataforma quando isso ampliar riscos desnecessários.

## 3. Responsabilidade

- Você é responsável pelo conteúdo que insere e pelo uso adequado das informações, conforme suas atribuições.
`,
  },
  {
    slug: 'admin-privileged-consent',
    title: 'Consentimento para Operações Administrativas Sensíveis (Profissional)',
    version: '1.0',
    audience: TermAudience.PROFESSIONAL,
    isActive: false,
    content: `# Consentimento para Operações Administrativas Sensíveis (Profissional)

Este termo se aplica a operações administrativas sensíveis, como gestão de usuários, permissões, configurações críticas, backups/restaurações e ações que possam impactar confidencialidade, integridade e disponibilidade de dados.

Ao aceitar, você declara ciência de que:

- Essas operações devem ser realizadas apenas por pessoas autorizadas e capacitadas.
- O uso indevido pode expor dados pessoais e dados de saúde, e pode gerar responsabilização conforme normas aplicáveis e políticas internas.
- Você deve seguir os procedimentos internos da Clínica/Unidade e boas práticas de segurança (ex.: princípio do menor privilégio, auditoria, registro de mudanças).
`,
  },
]

async function main() {
  console.log('Seeding terms...')

  const force = process.argv.includes('--force')

  for (const term of terms) {
    const existing = await prisma.term.findFirst({
      where: { slug: term.slug, version: term.version },
      select: { id: true },
    })

    if (!existing) {
      await prisma.term.create({
        data: {
          slug: term.slug,
          title: term.title,
          version: term.version,
          content: term.content,
          audience: term.audience,
          isActive: term.isActive ?? true,
        },
      })
      console.log(`Created term: ${term.slug} (${term.version})`)
      continue
    }

    if (!force) {
      console.log(`Skipped existing term (use --force to overwrite): ${term.slug} (${term.version})`)
      continue
    }

    await prisma.term.update({
      where: { id: existing.id },
      data: {
        title: term.title,
        content: term.content,
        audience: term.audience,
        isActive: term.isActive ?? true,
      },
    })
    console.log(`Overwrote existing term (--force): ${term.slug} (${term.version})`)
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

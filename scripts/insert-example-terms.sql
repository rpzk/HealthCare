-- Script SQL para inserir termos de exemplo no sistema
-- Execute este script para testar o sistema de termos de consentimento

-- ============================================
-- TERMOS PARA PACIENTES
-- ============================================

-- Termo de Consentimento para IA (Pacientes)
INSERT INTO terms (id, slug, title, content, version, "isActive", audience, "createdAt", "updatedAt")
VALUES (
  'term_ai_patient_001',
  'ai-consent-patient',
  'Consentimento para Uso de Inteligência Artificial',
  '# Consentimento para Uso de Inteligência Artificial

## Introdução

Este termo descreve como utilizamos Inteligência Artificial (IA) para melhorar seu atendimento médico.

## Uso da IA

Nossa plataforma utiliza IA para:

- **Análise de sintomas**: Auxiliar médicos no diagnóstico através da análise de seus sintomas
- **Sugestões de tratamento**: Recomendar tratamentos baseados em evidências científicas
- **Transcrição de consultas**: Converter áudio de consultas em texto para documentação
- **Geração de resumos**: Criar resumos automáticos de prontuários (SOAP notes)

## Seus Dados

- Todos os dados utilizados pela IA são **criptografados** e **seguros**
- Seus dados **nunca** são compartilhados com terceiros sem seu consentimento
- Você pode **revogar** este consentimento a qualquer momento
- A decisão final sobre diagnóstico e tratamento é sempre do **médico**, nunca da IA

## Privacidade

- A IA processa dados localmente sempre que possível
- Quando processamento externo é necessário, usamos provedores certificados (OpenAI, Azure)
- Seus dados são **anonimizados** antes do processamento externo

## Seus Direitos

Você tem o direito de:
- Saber quando IA é utilizada no seu atendimento
- Solicitar cópia dos dados processados
- Revogar este consentimento
- Solicitar exclusão dos dados processados

Ao aceitar este termo, você autoriza o uso de IA conforme descrito acima.

**Última atualização**: 16 de janeiro de 2025',
  '1.0.0',
  true,
  'PATIENT',
  NOW(),
  NOW()
) ON CONFLICT (slug, version) DO NOTHING;

-- Termo de Consentimento para Telemedicina (Pacientes)
INSERT INTO terms (id, slug, title, content, version, "isActive", audience, "createdAt", "updatedAt")
VALUES (
  'term_tele_patient_001',
  'telemedicine-consent-patient',
  'Consentimento para Telemedicina',
  '# Consentimento para Telemedicina

## O que é Telemedicina?

Telemedicina é o atendimento médico realizado à distância através de videoconferência, permitindo que você consulte médicos sem sair de casa.

## Como Funciona

- **Consultas por vídeo**: Conversas ao vivo com médicos via webcam e microfone
- **Prescrições digitais**: Receitas e atestados gerados e assinados digitalmente
- **Segurança**: Conexão criptografada end-to-end

## Requisitos Técnicos

Para teleconsulta você precisa de:
- Computador, tablet ou smartphone com câmera
- Conexão estável de internet
- Navegador atualizado (Chrome, Firefox, Safari, Edge)

## Gravação de Consultas

- Consultas podem ser **gravadas** para fins de auditoria e qualidade
- Você será **informado** quando a gravação iniciar
- Gravações são **criptografadas** e acessíveis apenas por você e seu médico
- Você pode **solicitar exclusão** da gravação

## Limitações

A telemedicina **não substitui** atendimento presencial em casos de:
- Emergências médicas
- Procedimentos que requerem exame físico
- Situações que exigem equipamentos especializados

Em caso de emergência, ligue **192** (SAMU) ou dirija-se ao pronto-socorro mais próximo.

## Seus Direitos

Você tem o direito de:
- Recusar teleconsulta e solicitar atendimento presencial
- Encerrar a teleconsulta a qualquer momento
- Solicitar cópia da gravação
- Revogar este consentimento

Ao aceitar este termo, você autoriza a realização de teleconsultas conforme descrito acima.

**Última atualização**: 16 de janeiro de 2025',
  '1.0.0',
  true,
  'PATIENT',
  NOW(),
  NOW()
) ON CONFLICT (slug, version) DO NOTHING;

-- ============================================
-- TERMOS PARA PROFISSIONAIS
-- ============================================

-- Termo de Consentimento para IA (Profissionais)
INSERT INTO terms (id, slug, title, content, version, "isActive", audience, "createdAt", "updatedAt")
VALUES (
  'term_ai_prof_001',
  'ai-consent-professional',
  'Termo de Uso de IA para Profissionais',
  '# Termo de Uso de IA para Profissionais de Saúde

## Responsabilidade Profissional

Como profissional de saúde, você reconhece que:

- A IA é uma **ferramenta auxiliar**, não substitui julgamento clínico
- **Você** é responsável por validar todas as sugestões da IA
- Decisões finais sobre diagnóstico e tratamento são **suas**
- Você deve **revisar** todos os documentos gerados por IA antes de assinar

## Uso Ético

Você concorda em:
- Usar a IA apenas para **fins médicos legítimos**
- **Não manipular** ou alterar logs de IA de forma maliciosa
- **Informar pacientes** quando IA é utilizada no atendimento
- Seguir **diretrizes éticas** da sua categoria profissional

## Auditoria

- Todas as interações com IA são **registradas** (logs)
- Logs são usados para **auditoria** e **melhoria** do sistema
- Em caso de investigação, logs podem ser **analisados**

## Treinamento

Você declara que:
- Recebeu **orientação** sobre como usar ferramentas de IA
- Entende as **limitações** da IA médica
- Sabe como **reportar** comportamentos inadequados da IA

Ao aceitar este termo, você assume responsabilidade pelo uso profissional e ético da IA.

**Última atualização**: 16 de janeiro de 2025',
  '1.0.0',
  true,
  'PROFESSIONAL',
  NOW(),
  NOW()
) ON CONFLICT (slug, version) DO NOTHING;

-- ============================================
-- TERMOS PARA TODOS
-- ============================================

-- Política de Privacidade (Todos)
INSERT INTO terms (id, slug, title, content, version, "isActive", audience, "createdAt", "updatedAt")
VALUES (
  'term_privacy_001',
  'privacy-policy',
  'Política de Privacidade',
  '# Política de Privacidade

## Coleta de Dados

Coletamos os seguintes dados:

### Dados Pessoais
- Nome completo
- CPF
- Data de nascimento
- Endereço
- Telefone e e-mail

### Dados de Saúde
- Histórico médico
- Medicamentos em uso
- Alergias
- Resultados de exames
- Prontuários médicos

### Dados Técnicos
- Endereço IP
- Logs de acesso
- Cookies de sessão

## Uso dos Dados

Utilizamos seus dados para:
- Prestar **serviços de saúde**
- Melhorar a **qualidade** do atendimento
- Cumprir **obrigações legais**
- Realizar **pesquisas** (anonimizadas)

## Compartilhamento

Seus dados podem ser compartilhados com:
- **Profissionais de saúde** envolvidos no seu atendimento
- **Laboratórios** para realização de exames
- **Planos de saúde** para faturamento
- **Autoridades** quando exigido por lei

**Nunca** vendemos seus dados para terceiros.

## Segurança

Implementamos medidas de segurança:
- **Criptografia** de dados em trânsito e em repouso
- **Autenticação** de dois fatores
- **Backups** regulares
- **Auditoria** de acessos

## Seus Direitos (LGPD)

Você tem direito de:
- **Acessar** seus dados
- **Corrigir** dados incorretos
- **Excluir** dados (quando permitido por lei)
- **Portabilidade** de dados
- **Revogar** consentimentos
- **Opor-se** ao processamento

Para exercer seus direitos, entre em contato através de: privacidade@healthcare.com.br

## Retenção

Mantemos seus dados por:
- **20 anos**: prontuários médicos (exigido pelo CFM)
- **5 anos**: dados fiscais (exigido pela Receita Federal)
- **Até revogação**: consentimentos opcionais

## Alterações

Esta política pode ser atualizada. Notificaremos sobre mudanças significativas.

**Última atualização**: 16 de janeiro de 2025',
  '1.0.0',
  true,
  'ALL',
  NOW(),
  NOW()
) ON CONFLICT (slug, version) DO NOTHING;

-- ============================================
-- VERIFICAR TERMOS INSERIDOS
-- ============================================

SELECT 
  id,
  slug,
  title,
  version,
  "isActive" as ativo,
  audience as audiencia,
  "createdAt" as criado_em
FROM terms
WHERE slug IN (
  'ai-consent-patient',
  'telemedicine-consent-patient',
  'ai-consent-professional',
  'privacy-policy'
)
ORDER BY audience, slug;

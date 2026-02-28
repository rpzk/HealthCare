# 🏥 HealthCare System

Sistema completo de gestão médica com conformidade CFM, ANVISA e LGPD.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue)](https://www.docker.com/)

---

## 📋 Índice

- [Sobre](#sobre)
- [Funcionalidades](#funcionalidades)
- [Conformidade](#conformidade)
- [Arquitetura](#arquitetura)
- [Instalação](#instalação)
- [Deploy](#deploy)
- [Documentação](#documentação)
- [Tecnologias](#tecnologias)
- [Custos](#custos)
- [Contribuindo](#contribuindo)
- [Licença](#licença)

---

## 🩺 Sobre

O **HealthCare System** é uma plataforma completa de gestão médica desenvolvida para clínicas e hospitais brasileiros. O sistema oferece:

- ✅ **Prontuário Eletrônico (PEP)** conforme CFM 2.299/2021
- ✅ **Prescrições CFM-Compliant** com suporte a medicamentos controlados (Portaria 344/98)
- ✅ **Assinatura Digital** PAdES-B/T (ICP-Brasil)
- ✅ **LGPD Completo** com pseudonimização, portabilidade e direito ao esquecimento
- ✅ **Agendamento Inteligente** com notificações automáticas
- ✅ **Telemedicina** com gravação e transcrição (Whisper AI)
- ✅ **IA Local** para assistência médica (Ollama + LLaMA)
- ✅ **Integração FHIR R4** para interoperabilidade

### 🎯 Público-Alvo

- **Clínicas Médicas** (pequeno a grande porte)
- **Hospitais** (enfermarias, emergências, UTI)
- **Consultórios Privados**
- **Centros de Saúde** (PSF, UBS)
- **Laboratórios** (gestão de exames)

---

## ✨ Funcionalidades

### 📝 Gestão de Pacientes
- Cadastro completo com validação de CPF
- Prontuário médico eletrônico (PEP)
- Histórico de consultas, exames e prescrições
- Alergias e contraindicações
- Anamnese estruturada

### 💊 Prescrições Médicas (CFM/ANVISA 2026)
- **Receita Simples** (1 via)
- **Receita Antimicrobiana** (2 vias, 10 dias de validade)
- **Notificação A** (amarela, entorpecentes)
- **Notificação B** (azul, psicotrópicos)
- **Receita C1/C4/C5** (controle especial)
- Classificação automática de medicamentos
- Quantidade por extenso para controladas
- QR Code de verificação
- Assinatura digital A1/A3

### 📄 Documentos Médicos
- Atestados médicos
- Encaminhamentos
- Solicitações de exames
- Relatórios médicos
- Certificados digitais (ICP-Brasil)

### 🔐 LGPD e Privacidade
- Pseudonimização para administradores
- Histórico de acessos
- Portabilidade de dados (exportação JSON/PDF)
- Solicitação de exclusão de dados
- Oposição ao tratamento
- Histórico de termos aceitos
- Logs de auditoria imutáveis

### 🤖 Inteligência Artificial
- **Ollama** (IA local, privada)
  - Sugestões de tratamento
  - Análise de sintomas
  - Avaliação de risco
- **Whisper** (transcrição de consultas)
- **OCR** (digitalização de documentos)

### 🗓️ Agendamento
- Calendário médico
- Confirmação automática (WhatsApp/SMS)
- Lembretes de consulta
- Fila de espera
- Reagendamento

### 📊 Relatórios e BI
- Dashboard administrativo
- Métricas de atendimento
- Relatórios financeiros
- Estatísticas epidemiológicas
- Exportação para Excel/PDF

### 🔗 Integrações
- **FHIR R4** (HL7)
- **e-SUS/SISAB** (envio de fichas)
- **RNDS** (Rede Nacional de Dados em Saúde)
- **TISS** (ANS - convênios)
- **Google Drive** (backup)
- **Azure Blob** (armazenamento cloud)

---

## 🛡️ Conformidade

### CFM (Conselho Federal de Medicina)
- ✅ **Resolução CFM 2.299/2021** (Telemedicina e Assinatura Digital)
- ✅ **Resolução CFM 1.821/2007** (Prontuário Médico)
- ✅ **Manual de Prescrição Médica** (campos obrigatórios)

### ANVISA
- ✅ **Portaria SVS/MS nº 344/98** (Medicamentos Controlados)
- ✅ **Atualização fevereiro 2026** (novos modelos de receituário)
- ✅ Listas A1, A2, B1, B2, C1, C4, C5 implementadas
- ✅ Numeração sequencial obrigatória
- ✅ Quantidade por extenso automática

### LGPD (Lei 13.709/2018)
- ✅ Consentimento granular
- ✅ Portabilidade de dados
- ✅ Direito ao esquecimento
- ✅ Pseudonimização
- ✅ Logs de auditoria
- ✅ Notificação de vazamentos
- ✅ DPO designado

### SBIS (Sociedade Brasileira de Informática em Saúde)
- 🔄 **NGS1** (parcialmente implementado)
- ✅ Certificação digital ICP-Brasil
- ✅ Trilha de auditoria
- ✅ Controle de acesso baseado em papéis (RBAC)

### ICP-Brasil
- ✅ **PAdES-B** (assinatura básica)
- ✅ **PAdES-T** (timestamp RFC 3161)
- ✅ Certificados A1 (arquivo .pfx)
- 🔄 Certificados A3 (token USB/smartcard)
- ✅ Validação OCSP/CRL
- ✅ Verificação em validar.iti.gov.br

---

## 🏗️ Arquitetura

### Stack Tecnológico

**Frontend**
- Next.js 14 (App Router)
- React 18
- TypeScript 5
- TailwindCSS
- Radix UI
- React Hook Form + Zod

**Backend**
- Next.js API Routes
- Prisma ORM
- PostgreSQL 15
- Redis (cache + filas)
- BullMQ (processamento assíncrono)

**Documentos**
- PDFKit (geração)
- pdf-lib (manipulação)
- @signpdf (assinatura digital)
- Gotenberg (conversão HTML → PDF)

**IA e ML**
- Ollama (LLaMA 3, qwen2.5)
- Whisper (STT)
- OpenAI API (opcional)

**Infraestrutura**
- Docker + Docker Compose
- Nginx (proxy reverso)
- Let's Encrypt (SSL)
- rclone (backup)

### Diagramas

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │────▶│  Next.js    │────▶│ PostgreSQL  │
│   (React)   │     │  API Routes │     │             │
└─────────────┘     └──────┬──────┘     └─────────────┘
                           │
                    ┌──────▼──────┐
                    │    Redis    │
                    │  + BullMQ   │
                    └─────────────┘
```

Para diagramas completos, veja [DIAGRAMAS_ARQUITETURA.md](docs/DIAGRAMAS_ARQUITETURA.md).

---

## 🚀 Instalação

### Pré-requisitos

- **Docker** 20.10+
- **Docker Compose** 2.0+
- **Git**
- 4GB RAM mínimo
- 20GB espaço em disco

### Instalação Local (Docker)

```bash
# 1. Clonar repositório
git clone https://github.com/rpzk/HealthCare.git
cd HealthCare

# 2. Configurar variáveis de ambiente
cp .env.example .env
nano .env  # Editar com suas credenciais

# 3. Iniciar containers
docker-compose up -d

# 4. Executar migrações
docker-compose exec app npx prisma migrate deploy

# 5. Seed inicial (opcional)
docker-compose exec app npm run seed

# 6. Acessar
# http://localhost:3000
```

### Configuração Mínima (.env)

```env
# Database
DATABASE_URL=postgresql://healthcare:password@postgres:5432/healthcare_db

# Redis
REDIS_URL=redis://redis:6379

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<gerar com: openssl rand -base64 32>

# App
NODE_ENV=development
```

---

## ☁️ Deploy

### CI/CD (Deploy Automático)

Configure deploy automático via GitHub Actions:

- **UmbrelOS** (minipc): push em `main` → build + test → deploy via SSH
- **Azure** (cliente): template pronto, ativa quando credenciais forem fornecidas

📘 **[Guia de Configuração CI/CD](docs/CICD_SETUP.md)**

### Deploy no Azure

Para deploy completo no Azure (VM + PostgreSQL + Redis), siga o guia:

📘 **[Guia Completo de Deploy Azure](docs/DEPLOY_AZURE.md)**

**Resumo do processo:**

```bash
# 1. Criar Resource Group
az group create --name healthcare-rg --location brazilsouth

# 2. Criar PostgreSQL
az postgres flexible-server create --resource-group healthcare-rg ...

# 3. Criar Redis
az redis create --resource-group healthcare-rg ...

# 4. Criar VM
az vm create --resource-group healthcare-rg --image Ubuntu2204 ...

# 5. Deploy da aplicação
ssh azureuser@<VM_IP>
git clone https://github.com/rpzk/HealthCare.git
docker-compose -f docker-compose.prod.yml up -d
```

### Deploy em Outros Provedores

- **AWS**: [DEPLOY_AWS.md](docs/DEPLOY_AWS.md) (em breve)
- **Google Cloud**: [DEPLOY_GCP.md](docs/DEPLOY_GCP.md) (em breve)
- **DigitalOcean**: [DEPLOY_DIGITALOCEAN.md](docs/DEPLOY_DIGITALOCEAN.md) (em breve)

---

## 📚 Documentação

### Documentação Completa

| Documento | Descrição |
|-----------|-----------|
| [INFRAESTRUTURA_CUSTOS.md](docs/INFRAESTRUTURA_CUSTOS.md) | Análise de custos (local vs cloud) |
| [DIAGRAMAS_ARQUITETURA.md](docs/DIAGRAMAS_ARQUITETURA.md) | Diagramas técnicos completos |
| [CICD_SETUP.md](docs/CICD_SETUP.md) | Configuração CI/CD (Umbrel + Azure) |
| [DEPLOY_AZURE.md](docs/DEPLOY_AZURE.md) | Guia passo a passo Azure |
| [PRESCRICOES_CFM_ANVISA_2026.md](docs/PRESCRICOES_CFM_ANVISA_2026.md) | Normas de prescrições |
| [SBIS_CFM_COMPLIANCE.md](docs/SBIS_CFM_COMPLIANCE.md) | Conformidade regulatória |
| [CFM_PEP_COMPLIANCE_REPORT.md](docs/CFM_PEP_COMPLIANCE_REPORT.md) | Relatório de conformidade PEP |
| [ANALISE_ASSINATURA_PDF_ITI.md](docs/ANALISE_ASSINATURA_PDF_ITI.md) | Análise técnica PAdES |
| [DEPLOY-DOCKER.md](docs/DEPLOY-DOCKER.md) | Deploy Docker completo |

### Apresentações

- [Apresentação Técnica (TI)](docs/APRESENTACAO_TI.html)
- [Apresentação para Médicos](docs/APRESENTACAO_MEDICOS.html)
- [Apresentação para Pacientes](docs/APRESENTACAO_PACIENTES.html)

---

## 🛠️ Tecnologias

### Core
- ![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
- ![React](https://img.shields.io/badge/React-18-blue?logo=react)
- ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
- ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue?logo=postgresql)

### Infraestrutura
- ![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker)
- ![Redis](https://img.shields.io/badge/Redis-7-red?logo=redis)
- ![Nginx](https://img.shields.io/badge/Nginx-Proxy-green?logo=nginx)

### Segurança
- ![ICP-Brasil](https://img.shields.io/badge/ICP--Brasil-PAdES-green)
- ![LGPD](https://img.shields.io/badge/LGPD-Compliant-green)
- ![CFM](https://img.shields.io/badge/CFM-2.299%2F2021-green)

### IA/ML
- ![Ollama](https://img.shields.io/badge/Ollama-LLaMA-purple)
- ![Whisper](https://img.shields.io/badge/Whisper-STT-blue)

---

## 💰 Custos

### Comparativo: Local vs Azure

| Cenário | Local (1º ano) | Azure (anual) | Economia |
|---------|----------------|---------------|----------|
| **Pequeno** (50 pac/dia) | R$ 7.336 | R$ 6.684 | Azure 9% mais barato |
| **Médio** (200 pac/dia) | R$ 24.554 | R$ 46.020 | Local 47% mais barato |
| **Grande** (1000 pac/dia) | R$ 150.732 | R$ 473.832 | Local 68% mais barato |

> **Nota**: Custos locais incluem investimento inicial em hardware. A partir do 2º ano, o local é sempre mais econômico.

📊 **Análise completa**: [INFRAESTRUTURA_CUSTOS.md](docs/INFRAESTRUTURA_CUSTOS.md)

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Para contribuir:

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/NovaFuncionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/NovaFuncionalidade`)
5. Abra um Pull Request

### Convenções de Commit

Seguimos o [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` Nova funcionalidade
- `fix:` Correção de bug
- `docs:` Documentação
- `style:` Formatação
- `refactor:` Refatoração
- `test:` Testes
- `chore:` Manutenção

---

## 📜 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

---

## 👥 Autores

- **HealthCare Team** - *Desenvolvimento inicial*

---

## 🙏 Agradecimentos

- Conselho Federal de Medicina (CFM) - Diretrizes de Telemedicina
- ANVISA - Regulamentação de Medicamentos Controlados
- SBIS - Padrões de Interoperabilidade
- ITI - Infraestrutura de Chaves Públicas Brasileira

---

## 📞 Suporte

- **Issues**: [GitHub Issues](https://github.com/rpzk/HealthCare/issues)
- **Discussões**: [GitHub Discussions](https://github.com/rpzk/HealthCare/discussions)
- **Documentação**: [Wiki](https://github.com/rpzk/HealthCare/wiki)

---

## 🗺️ Roadmap

### v1.0 (Atual) ✅
- [x] Prontuário Eletrônico (PEP)
- [x] Prescrições CFM-compliant
- [x] Assinatura Digital ICP-Brasil
- [x] LGPD completo
- [x] Agendamento
- [x] IA local (Ollama)
- [x] Transcrição (Whisper)

### v1.1 (Q1 2026) 🔄
- [ ] Integração RNDS completa
- [ ] e-SUS AB/SISAB
- [ ] TISS (convênios)
- [ ] App mobile (React Native)
- [ ] Certificação SBIS NGS1

### v2.0 (Q2 2026) 🔮
- [ ] Multi-tenancy (SaaS)
- [ ] Marketplace de integrações
- [ ] BI avançado com ML
- [ ] Blockchain para auditoria
- [ ] Certificação ISO 27001

---

<div align="center">

**[⬆ Voltar ao topo](#-healthcare-system)**

Feito com ❤️ pela comunidade brasileira de saúde digital

</div>

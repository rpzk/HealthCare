# Diagramas de Arquitetura - HealthCare System

## 1. Arquitetura On-Premise (Local)

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLÍNICA/HOSPITAL                         │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    SERVIDOR FÍSICO                      │    │
│  │                                                          │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │            DOCKER HOST (Ubuntu 22.04)            │   │    │
│  │  │                                                   │   │    │
│  │  │  ┌──────────────┐  ┌──────────────┐             │   │    │
│  │  │  │  Next.js App │  │  PostgreSQL  │             │   │    │
│  │  │  │  (3000)      │  │  (5432)      │             │   │    │
│  │  │  │              │  │              │             │   │    │
│  │  │  │  - Frontend  │  │  - Dados     │             │   │    │
│  │  │  │  - API       │  │  - Backup    │             │   │    │
│  │  │  │  - SSR       │  │    diário    │             │   │    │
│  │  │  └──────┬───────┘  └──────┬───────┘             │   │    │
│  │  │         │                  │                     │   │    │
│  │  │  ┌──────▼───────┐  ┌──────▼───────┐             │   │    │
│  │  │  │   Redis      │  │  Gotenberg   │             │   │    │
│  │  │  │   (6379)     │  │  (3001)      │             │   │    │
│  │  │  │              │  │              │             │   │    │
│  │  │  │  - Cache     │  │  - PDF Gen   │             │   │    │
│  │  │  │  - Sessions  │  │  - Sign      │             │   │    │
│  │  │  │  - Queue     │  │              │             │   │    │
│  │  │  └──────────────┘  └──────────────┘             │   │    │
│  │  │                                                   │   │    │
│  │  │  ┌──────────────┐  ┌──────────────┐             │   │    │
│  │  │  │   Ollama     │  │   Whisper    │             │   │    │
│  │  │  │   (11434)    │  │   (9000)     │             │   │    │
│  │  │  │              │  │              │             │   │    │
│  │  │  │  - IA Local  │  │  - STT       │             │   │    │
│  │  │  │  - LLaMA     │  │  - Transcrição│            │   │    │
│  │  │  └──────────────┘  └──────────────┘             │   │    │
│  │  │                                                   │   │    │
│  │  └───────────────────────────────────────────────────┘   │    │
│  │                                                          │    │
│  │  ┌─────────────────────────────────────────────────┐   │    │
│  │  │              ARMAZENAMENTO                       │   │    │
│  │  │                                                   │   │    │
│  │  │  /app/uploads/    - Certificados (.pfx)         │   │    │
│  │  │                   - Documentos assinados         │   │    │
│  │  │                   - Gravações                    │   │    │
│  │  │                                                   │   │    │
│  │  │  /app/backups/    - Backup DB diário            │   │    │
│  │  │                   - Backup semanal completo      │   │    │
│  │  │                                                   │   │    │
│  │  └───────────────────────────────────────────────────┘   │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                    REDE LOCAL                           │    │
│  │                                                          │    │
│  │  Switch Gigabit ──── Router/Firewall ──── Internet     │    │
│  │       │                                                  │    │
│  │       ├── Estação 1 (Recepção)                         │    │
│  │       ├── Estação 2 (Consultório 1)                    │    │
│  │       ├── Estação 3 (Consultório 2)                    │    │
│  │       └── Impressora                                    │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │               BACKUP OFFSITE                            │    │
│  │                                                          │    │
│  │  Google Drive / Azure Blob (via rclone)                │    │
│  │  - Backup semanal automático                            │    │
│  │  - Retenção: 12 meses                                  │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. Arquitetura Azure Cloud (Básico)

```
┌─────────────────────────────────────────────────────────────────┐
│                        MICROSOFT AZURE                           │
│                        RESOURCE GROUP: healthcare-rg             │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              VIRTUAL NETWORK (10.0.0.0/16)             │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────┐          │    │
│  │  │     SUBNET: app-subnet (10.0.1.0/24)     │          │    │
│  │  │                                            │          │    │
│  │  │  ┌────────────────────────────────────┐  │          │    │
│  │  │  │    VIRTUAL MACHINE (Standard B2s)  │  │          │    │
│  │  │  │                                     │  │          │    │
│  │  │  │  OS: Ubuntu 22.04 LTS              │  │          │    │
│  │  │  │  IP: 10.0.1.4 (private)            │  │          │    │
│  │  │  │                                     │  │          │    │
│  │  │  │  ┌──────────────────────────────┐  │  │          │    │
│  │  │  │  │      Docker Containers        │  │  │          │    │
│  │  │  │  │                                │  │  │          │    │
│  │  │  │  │  - Next.js (3000)             │  │  │          │    │
│  │  │  │  │  - Gotenberg (3001)           │  │  │          │    │
│  │  │  │  │                                │  │  │          │    │
│  │  │  │  └──────────────────────────────┘  │  │          │    │
│  │  │  └────────────────────────────────────┘  │          │    │
│  │  │                                            │          │    │
│  │  └────────────────────────────────────────────┘          │    │
│  │                                                          │    │
│  │  ┌──────────────────────────────────────────┐          │    │
│  │  │   SUBNET: data-subnet (10.0.2.0/24)      │          │    │
│  │  │                                            │          │    │
│  │  │  ┌────────────────────────────────────┐  │          │    │
│  │  │  │  Azure Database for PostgreSQL    │  │          │    │
│  │  │  │  (Flexible Server - Basic)         │  │          │    │
│  │  │  │                                     │  │          │    │
│  │  │  │  - 1 vCore, 2GB RAM                │  │          │    │
│  │  │  │  - 32GB Storage                    │  │          │    │
│  │  │  │  - Automated Backup (7 days)       │  │          │    │
│  │  │  └────────────────────────────────────┘  │          │    │
│  │  │                                            │          │    │
│  │  │  ┌────────────────────────────────────┐  │          │    │
│  │  │  │  Azure Cache for Redis             │  │          │    │
│  │  │  │  (Basic C0)                         │  │          │    │
│  │  │  │                                     │  │          │    │
│  │  │  │  - 250MB                            │  │          │    │
│  │  │  │  - 99.9% SLA                        │  │          │    │
│  │  │  └────────────────────────────────────┘  │          │    │
│  │  └────────────────────────────────────────────┘          │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              LOAD BALANCER / GATEWAY                    │    │
│  │                                                          │    │
│  │  Azure Application Gateway (optional)                   │    │
│  │  - Public IP                                            │    │
│  │  - SSL Termination                                      │    │
│  │  - WAF (Web Application Firewall)                       │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │                   STORAGE                               │    │
│  │                                                          │    │
│  │  Azure Blob Storage (Standard LRS)                      │    │
│  │  - Containers:                                          │    │
│  │    * certificates/  (certificados A1)                   │    │
│  │    * documents/     (PDFs assinados)                    │    │
│  │    * recordings/    (gravações)                         │    │
│  │    * backups/       (backup automático)                 │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                  │
│  ┌────────────────────────────────────────────────────────┐    │
│  │              MONITORING & SECURITY                      │    │
│  │                                                          │    │
│  │  - Azure Monitor (logs + métricas)                      │    │
│  │  - Azure Key Vault (certificados SSL)                   │    │
│  │  - Network Security Groups (firewall)                   │    │
│  │  - Azure Backup (geo-redundante)                        │    │
│  └────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │    INTERNET     │
                    │                 │
                    │  - Usuários     │
                    │  - Pacientes    │
                    │  - Médicos      │
                    └─────────────────┘
```

---

## 3. Arquitetura Azure Cloud (Premium - Alta Disponibilidade)

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           MICROSOFT AZURE                                 │
│                    MULTI-REGION (Brazil South + Brazil Southeast)        │
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    REGION: Brazil South (Primary)                  │  │
│  │                                                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │              AVAILABILITY ZONE 1                             │  │  │
│  │  │                                                               │  │  │
│  │  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│  │  │
│  │  │  │   VM Scale Set │  │   PostgreSQL   │  │   Redis Cache  ││  │  │
│  │  │  │   (D8s_v5)     │  │   Hyperscale   │  │   Premium P1   ││  │  │
│  │  │  │   Instance 1   │  │   (Primary)    │  │   (Primary)    ││  │  │
│  │  │  └────────────────┘  └────────────────┘  └────────────────┘│  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │              AVAILABILITY ZONE 2                             │  │  │
│  │  │                                                               │  │  │
│  │  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│  │  │
│  │  │  │   VM Scale Set │  │   PostgreSQL   │  │   Redis Cache  ││  │  │
│  │  │  │   (D8s_v5)     │  │   Hyperscale   │  │   Premium P1   ││  │  │
│  │  │  │   Instance 2   │  │   (Replica)    │  │   (Replica)    ││  │  │
│  │  │  └────────────────┘  └────────────────┘  └────────────────┘│  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │              AVAILABILITY ZONE 3                             │  │  │
│  │  │                                                               │  │  │
│  │  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐│  │  │
│  │  │  │   VM Scale Set │  │   PostgreSQL   │  │   Redis Cache  ││  │  │
│  │  │  │   (D8s_v5)     │  │   Hyperscale   │  │   Premium P1   ││  │  │
│  │  │  │   Instance 3   │  │   (Replica)    │  │   (Replica)    ││  │  │
│  │  │  └────────────────┘  └────────────────┘  └────────────────┘│  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                    LOAD BALANCING                            │  │  │
│  │  │                                                               │  │  │
│  │  │  Azure Application Gateway WAF v2                            │  │  │
│  │  │  - Auto-scaling                                              │  │  │
│  │  │  - SSL Offload                                               │  │  │
│  │  │  - Health Probes                                             │  │  │
│  │  │  - Session Affinity                                          │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  │                                                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │                      STORAGE                                 │  │  │
│  │  │                                                               │  │  │
│  │  │  Azure Blob Storage (Zone-Redundant Storage - ZRS)           │  │  │
│  │  │  - Hot Tier: 1TB (documentos ativos)                         │  │  │
│  │  │  - Cool Tier: 2TB (arquivos antigos)                         │  │  │
│  │  │  - Archive Tier: 2TB (backups históricos)                    │  │  │
│  │  │  - Lifecycle Management (auto-tiering)                       │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                 REGION: Brazil Southeast (DR)                      │  │
│  │                                                                     │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │              DISASTER RECOVERY RESOURCES                     │  │  │
│  │  │                                                               │  │  │
│  │  │  - PostgreSQL Geo-Replica (Read-only)                        │  │  │
│  │  │  - Blob Storage Geo-Redundant (GRS)                          │  │  │
│  │  │  - VM Images (for quick failover)                            │  │  │
│  │  │  - Traffic Manager (DNS failover)                            │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    SECURITY & COMPLIANCE                           │  │
│  │                                                                     │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │  │
│  │  │ Azure Firewall  │  │  Azure DDoS     │  │  Azure Key      │  │  │
│  │  │ Premium         │  │  Protection     │  │  Vault Premium  │  │  │
│  │  │                 │  │  Standard       │  │                 │  │  │
│  │  │ - IDPS          │  │                 │  │  - Certificates │  │  │
│  │  │ - TLS Inspect   │  │  - 2Tbps        │  │  - Secrets      │  │  │
│  │  │ - Threat Intel  │  │    mitigation   │  │  - HSM keys     │  │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │  │
│  │                                                                     │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │  │
│  │  │ Azure Sentinel  │  │  Azure Policy   │  │  Azure Monitor  │  │  │
│  │  │ (SIEM)          │  │                 │  │                 │  │  │
│  │  │                 │  │  - Compliance   │  │  - APM          │  │  │
│  │  │ - SOC           │  │  - LGPD/HIPAA   │  │  - Logs         │  │  │
│  │  │ - Threat Hunt   │  │  - ISO 27001    │  │  - Alertas      │  │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
│                                                                           │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                    DEVOPS & AUTOMATION                             │  │
│  │                                                                     │  │
│  │  - Azure DevOps (CI/CD pipelines)                                  │  │
│  │  - Azure Automation (runbooks)                                     │  │
│  │  - Azure Logic Apps (workflows)                                    │  │
│  │  - Terraform / ARM Templates (IaC)                                 │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
                ┌───────────────────────────────────────┐
                │        GLOBAL TRAFFIC MANAGER         │
                │                                        │
                │  - DNS-based load balancing            │
                │  - Health monitoring                   │
                │  - Auto-failover (< 15 min)            │
                │  - Geographic routing                  │
                └───────────────────────────────────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │    INTERNET     │
                          │                 │
                          │  - Clínicas     │
                          │  - Hospitais    │
                          │  - Pacientes    │
                          │  - Mobile Apps  │
                          └─────────────────┘
```

---

## 4. Fluxo de Dados - Prescrição CFM-Compliant

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO DE PRESCRIÇÃO                           │
└─────────────────────────────────────────────────────────────────┘

1. CRIAÇÃO DA PRESCRIÇÃO
   │
   ├─► Médico preenche formulário (Frontend React)
   │   - Paciente
   │   - Medicamentos
   │   - Posologia
   │
   └─► POST /api/prescriptions
       │
       ├─► Validação Zod Schema
       │
       ├─► Classificador Automático
       │   └─► Detecta tipo (SIMPLE, ANTIMICROBIAL, CONTROLLED_A/B/C)
       │
       ├─► Salva no PostgreSQL
       │   └─► Status: DRAFT
       │
       └─► Retorna ID da prescrição

2. GERAÇÃO DO PDF
   │
   ├─► GET /api/prescriptions/[id]/pdf
   │   │
   │   ├─► Carrega dados do banco (Prisma)
   │   │
   │   ├─► Gerador CFM (pdf-generator.ts)
   │   │   │
   │   │   ├─► Cabeçalho (médico, CRM)
   │   │   ├─► Dados do paciente
   │   │   ├─► Medicamentos (com quantidade por extenso se controlado)
   │   │   ├─► QR Code de verificação
   │   │   └─► Rodapé (assinatura)
   │   │
   │   └─► Retorna PDF (Buffer)

3. ASSINATURA DIGITAL (OPCIONAL)
   │
   ├─► POST /api/prescriptions/[id]/sign
   │   │
   │   ├─► Carrega certificado A1 do médico (PostgreSQL)
   │   │
   │   ├─► Gera PDF não-assinado
   │   │
   │   ├─► PAdES Signer (pades-signer.ts)
   │   │   │
   │   │   ├─► Aplica assinatura digital (ICP-Brasil)
   │   │   ├─► Adiciona timestamp (TSA)
   │   │   ├─► Gera hash SHA-256
   │   │   └─► Salva metadados
   │   │
   │   ├─► Salva PDF assinado
   │   │   └─► /uploads/documents/prescription/[id].pdf
   │   │
   │   └─► Atualiza banco (Status: SIGNED)

4. COMPARTILHAMENTO COM PACIENTE
   │
   ├─► Notificação (email/SMS)
   │   └─► Link: /minha-saude/receitas
   │
   └─► Paciente acessa portal
       │
       ├─► Visualiza lista de prescrições
       │
       ├─► Download PDF
       │   └─► GET /api/prescriptions/[id]/pdf
       │
       └─► Verifica assinatura digital
           └─► GET /api/prescriptions/[id]/signature
               └─► Exibe: Certificado, Data, Validade

5. VERIFICAÇÃO PÚBLICA (OPCIONAL)
   │
   └─► QR Code na receita aponta para:
       └─► /validar/[id]
           │
           ├─► Valida hash
           ├─► Verifica certificado (OCSP)
           └─► Exibe dados públicos:
               - Médico (nome, CRM)
               - Data de emissão
               - Validade
               - Status da assinatura
```

---

## 5. Fluxo de Backup e Recuperação

```
┌─────────────────────────────────────────────────────────────────┐
│                  ESTRATÉGIA DE BACKUP 3-2-1                      │
└─────────────────────────────────────────────────────────────────┘

IMPLEMENTAÇÃO LOCAL:

  ┌────────────────────────────────────────────────────────┐
  │            SERVIDOR LOCAL (Origem)                      │
  │                                                          │
  │  PostgreSQL                                             │
  │  /app/uploads/                                          │
  │  /app/data/                                             │
  └────┬─────────────────────────────────────────────┬──────┘
       │                                              │
       │ DIÁRIO (00:00)                              │ SEMANAL (Domingo 02:00)
       ▼                                              ▼
  ┌────────────────────────────┐          ┌────────────────────────────┐
  │  BACKUP 1: SSD Local       │          │  BACKUP 2: HDD Externo     │
  │                             │          │                             │
  │  /backups/db/daily/        │          │  /mnt/backup/weekly/       │
  │  - dump_2026-02-20.sql.gz  │          │  - full_2026-02-16.tar.gz  │
  │                             │          │                             │
  │  Retenção: 7 dias          │          │  Retenção: 12 semanas      │
  └────────────────────────────┘          └────────────────────────────┘
                                                      │
                                                      │ SYNC (rclone)
                                                      ▼
                                          ┌────────────────────────────┐
                                          │  BACKUP 3: Cloud Offsite   │
                                          │                             │
                                          │  Google Drive / Azure Blob │
                                          │  - /HealthCare_Backups/    │
                                          │                             │
                                          │  Retenção: 12 meses        │
                                          └────────────────────────────┘

RECUPERAÇÃO (Disaster Recovery):

  CENÁRIO 1: Arquivo corrompido
  └─► Restaurar do backup diário (< 1 hora)

  CENÁRIO 2: Falha do servidor
  └─► Instalar em novo hardware
      └─► Restaurar do backup semanal (2-4 horas)

  CENÁRIO 3: Desastre total (incêndio, roubo)
  └─► Download do backup offsite (cloud)
      └─► Restaurar em novo local (4-8 horas)

─────────────────────────────────────────────────────────────────

IMPLEMENTAÇÃO AZURE:

  ┌────────────────────────────────────────────────────────┐
  │              RECURSOS AZURE (Origem)                    │
  │                                                          │
  │  PostgreSQL Flexible Server                             │
  │  Azure Blob Storage                                     │
  │  VM Disks                                               │
  └────┬─────────────────────────────────────────────┬──────┘
       │                                              │
       │ AUTOMÁTICO (Contínuo)                       │ PONTO-NO-TEMPO (PITR)
       ▼                                              ▼
  ┌────────────────────────────┐          ┌────────────────────────────┐
  │  BACKUP 1: Azure Backup    │          │  BACKUP 2: Geo-Redundant   │
  │  (Vault - Local)            │          │  (GRS/ZRS)                 │
  │                             │          │                             │
  │  - Daily snapshots          │          │  - Região secundária        │
  │  - Incremental              │          │  - Replicação assíncrona    │
  │  - 35 dias retenção         │          │  - RPO: 15 min              │
  └────────────────────────────┘          └────────────────────────────┘
                                                      │
                                                      │ DISASTER RECOVERY
                                                      ▼
                                          ┌────────────────────────────┐
                                          │  BACKUP 3: DR Region       │
                                          │                             │
                                          │  Brazil Southeast           │
                                          │  - Failover automático      │
                                          │  - RTO: < 15 min            │
                                          └────────────────────────────┘

RECUPERAÇÃO (Azure):

  CENÁRIO 1: Dados deletados acidentalmente
  └─► Restaurar do PITR (< 5 min)

  CENÁRIO 2: Corrupção de banco
  └─► Restaurar snapshot mais recente (< 30 min)

  CENÁRIO 3: Falha regional
  └─► Failover automático para região DR (< 15 min)
      └─► Traffic Manager redireciona tráfego
```

---

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0

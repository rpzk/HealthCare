# 📋 Features Não Implementadas ou Incompletas

**Data:** 15 de Dezembro de 2025  
**Objetivo:** Mapa de funcionalidades pendentes para priorização

---

## 🔴 ENCONTRADOS (6)

### 1. **Rastreamento de Tomada de Medicamentos** (In-Code TODO)

**Localização:** [app/api/minha-saude/route.ts](app/api/minha-saude/route.ts#L65)

**Status:** ❌ Não implementado

**Descrição:**
```typescript
taken: [] // TODO: Implementar tracking de tomada de medicamentos
```

**Contexto:** Pacientes deveriam poder registrar quando tomaram medicamentos prescritos, para monitor aderência a tratamentos.

**Esforço Estimado:** 3-5 horas
- Schema Prisma: `MedicationTaken` (patientId, prescriptionId, timestamp, notes)
- API: GET/POST para registrar tomadas
- UI: Calendar/checklist para paciente marcar medicações
- Notificação: Lembrete diário se medicação não foi marcada

**Impacto:** Média (nice-to-have para compliance clínico)

---

### 2. **Pesquisa de Satisfação (NPS)** - Partial

**Localização:** [TIER2_IMPLEMENTATION.md](TIER2_IMPLEMENTATION.md#L83)

**Status:** ⚠️ Parcialmente Implementado

**O que está pronto:**
- ✅ Schema Prisma: `NpsResponse` com 14 campos
- ✅ Service Layer: `lib/nps-service.ts` (370 linhas) com:
  - Sentiment analysis baseado em keywords
  - Extração de tags (8 categorias)
  - Cálculo de NPS padrão
  - Detecção de detratores

**O que falta:**
- ❌ Endpoint POST para responder survey: `/api/nps/route.ts`
- ❌ Endpoint GET para métricas: `/api/nps/stats/route.ts`
- ❌ Cron job para enviar surveys: `/api/cron/nps/route.ts`
- ❌ UI Form: `components/nps/nps-survey-form.tsx` (score 0-10)
- ❌ UI Dashboard: `components/nps/nps-dashboard.tsx` (métricas/trends)
- ❌ Integração WhatsApp: envio automático 24h pós-consulta

**Esforço Estimado:** 1 semana (8-10 horas)

**Impacto:** Alta (métrica crítica para retenção)

---

### 3. **BI Dashboard para Gestores** - Partial

**Localização:** [TIER2_IMPLEMENTATION.md](TIER2_IMPLEMENTATION.md#L100)

**Status:** ⚠️ Service pronto, UI faltando

**O que está pronto:**
- ✅ Service Layer: `lib/bi-service.ts` (329 linhas) com cálculos de:
  - KPIs (pacientes, consultas, receita)
  - Consultas por médico/especialidade
  - Taxa de no-show
  - Horários de pico

**O que falta:**
- ❌ API endpoints:
  - `app/api/bi/dashboard/route.ts`
  - `app/api/bi/consultations-trend/route.ts`
  - `app/api/bi/risk-analysis/route.ts`
- ❌ React component: `components/bi/bi-dashboard.tsx` com Recharts
- ❌ Page: `app/bi/page.tsx` com layout
- ❌ Permissões: Validar acesso ADMIN/MANAGER

**Esforço Estimado:** 5-7 horas

**Impacto:** Alta (decisões gerenciais)

---

### 4. **Assinatura Digital (ICP-Brasil)** - Schema Complete, Endpoints Pending

**Localização:** [GAP_ANALYSIS.md](GAP_ANALYSIS.md#L36)

**Status:** ❌ Não implementado

**Requisitos:**
- Certificado digital A1 ou A3 (ICP-Brasil)
- Integração com provedores: BirdID, ClickSign, DocuSign
- Validação de certificados
- Carimbo de tempo (timestamp server)
- Armazenamento seguro de chaves privadas
- Interface para upload e gerenciamento

**Afeta:**
- Prescrições (legalmente vinculadas)
- Atestados (não implementado)
- Documentos médicos

**Esforço Estimado:** 2-3 semanas

**Impacto:** Crítica (sem isso, documentos não têm validade legal)

---

### 5. **Atestados Médicos** - NOT STARTED

**Localização:** [GAP_ANALYSIS.md](GAP_ANALYSIS.md#L230), [TIER2_IMPLEMENTATION.md](TIER2_IMPLEMENTATION.md#L1-100)

**Status:** ❌ Não implementado (schema pronto mas sem APIs/UI)

**O que precisa:**
- Schema Prisma: `MedicalCertificate` (15 campos) - ✅ Documentado
- Tipos: comparecimento, afastamento, acompanhante, atestado médico, óbito
- Numeração sequencial anual (001/2025, 002/2025...)
- CID-10 opcional (compliance LGPD)
- QR Code para validação pública (hash SHA-256)
- Revogação com motivo (audit trail)

**O que falta:**
- ❌ API endpoints: POST/GET/DELETE/validate
- ❌ React components: form + lista
- ❌ PDF generation com dados do atestado
- ❌ Geração de QR Code e validação pública
- ❌ Assinatura digital (depende do item #4)

**Esforço Estimado:** 1-2 semanas (depende de assinatura digital)

**Impacto:** Alta (funcionalidade básica para clínicas)

---

### 6. **Backup Automático Distribuído** - NOT STARTED

**Localização:** [GAP_ANALYSIS.md](GAP_ANALYSIS.md#L268)

**Status:** ❌ Não implementado

**Requisitos:**
- Backup diário automático do PostgreSQL
- Backup incremental de arquivos (/uploads)
- 3 locais: local + S3 + Google Drive/Azure
- Testes mensais de restore automáticos
- Notificação de falhas
- Retenção: 7 dias (diário), 4 semanas (semanal), 12 meses (mensal)
- Criptografia de backups

**Scripts necessários:**
- `/scripts/backup-db.sh`
- `/scripts/backup-files.sh`
- `/scripts/restore-db.sh`
- Cron job no servidor
- Monitor: `/lib/backup-monitor.ts`

**Esforço Estimado:** 1-2 semanas

**Impacto:** Crítica (proteção contra perda de dados)

---

## 🟡 PARCIALMENTE IMPLEMENTADOS (3)

### A. **Integração HL7/FHIR**

**Status:** ❌ Não iniciado

**Necessário para:** Interoperabilidade com hospitais/labs

**Esforço:** 3 semanas

---

### B. **Receituário Controlado (Receita B/C)**

**Status:** ❌ Não iniciado

**Necessário para:** Prescrever medicações controladas

**Esforço:** 2 semanas

---

### C. **Multi-Tenancy (Multi-Clínicas)**

**Status:** ❌ Não iniciado (sistema single-tenant)

**Necessário para:** Modelo SaaS

**Esforço:** 4 semanas

---

## 📊 RESUMO POR CRITICIDADE

### 🔴 CRÍTICO (Bloqueadores)
| # | Feature | Esforço | Impacto |
|---|---------|---------|--------|
| 4 | Assinatura Digital ICP | 2-3 sem | Doctos inválidos |
| 6 | Backup Automático | 1-2 sem | Perda de dados |
| 5 | Atestados Médicos | 1-2 sem | Funcionalidade básica |

**Total:** 4-7 semanas

---

### 🟡 IMPORTANTE (Competitividade)
| # | Feature | Esforço | Impacto |
|---|---------|---------|--------|
| 2 | NPS Survey | 1 sem | Retenção pacientes |
| 3 | BI Dashboard | 5-7h | Gestão operacional |

**Total:** 1 semana + 5-7h

---

### 🟢 NICE-TO-HAVE
| # | Feature | Esforço | Impacto |
|---|---------|---------|--------|
| 1 | Med. Tracking | 3-5h | Aderência ao tratamento |

**Total:** 3-5 horas

---

## 🎯 PRIORIZAÇÃO RECOMENDADA

### Rodada 1 (Próximo Sprint - 2 semanas)
1. ✅ **NPS Survey** (1 sem) - Alto ROI, baixo esforço
2. ✅ **BI Dashboard APIs** (5-7h) - Visibilidade gerencial

### Rodada 2 (Sprint+2 - 4-7 semanas)
3. 🔒 **Backup Automático** (1-2 sem) - Urgente, segurança
4. 📝 **Atestados Médicos** (1-2 sem) - Funcionalidade core
5. 🔐 **Assinatura Digital** (2-3 sem) - Validade legal

### Rodada 3 (Futuro)
6. 💊 **Med. Tracking** (3-5h) - Quando tiver tempo
7. 🏥 **Multi-Tenancy** (4 sem) - Para escalar SaaS
8. ⚕️ **HL7/FHIR** (3 sem) - Integração hospitalar

---

## 🔧 COMO PROCEDER

Para cada feature:
1. Criar branch: `feat/[feature-name]`
2. Implementar schema (se aplicável)
3. Implementar serviço/lógica
4. Implementar APIs
5. Implementar UI
6. Testes
7. PR + Review
8. Deploy staging
9. Deploy prod

---

**Last Updated:** 2025-12-15

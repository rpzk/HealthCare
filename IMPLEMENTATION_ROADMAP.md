# 🛣️ ROADMAP DE IMPLEMENTAÇÃO REAL

**Status:** Verdade nua, sem falsidades  
**Data:** 16 de Dezembro de 2025

---

## 🔴 CRÍTICO - Bloqueia Uso em Produção

### 1. Atestados Médicos (1-2 semanas) 🏥
**Por que é crítico:** Funcionalidade BÁSICA para qualquer clínica

**O que falta:**
```
❌ /api/certificates/route.ts - API para criar atestado
❌ /api/certificates/[id]/route.ts - Detalhes + atualização
❌ /api/certificates/validate/[number]/[year]/route.ts - Validação pública
❌ components/certificates/certificate-form.tsx - Form do médico
❌ components/certificates/certificate-list.tsx - Lista para paciente
❌ components/certificates/qr-validator.tsx - QR code validator
```

**Dados Necessários:**
- Tipo: "comparecimento", "afastamento", "acompanhante", "atestado_medico", "óbito"
- Numeração anual: 001/2025, 002/2025, etc
- CID-10 opcional (LGPD)
- QR Code público (hash SHA-256)
- Assinatura digital (depende de #2)

**Esforço:** 
- API: 4 horas
- UI: 2 horas
- Testes: 1 hora

---

### 2. Assinatura Digital ICP-Brasil (2-3 semanas) 🔐
**Por que é crítico:** Documentos sem assinatura = inválidos legalmente

**O que falta:**
```
❌ Integração com BirdID / ClickSign / DocuSign
❌ Upload de certificado A1 ou A3
❌ Carimbo de tempo (timestamp server)
❌ Armazenamento seguro de chaves privadas
❌ UI para gerenciar certificados
❌ Validação de cadeia de confiança ICP
```

**Impacta:**
- Assinatura de atestados (#1)
- Assinatura de prescrições
- Assinatura de documentos médicos

**Escolha de Provider:**
```typescript
// Opção 1: BirdID (Brasileiro)
import { signWithBirdID } from '@/lib/bird-id'
await signWithBirdID(document, cert_id, password)

// Opção 2: ClickSign (Cloud)
import { signWithClickSign } from '@/lib/clicksign'
await signWithClickSign(document, external_id)

// Opção 3: Integração Manual com OpenSSL
import crypto from 'crypto'
// Complexo, mas open-source
```

**Recomendação:** BirdID (mais integrado com Brasil) ou ClickSign (mais fácil)

---

### 3. Backup Automático Distribuído (1-2 semanas) 💾
**Por que é crítico:** Sem isso, um disco com problema = falência

**O que falta:**
```
❌ /scripts/backup-db.sh - Backup PostgreSQL diário
❌ /scripts/backup-files.sh - Backup de /uploads
❌ /scripts/restore-db.sh - Restauração automática
❌ /lib/backup-monitor.ts - Monitor de falhas
❌ Cron jobs para automação
❌ Testes mensais de restore
```

**Requisitos:**
- Backup diário automático PostgreSQL (comprimido)
- Backup incremental de arquivos (rsync)
- 3 locais: local + S3 + Google Drive/Azure
- Retenção: 7 dias (diário), 4 semanas (semanal), 12 meses (mensal)
- Notificação de falhas via email
- Testes automáticos de restore (1x/mês)

**Exemplo de script:**
```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
DB_BACKUP="/backups/healthcare_$DATE.sql.gz"

# 1. Backup PostgreSQL
pg_dump -h localhost -U healthcare healthcare_db | gzip > "$DB_BACKUP"

# 2. Upload para S3
aws s3 cp "$DB_BACKUP" s3://my-backup-bucket/db/

# 3. Upload para Google Drive (rclone)
rclone copy "$DB_BACKUP" gdrive:BackupsHealthcare/db/

# 4. Manter localmente apenas últimos 7 dias
find /backups -name "healthcare_*.sql.gz" -mtime +7 -delete
```

---

### 4. Receituário Controlado (2 semanas) 💊
**Por que é crítico:** Prescrever dipirona/tramadol/antibióticos sem isso = ilegal

**O que falta:**
```
❌ /lib/controlled-medications.ts - Lista de fármacos controlados
❌ /api/prescriptions/validate-controlled/route.ts - Validação
❌ /api/prescriptions/generate-form/route.ts - Gera Receita B/C
❌ Integração com CFM (registro obrigatório)
❌ Rastreamento de prescrições controladas (audit)
❌ UI com alertas de medicação controlada
```

**Fármacos Controlados Comuns:**
- **Dipirona** (Analgésico)
- **Tramadol** (Analgésico opiode)
- **Antibióticos** (Amoxicilina, Cefadroxil)
- **Benzodiazepínicos** (Diazepam, Lorazepam)
- **Antidepressivos** (Fluoxetina, Venlafaxina)

**Modelo Receita B:**
- Para medicamentos de interesse sanitário especial
- Requer receita talonária amarela
- Máximo 5 unidades por receita
- Válida por 30 dias

**Exemplo:**
```typescript
// lib/controlled-medications.ts
export const CONTROLLED_MEDICATIONS = {
  'dipirona': { type: 'B', reason: 'Analgésico' },
  'tramadol': { type: 'B', reason: 'Opiode' },
  'amoxicilina': { type: 'C', reason: 'Antibiótico' }
}

// Ao prescrever:
if (CONTROLLED_MEDICATIONS[drug.code]) {
  // Gera Receita B ou C
  await generateControlledForm(prescription, CONTROLLED_MEDICATIONS[drug.code])
  // Registra no CFM
  await notifyCFM(prescription)
}
```

---

## 🟡 IMPORTANTE - Afeta Competitividade

### 5. BI Dashboard UI (5-7 horas) 📊
**Status:** API existe, mas sem visualização

**O que falta:**
```
❌ app/bi/page.tsx - Página principal
❌ components/bi/dashboard-layout.tsx - Layout
❌ components/bi/kpi-cards.tsx - Cards de KPI
❌ components/bi/consultation-chart.tsx - Gráfico de tendência
❌ components/bi/risk-analysis-table.tsx - Tabela de risco
❌ components/bi/filters.tsx - Filtros de período
```

**APIs Existentes:**
```
✅ /api/bi/dashboard - KPIs prontos
✅ /api/bi/consultations-trend - Dados de tendência
✅ /api/bi/patients-risk - Análise de risco
```

**Componentes Necessários:**
```typescript
// app/bi/page.tsx
import { BiDashboard } from '@/components/bi/dashboard-layout'
import { KpiCards } from '@/components/bi/kpi-cards'
import { ConsultationTrendChart } from '@/components/bi/consultation-chart'

export default function BIDashboardPage() {
  return (
    <BiDashboard>
      <KpiCards />
      <ConsultationTrendChart />
      <RiskAnalysisTable />
    </BiDashboard>
  )
}
```

---

### 6. NPS Survey UI (1 semana) 📋
**Status:** API existe, forms faltam

**O que falta:**
```
❌ components/nps/nps-survey-form.tsx - Form para paciente responder
❌ components/nps/nps-dashboard.tsx - Dashboard de visualização
❌ components/nps/nps-trends.tsx - Gráfico de tendência
❌ /api/nps/send-survey/route.ts - Envio automático 24h pós-consulta
❌ Integração com WhatsApp para envio
```

**APIs Existentes:**
```
✅ /api/nps - POST para responder
✅ /api/nps/stats - GET estatísticas
✅ lib/nps-service.ts - Service layer pronto
```

**Survey Standard:**
```
"Qual a chance de você recomendar nosso consultório para um amigo?"
0 --------- 5 --------- 10

Campos:
- Score (0-10)
- Comment (texto livre)
- Categoria de feedback (9 opções)
- Envio automático via WhatsApp
```

---

## 🟢 NICE-TO-HAVE - Quando Tiver Tempo

### 7. Rastreamento de Medicação (3-5 horas) 💊
**Status:** Schema pronto, lógica faltando

**O que falta:**
```
❌ components/medications/medication-tracker.tsx
❌ components/medications/reminder-notification.tsx
❌ API de rastreamento (POST /api/medications/tracking/checkin)
❌ Lembrete diário se não marcou como tomada
❌ Dashboard de aderência
```

**Fluxo:**
1. Paciente recebe prescrição
2. App oferece "Marcar como tomada" ou "Agendar lembrete"
3. Lembrete diário às 8:00, 14:00, 20:00
4. Dashboard mostra: "Aderiu em 85% das doses"

---

### 8. HL7/FHIR Interoperabilidade (3 semanas) ��
**Status:** Zero implementação

**Por que:** Integração com hospitais/labs para troca automática de dados

**O que falar:**
```
❌ /api/fhir/* endpoints (recursos Patient, Observation, Procedure)
❌ Adaptador de dados para formato FHIR
❌ Integração com laboratorios que usam FHIR
❌ Integração com hospitais
```

**Exemplo FHIR (Patient):**
```json
{
  "resourceType": "Patient",
  "id": "patient-123",
  "name": [{ "given": ["João"], "family": "Silva" }],
  "birthDate": "1990-01-15",
  "gender": "male",
  "contact": [{ "telecom": [{ "system": "phone", "value": "11999999999" }] }]
}
```

---

### 9. Multi-Tenancy / SaaS (4 semanas) 🏢
**Status:** Sistema é single-tenant hoje

**O que falta:**
- Isolation de dados por clínica
- Sub-domain ou query param para seleção de tenant
- Pricing/Billing por tenant
- Customização por tenant (logo, cores, etc)
- SSO integrado

---

## 📋 PRIORIZAÇÃO RECOMENDADA

### Sprint 1 (Próximo 2 semanas) - CRÍTICO
1. ✅ **Atestados Médicos** (1-2 sem) - Funcionalidade básica
2. ✅ **Assinatura Digital** (2-3 sem) - Validade legal

### Sprint 2 (Próximos 1-2 semanas) - IMPORTANTE
3. ✅ **Backup Automático** (1-2 sem) - Segurança de dados
4. ✅ **Receituário Controlado** (2 sem) - Compliance legal

### Sprint 3 (Próximas 1-2 semanas) - COMPETITIVIDADE
5. ✅ **BI Dashboard UI** (5-7h) - Visibilidade gerencial
6. ✅ **NPS Survey UI** (1 sem) - Retenção de pacientes

### Sprint 4+ (Futuro) - NICE-TO-HAVE
7. ✅ **Rastreamento de Medicação** (3-5h)
8. ✅ **HL7/FHIR** (3 sem)
9. ✅ **Multi-Tenancy** (4 sem)

---

## 🔧 Adapters de Classificação (CONFIGURAÇÃO)

### Status Atual
```
❌ ICD10-WHO → Requer CIAP2_CSV_URL
❌ CIAP2 → Requer CIAP2_CSV_URL
❌ Nursing → Não configurado
✅ ICD11 → Retorna 2 exemplos fake (Cholera)
```

### Como Configurar (Option A: CSV Local)

```bash
# Baixar CSVs
curl -o /tmp/icd10.csv https://data.imr.org.br/icd10-2024.csv
curl -o /tmp/ciap2.csv https://www.sbmfc.org.br/ciap2-export.csv

# Setar env vars
export ICD10_CSV_URL=file:///tmp/icd10.csv
export CIAP2_CSV_URL=file:///tmp/ciap2.csv

# Restart app
docker-compose restart healthcare-app
```

### Como Configurar (Option B: Usar API de Terceiros)
```bash
# Para ICD10: WHO API
export ICD10_CSV_URL=https://www.who.int/icd10/export.csv

# Para CIAP2: SBMFC
export CIAP2_CSV_URL=https://www.sbmfc.org.br/api/ciap2/export
```

---

## 📊 Métricas de Progresso

| Feature | Esforço | Início | Fim | Status |
|---------|---------|--------|-----|--------|
| Atestados | 1-2w | - | - | ❌ |
| Assinatura Digital | 2-3w | - | - | ❌ |
| Backup | 1-2w | - | - | ❌ |
| Receituário Controlado | 2w | - | - | ❌ |
| BI Dashboard UI | 5-7h | - | - | ❌ |
| NPS UI | 1w | - | - | ❌ |

**Total:** ~8-10 semanas para tudo

---

## ✅ Checklist Pré-Produção

- [ ] Atestados funcionando
- [ ] Assinatura digital funcionando
- [ ] Backup automático rodando (1x testado)
- [ ] Receituário controlado validando
- [ ] Database com >0 dados reais de teste
- [ ] SSL/TLS configurado
- [ ] Firewall configurado
- [ ] Logs centralizados
- [ ] Monitoramento de CPU/RAM/Disco ativo
- [ ] Documentação de suporte em pt-BR


# Auditoria: Gambiarras, Promessas Falsas e Código Incompleto

**Objetivo:** Tornar o sistema robusto, consistente e coerente com a realidade. Eliminar mocks, placeholders e dados que não refletem a verdade.

---

## 🔴 CRÍTICO – Dados falsos que afetam integridade

### 1. `lib/public-booking-service.ts` ✅ CORRIGIDO
~~birthDate: new Date('1990-01-01')~~ – Paciente recebia data falsa.
**Solução aplicada:** Campo `patientBirthDate` obrigatório no widget e API; novo paciente exige data válida.

### 2. `app/api/minha-saude/route.ts:74`
```ts
taken: [] // TODO: Implementar tracking de tomada de medicamentos
```
**Problema:** API retorna array vazio sempre – paciente/UI acredita que não há histórico.
**Solução:** Implementar modelo `MedicationTaken` ou retornar `null`/omitir o campo até existir implementação real.

### 3. `lib/nps-service.ts:230-231`
```ts
score: -1, // Placeholder até responder
category: 'DETRACTOR', // Placeholder
```
**Problema:** Placeholder armazenado como dado real; consultas precisam `{ gte: 0 }` para ignorar.
**Solução (futuro):** Adicionar enum PENDING em NpsScore ou tabela NpsSurveySent separada; não persistir categoria falsa.

---

## 🟠 ALTO – Módulos que prometem e não entregam

### 4. `app/api/financial/route.ts` ✅ CORRIGIDO
- **GET/POST:** Passam a retornar 501 com `{ implemented: false, message }`
- **UI:** FinancialDashboard exibe card "Módulo não implementado" em vez de zeros falsos

### 5. `lib/integration-services.ts`
- **Cartório:** Payload preparado, API nunca chamada – retorna `success: false` com mensagem
- **SUS:** Mesmo padrão
- **Government protocol:** Mesmo padrão
**Solução:** Manter retorno explícito "não implementado", mas evitar logar como `ERROR` em `IntegrationLog` – usar status `PENDING` ou `NOT_IMPLEMENTED`.

### 6. `lib/signature-service.ts`
- `signWithICPBrasil` / `verifyWithICPBrasil` – lançam erro / retornam `valid: false`
**Solução:** Já é honesto (throw/valid:false). Garantir que UI não ofereça "Assinar com ICP-Brasil" como funcional se não estiver integrado.

### 7. `app/admin/esus/page.tsx` ✅ CORRIGIDO
- Badge alterado de "Em breve" para "Planejado (roadmap)" na Ficha de Visita Domiciliar

---

## 🟡 MÉDIO – TODOs e integrações pendentes

| Arquivo | Linha | Descrição |
|---------|-------|-----------|
| `lib/medical-record-pdf-export.ts` | 124 | MedicalRecordSignature model |
| `app/api/medical-records/bulk/route.ts` | 329, 362 | Tags, MedicalRecordShare |
| `lib/adapters/icd11-who.ts` | 13 | API ICD-11 oficial |
| `lib/storage-service.ts` | 283, 296 | Limpeza automática, cálculo de uso |
| ~~`app/api/appointments/pending/route.ts`~~ | ✅ | Email de confirmação/rejeição implementado |
| `lib/backup-service.ts` | 196, 342 | archiver package, email |
| `lib/lab-integration-service.ts` | 426, 600 | MLLP real |
| ~~`app/api/auth/register-patient/route.ts`~~ | ✅ | Email de boas-vindas implementado |
| `public/minha-saude-sw.js` | 243, 282, 299 | Reagendamento, sync IndexedDB |
| `app/api/prescriptions/controlled/route.ts` | 197 | CRM state hardcoded 'SP' |
| `lib/ai-client.ts` | 294 | Implementar quando necessário |
| `lib/integration-services.ts` | 575 | Campo 'cnes' na Clinic |

---

## 🟢 BAIXO – Placeholders de UI e testes

- **placeholder** em inputs: OK quando é dica de formato (ex: "XXX.XXX.XXX-XX" para CPF)
- **mock** em testes: OK – necessário para unit tests
- **stub** em `lib/stt-service.ts`: provider padrão quando não há URL – documentar que é fallback

---

## Bypass e flags de desenvolvimento

### `lib/auth-middleware.ts:30`
```ts
if (!isProduction && process.env.ALLOW_TEST_BYPASS === 'true')
```
**Status:** Correto – só em dev e com flag explícita. Manter e documentar.

---

## Plano de ação sugerido

### Fase 1 – Verdade dos dados (1–2 dias)
1. Corrigir `public-booking-service.ts` – birthDate real ou explícita "não informada"
2. Ajustar `minha-saude/route.ts` – `taken` omitido ou null até implementar
3. Corrigir `nps-service.ts` – não persistir placeholders

### Fase 2 – Honestidade nas APIs (1 dia)
4. `app/api/financial/route.ts` – retornar 501 ou remover da UI
5. Revisar logs de `integration-services.ts` – não usar status ERROR para "não implementado"

### Fase 3 – Documentação (contínuo)
6. Criar `docs/INTEGRATIONS_STATUS.md` – Cartório, SUS, Governo, ICP-Brasil, etc.
7. Marcar features "Em breve" como roadmap público

### Fase 4 – Implementações prioritárias
8. Emails: confirmação de cadastro, notificações de agendamento
9. Tracking de medicamentos (taken) – se for requisito do produto
10. Módulo financeiro – se for requisito; caso contrário, remover da UI

---

## Princípios para o código

1. **Nunca persistir dados falsos** – placeholder em memória OK, no banco não.
2. **APIs não implementadas** – retornar 501 ou erro explícito, nunca sucesso falso.
3. **UI** – não mostrar como funcional o que não está implementado.
4. **Logs** – não usar `ERROR` para "não implementado"; usar `INFO` ou status dedicado.
5. **TODOs** – acompanhar em issues/roadmap, não deixar esquecidos.

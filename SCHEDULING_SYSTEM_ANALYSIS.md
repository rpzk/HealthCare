# Análise do Sistema de Agendamento - Healthcare

## 📊 Estado Atual do Sistema

### ✅ O que JÁ existe

#### 1. **Múltiplos Profissionais com Agendas**
**Status**: ✅ IMPLEMENTADO

O sistema já suporta diversos tipos de profissionais:
```typescript
enum Role {
  DOCTOR           // ✅ Médico
  NURSE            // ✅ Enfermeiro
  PHYSIOTHERAPIST  // ✅ Fisioterapeuta
  PSYCHOLOGIST     // ✅ Psicólogo
  NUTRITIONIST     // ✅ Nutricionista
  DENTIST          // ✅ Dentista
  PHARMACIST       // ✅ Farmacêutico
  SOCIAL_WORKER    // ✅ Assistente Social
  HEALTH_AGENT     // ✅ Agente de Saúde
  TECHNICIAN       // ✅ Técnico
}
```

**Todos podem ter agendas configuradas via `DoctorSchedule`**

#### 2. **Configuração de Auto-Agendamento**
**Status**: ✅ IMPLEMENTADO

Já existe controle por profissional:
```typescript
model DoctorSchedule {
  allowPatientBooking   Boolean  @default(false)  // ✅ Permite auto-agendamento?
  autoConfirmBooking    Boolean  @default(false)  // ✅ Confirma ou precisa aprovar?
  maxBookingDaysAhead   Int      @default(30)     // ✅ Quanto tempo antes
  minBookingHoursAhead  Int      @default(24)     // ✅ Antecedência mínima
}
```

**Comportamento atual:**
- Se `allowPatientBooking = false` → Paciente **NÃO pode agendar** (erro 403)
- Se `allowPatientBooking = true` + `autoConfirmBooking = false` → Cria com status `PENDING` (precisa aprovação)
- Se `allowPatientBooking = true` + `autoConfirmBooking = true` → Cria como `SCHEDULED` (confirmado)

#### 3. **Fluxos de Agendamento**

##### A. Agendamento pelo Profissional/Admin
- ✅ `/appointments/schedule` - Interface completa
- ✅ `/appointments/dashboard` - Dashboard com calendário
- ✅ Seleciona paciente, data, hora
- ✅ Cria consulta diretamente como `SCHEDULED`

##### B. Auto-Agendamento pelo Paciente
- ✅ `/minha-saude/agendar` - Tela de agendamento
- ✅ API `/api/appointments/patient-book`
- ✅ Valida disponibilidade
- ✅ Respeita configurações do profissional
- ✅ Pode criar como `PENDING` ou `SCHEDULED`

#### 4. **Perfil do Paciente**
**Status**: ⚠️ PARCIAL

- ✅ Tela de visualização: `/minha-saude/perfil`
- ✅ API GET: `/api/patient/profile`
- ❌ **NÃO HÁ** edição/update pelo próprio paciente
- ❌ Paciente não consegue completar dados pessoais

---

## 🎯 Problemas Identificados

### 1. **Nomenclatura Confusa**
**Problema**: O modelo se chama `DoctorSchedule` mas serve para TODOS os profissionais
**Impacto**: Confusão no código e dificuldade de compreensão

**Sugestão**: Renomear para `ProfessionalSchedule`

### 2. **Falta de Edição de Perfil pelo Paciente**
**Problema**: Paciente só pode VER seus dados, não editar
**Impacto**: 
- Admin/Recepcionista precisam fazer tudo
- Dados desatualizados
- Sobrecarga administrativa

**Necessário**:
- Endpoint PUT/PATCH `/api/patient/profile`
- Tela de edição em `/minha-saude/perfil`
- Permitir editar:
  - ✏️ Telefone
  - ✏️ Endereço
  - ✏️ Contato de emergência
  - ✏️ Alergias
  - ✏️ Tipo sanguíneo
  - ❌ **NÃO** CPF (documento)
  - ❌ **NÃO** Nome completo (precisa validação admin)
  - ❌ **NÃO** Data de nascimento (documento)

### 3. **Auto-Cadastro de Paciente Limitado**
**Problema**: Não há fluxo completo de auto-cadastro
**Impacto**: Pacientes novos dependem do admin para criar conta

**Necessário**:
- Fluxo de auto-registro em `/auth/registro-paciente`
- Criar User + Patient vinculado
- Pedir informações completas:
  - Nome completo
  - CPF
  - Data de nascimento
  - Email
  - Telefone
  - Endereço (opcional)
  - Contato de emergência (opcional)

### 4. **Visualização de Solicitações Pendentes**
**Problema**: Se paciente agenda com `autoConfirmBooking=false`, cria como `PENDING`, mas:
- ❓ Admin/Recepcionista vê essas solicitações?
- ❓ Há notificação de novas solicitações?
- ❓ Interface para aprovar/rejeitar?

**Necessário verificar**:
- Dashboard admin mostra consultas `PENDING`?
- Há botão de aprovar/rejeitar?
- Paciente recebe notificação de aprovação/rejeição?

---

## 💡 Recomendações de Melhoria

### **Prioridade ALTA** 🔴

#### 1. Permitir Edição de Perfil pelo Paciente
**Arquivos a criar/modificar:**
- `app/api/patient/profile/route.ts` - Adicionar PUT/PATCH
- `app/minha-saude/perfil/page.tsx` - Adicionar formulário de edição
- `app/minha-saude/perfil/editar/page.tsx` - Página dedicada (opcional)

**Campos editáveis:**
```typescript
interface PatientEditableFields {
  phone: string              // ✅ Telefone
  address: {                 // ✅ Endereço
    street: string
    number: string
    complement?: string
    neighborhood?: string
    city: string
    state: string
    zipCode: string
  }
  emergencyContact: {        // ✅ Contato de emergência
    name: string
    phone: string
    relation: string
  }
  allergies: string[]        // ✅ Alergias
  bloodType?: string         // ✅ Tipo sanguíneo
}
```

**Campos NÃO editáveis (somente admin):**
- CPF (documento)
- Nome completo (requer validação)
- Data de nascimento (documento)
- Email principal (vinculado à conta)

#### 2. Dashboard de Solicitações Pendentes
**Para**: Admin + Recepcionista

**Arquivos:**
- `app/admin/solicitacoes/page.tsx` (novo)
- `app/api/admin/appointment-requests/route.ts` (novo)

**Funcionalidades:**
- Listar consultas com `status = PENDING`
- Botões: ✅ Aprovar / ❌ Rejeitar
- Filtros: Data, Profissional, Paciente
- Notificações em tempo real (opcional)

#### 3. Notificações de Agendamento
**Para**: Paciente

**Quando:**
- Solicitação criada (PENDING)
- Solicitação aprovada (PENDING → SCHEDULED)
- Solicitação rejeitada (PENDING → CANCELLED)
- Consulta marcada pelo admin
- Lembrete X horas antes

**Meios:**
- Email (já existe EmailService)
- Notificação in-app (badge na navbar)
- SMS (opcional, futuramente)

---

### **Prioridade MÉDIA** 🟡

#### 4. Auto-Cadastro de Pacientes
**Fluxo:**
1. Paciente acessa `/auth/registro-paciente`
2. Preenche formulário completo
3. Sistema cria:
   - `User` com role `PATIENT`
   - `Patient` vinculado
4. Envia email de confirmação
5. Paciente pode fazer login e agendar

**Validações:**
- CPF único
- Email único
- Senha forte
- Termos de uso aceitos

#### 5. Renomear `DoctorSchedule` → `ProfessionalSchedule`
**Migração Prisma:**
```prisma
model ProfessionalSchedule {
  id                    String   @id @default(cuid())
  professionalId        String   // Renomeado de doctorId
  // ... resto igual
  
  professional          User     @relation(fields: [professionalId], references: [id])
  
  @@unique([professionalId, dayOfWeek])
  @@map("professional_schedules") // Renomear tabela
}
```

**Impacto**: Quebraria compatibilidade, precisa migração de dados

---

### **Prioridade BAIXA** 🟢

#### 6. Tipos de Consulta por Profissional
**Exemplo:**
- Nutricionista: Consulta nutricional, Avaliação física
- Psicólogo: Terapia individual, Terapia de casal
- Fisioterapeuta: Sessão de fisioterapia, Avaliação postural

**Schema:**
```prisma
model ConsultationType {
  id              String  @id @default(cuid())
  professionalId  String
  name            String  // "Consulta nutricional"
  duration        Int     // Minutos (60, 30, 90...)
  active          Boolean @default(true)
  
  professional    User    @relation(...)
}
```

#### 7. Fila de Espera
**Quando**: Horários lotados
- Paciente entra em fila de espera
- Se houver cancelamento, próximo da fila é notificado
- Prazo de 24h para confirmar

---

## 📋 Checklist de Implementação Sugerida

### Fase 1: Dados do Paciente (1-2 dias)
- [ ] Criar endpoint PUT `/api/patient/profile`
- [ ] Validação de campos editáveis
- [ ] Tela de edição de perfil
- [ ] Testes de update

### Fase 2: Solicitações Pendentes (2-3 dias)
- [ ] Endpoint GET `/api/admin/appointment-requests`
- [ ] Endpoint PUT `/api/admin/appointment-requests/:id/approve`
- [ ] Endpoint PUT `/api/admin/appointment-requests/:id/reject`
- [ ] Dashboard admin de solicitações
- [ ] Filtros e busca

### Fase 3: Notificações (3-4 dias)
- [ ] Sistema de notificações in-app
- [ ] Badge de contagem na navbar
- [ ] Emails de status de agendamento
- [ ] Página `/notificacoes` para histórico

### Fase 4: Auto-Cadastro (2-3 dias)
- [ ] Página `/auth/registro-paciente`
- [ ] Endpoint POST `/api/auth/register-patient`
- [ ] Validação CPF/Email únicos
- [ ] Email de confirmação
- [ ] Termos de uso

### Fase 5: Melhorias (opcional)
- [ ] Renomear DoctorSchedule
- [ ] Tipos de consulta
- [ ] Fila de espera
- [ ] Lembretes automáticos

---

## 🔍 Conclusão

**Concordo plenamente com suas observações:**

✅ **Outros profissionais além de médico/enfermeiro** → Sistema JÁ SUPORTA, mas nome do modelo confunde (`DoctorSchedule`)

✅ **Solicitação vs Agendamento Direto** → Sistema JÁ TEM a lógica via `allowPatientBooking` + `autoConfirmBooking`, **MAS falta interface admin para gerenciar solicitações pendentes**

✅ **Paciente cadastrar/editar próprios dados** → **CRÍTICO e FALTANDO**. Precisa urgentemente de:
- Edição de perfil
- Auto-cadastro inicial
- Delegar responsabilidade de dados ao paciente

**Prioridade de implementação:**
1. 🔴 Edição de perfil pelo paciente
2. 🔴 Dashboard de solicitações pendentes (admin)
3. 🟡 Notificações de agendamento
4. 🟡 Auto-cadastro

**Isso aliviará MUITO o trabalho administrativo e dará autonomia ao paciente!**

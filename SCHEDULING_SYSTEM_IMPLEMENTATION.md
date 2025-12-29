# Sistema de Agendamento Inteligente - Implementação Completa

## 🎯 Objetivo
Permitir que pacientes agendum suas próprias consultas, com cada profissional controlando se essa funcionalidade está disponível e qual é a política de agendamento.

## ✅ Implementação Completa

### 1. **API de Auto-Agendamento** (`/api/appointments/patient-book`)

#### GET - Buscar profissionais disponíveis
```
GET /api/appointments/patient-book
```
Retorna lista de profissionais que permitem auto-agendamento com suas configurações:
- `allowPatientBooking`: Se aceita agendamentos de pacientes
- `maxBookingDaysAhead`: Dias máximos no futuro para agendar
- `minBookingHoursAhead`: Horas mínimas de antecedência
- `autoConfirmBooking`: Se confirma automaticamente

#### POST - Agendar consulta
```
POST /api/appointments/patient-book
{
  "doctorId": "string",
  "date": "2024-01-15",
  "timeSlot": "14:30",
  "reason": "Consulta de rotina",
  "notes": "Tenho dores de cabeça"
}
```

Validações automáticas:
- ✓ Paciente autenticado
- ✓ Profissional existe e permite auto-agendamento
- ✓ Data dentro da janela permitida
- ✓ Horário respeita o mínimo de horas de antecedência
- ✓ Horário não conflita com outra consulta
- ✓ Sem exceções de agendamento (férias, plantão, etc)

### 2. **Interface do Paciente** (`/app/appointments/book`)

Página visual para pacientes agendarem consultas:

- **Seleção de Profissional**: Cards com foto, nome e especialidade
- **Calendário Interativo**: 
  - Mostra apenas datas permitidas pela política
  - Desabilita datas fora da janela de agendamento
  - Integrado com `react-day-picker` e `date-fns`
- **Slots de Horário**: 
  - Gerados dinamicamente baseado na duração do slot do profissional
  - Horários desabilitados se < minBookingHoursAhead
  - Horários com conflito marcados como indisponíveis
- **Formulário de Detalhes**:
  - Campo obrigatório: Motivo da consulta
  - Campo opcional: Notas adicionais
  - Indicador de status (confirmado automaticamente vs aguardando aprovação)
- **Tela de Sucesso**: 
  - Exibe ID da consulta
  - Data/hora agendada
  - Status da consulta
  - Próximos passos

### 3. **Configuração por Profissional** (`/app/settings`)

Nova aba "Agendamento" nas Configurações para cada profissional:

```
Configurações > Agendamento

┌─────────────────────────────────────────────────────┐
│ SEGUNDA-FEIRA (09:00 - 17:00)                       │
├─────────────────────────────────────────────────────┤
│ ☑ Permitir auto-agendamento de pacientes          │
│                                                     │
│ Máximo de dias antecipados: [30] dias            │
│ Mínimo de horas de antecedência: [24] horas      │
│ ☑ Confirmar automaticamente                        │
│                                                     │
└─────────────────────────────────────────────────────┘
```

Campos configuráveis por dia da semana:
- **allowPatientBooking**: Ativa/desativa auto-agendamento
- **maxBookingDaysAhead**: Até quantos dias no futuro (padrão: 30)
- **minBookingHoursAhead**: Antecedência mínima (padrão: 24)
- **autoConfirmBooking**: Auto-confirma ou requer aprovação

### 4. **Esquema de Banco de Dados**

#### DoctorSchedule (Horário do Profissional)
```prisma
model DoctorSchedule {
  id                    String   @id @default(cuid())
  doctorId              String
  dayOfWeek             Int      // 0-6 (domingo-sábado)
  startTime             String   // "09:00"
  endTime               String   // "17:00"
  slotDuration          Int      @default(30) // minutos
  
  // Nova configuração de agendamento
  allowPatientBooking   Boolean  @default(false)
  maxBookingDaysAhead   Int      @default(30)
  minBookingHoursAhead  Int      @default(24)
  autoConfirmBooking    Boolean  @default(false)
  
  @@unique([doctorId, dayOfWeek])
}
```

#### ScheduleException (Bloqueios de Data)
```prisma
model ScheduleException {
  id          String    @id @default(cuid())
  doctorId    String
  date        DateTime
  blockType   BlockType @default(UNAVAILABLE)  // Tipo específico
  reason      String?
  
  @@index([doctorId, date])
}

enum BlockType {
  UNAVAILABLE     // Indisponível genérico
  ON_CALL         // Plantão em outro local
  VACATION        // Férias
  SICK_LEAVE      // Licença médica
  MAINTENANCE     // Manutenção/reunião
  TRAINING        // Treinamento/capacitação
  MEETING         // Reunião profissional
}
```

## 🔄 Fluxo Completo

```
PACIENTE
   │
   ├─→ /appointments/book
   │     ├─ GET /api/appointments/patient-book (carrega profissionais)
   │     ├─ Seleciona profissional
   │     ├─ Escolhe data no calendário (respeita maxBookingDaysAhead)
   │     ├─ Seleciona horário (respeita minBookingHoursAhead)
   │     ├─ Preenche motivo e notas
   │     └─ POST /api/appointments/patient-book (cria agendamento)
   │         ├─ Valida papel (PATIENT)
   │         ├─ Valida paciente existe
   │         ├─ Valida profissional permite auto-agendamento
   │         ├─ Valida constraints de data/hora
   │         ├─ Valida sem conflitos
   │         ├─ Valida sem exceções (bloqueios)
   │         └─ Cria Consultation com status:
   │             • SCHEDULED (se autoConfirmBooking=false)
   │             • IN_PROGRESS (se autoConfirmBooking=true)
   │
   └─→ Tela de sucesso
        └─ Exibe confirmação com ID e próximos passos

PROFISSIONAL
   │
   └─→ /settings > aba "Agendamento"
        ├─ GET /api/schedules/my-schedules (carrega seus horários)
        ├─ Configura por dia:
        │  ├─ Habilita/desabilita auto-agendamento
        │  ├─ Define janela de antecedência
        │  └─ Define auto-confirmação
        └─ PUT /api/schedules/my-schedules (salva configurações)
```

## 🛠️ Componentes Criados

### 1. `PatientBookingConfig` Component
- Localização: `/components/patient-booking-config.tsx`
- Uso: Integrada na aba "Agendamento" do Settings
- Funcionalidade:
  - Carrega horários do profissional
  - Interface para configurar constraints
  - Validação de formulário
  - Toast feedback

### 2. Patient Booking Page
- Localização: `/app/appointments/book/page.tsx`
- Funcionalidade:
  - 3-coluna layout (Profissional | Calendário | Slots)
  - Seleção interativa
  - Validação em tempo real
  - Tela de sucesso

### 3. APIs
- `GET /api/appointments/patient-book`: Lista profissionais
- `POST /api/appointments/patient-book`: Cria agendamento
- `GET /api/schedules/my-schedules`: Carrega configs do profissional
- `PUT /api/schedules/my-schedules`: Salva configs

## 📊 Estados da Consulta

```
AUTO-AGENDAMENTO DE PACIENTE
    │
    ├─ autoConfirmBooking = false
    │  └─ Cria como SCHEDULED
    │     └─ Profissional aprova manualmente
    │        └─ Muda para IN_PROGRESS/COMPLETED
    │
    └─ autoConfirmBooking = true
       └─ Cria como IN_PROGRESS
          └─ Automático, sem necessidade de aprovação
```

## 🔒 Segurança

- ✓ Validação de autenticação (somente PATIENT)
- ✓ Validação de profissional válido
- ✓ Validação de constraints (data, hora)
- ✓ Validação de conflitos
- ✓ Validação de exceções
- ✓ Rate limiting (removido para MVP, pode ser adicionado)

## 🚀 Como Usar

### Para Pacientes:
1. Fazer login como PATIENT
2. Ir para `Meus Agendamentos > Nova Consulta` ou `/appointments/book`
3. Selecionar profissional desejado
4. Escolher data no calendário
5. Escolher horário disponível
6. Preencher motivo e notas
7. Clicar "Agendar"

### Para Profissionais:
1. Fazer login como médico/profissional
2. Ir para `Configurações > Agendamento`
3. Por cada dia da semana:
   - Habilitar "Permitir auto-agendamento"
   - Configurar dias máximos (ex: 30 dias)
   - Configurar horas mínimas (ex: 24 horas)
   - Decidir se auto-confirma ou não
4. Salvar configurações

## 📝 Notas de Implementação

- ✅ TypeScript compilando sem erros
- ✅ Banco de dados migrado com `prisma db push`
- ✅ API endpoints com validação completa
- ✅ UI responsiva com componentes shadcn/ui
- ✅ Integração com NextAuth para autenticação
- ✅ Toast notifications com Sonner
- ✅ Formatação de datas com date-fns (ptBR)
- ✅ Código commitado: `feat: Add patient self-booking system with per-professional configuration`

## 🔮 Futuras Melhorias

- [ ] Integração com React Big Calendar para visualização semanal/mensal
- [ ] Interface de bloqueio de dias (férias, plantão, etc) 
- [ ] Notificações por email quando paciente agenda
- [ ] SMS de confirmação de agendamento
- [ ] Cancelamento/remarcação de consulta por paciente
- [ ] Dashboard de agendamentos para profissional
- [ ] Relatórios de taxa de utilização
- [ ] Integração com calendário externo (Google Calendar, Outlook)
- [ ] Pagamentos online para consultas

## 📞 Suporte

Para questões sobre a implementação, consulte:
- Arquitetura: `/lib/schedule-service.ts`
- Banco de dados: `/prisma/schema.prisma`
- API docs: Headers dos arquivos de rota

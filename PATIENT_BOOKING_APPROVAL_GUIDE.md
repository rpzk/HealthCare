# 🔔 Sistema de Aprovação de Agendamentos - Guia Completo

## 📋 Visão Geral

Sistema robusto de aprovação de agendamentos solicitados por pacientes, com notificações claras e controle total da recepção/admin.

---

## 🎯 Fluxo Completo do Agendamento

### 1️⃣ **Paciente Solicita Agendamento**

```
TELA DO PACIENTE
┌────────────────────────────────────────┐
│  Agendar Consulta                      │
│  ─────────────────────────────────     │
│                                        │
│  Profissional: [Dr. João ▼]           │
│  Data: [15/01/2026]                    │
│  Horário: [14:00]                      │
│  Motivo: [Consulta de rotina]         │
│                                        │
│  [Solicitar Agendamento] ✓             │
└────────────────────────────────────────┘
```

**O que acontece:**
- ✅ Agendamento criado com status `SCHEDULED`
- ⚠️ Sistema marca como "Auto-agendamento" nas notas
- 📧 Sistema prepara notificação (email/WhatsApp futuro)
- ⏳ Paciente vê: **"Aguardando Confirmação"**

---

### 2️⃣ **Sistema Exibe Status Claro ao Paciente**

```
TELA DO PACIENTE - Status em Tempo Real
┌─────────────────────────────────────────────────┐
│  📅 Meus Agendamentos                           │
├─────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │ Dr. João Silva - Cardiologia          ⏳ │  │
│  │ 15/01/2026 às 14:00                      │  │
│  │                                          │  │
│  │ ⚠️ AGUARDANDO CONFIRMAÇÃO                │  │
│  │ Seu agendamento está sendo analisado     │  │
│  │ pela equipe médica. Você receberá uma    │  │
│  │ notificação em breve.                    │  │
│  │                                          │  │
│  │ Solicitado em 03/01/2026 às 10:30        │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

**Cores e Ícones:**
- 🟡 **Amarelo** - Aguardando confirmação (Clock ⏳)
- 🟢 **Verde** - Confirmado (CheckCircle ✅)
- 🔴 **Vermelho** - Rejeitado (XCircle ❌)

**Auto-atualização:** A cada 30 segundos para verificar mudanças

---

### 3️⃣ **Recepção/Admin Recebe Notificação**

```
DASHBOARD DA RECEPÇÃO
┌─────────────────────────────────────────┐
│  Recepção                               │
│  ─────────────────                      │
│                                         │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐      │
│  │  12 │ │  3  │ │  8  │ │  1  │      │
│  │Hoje │ │Pend.│ │Esper│ │Final│      │
│  └─────┘ └─────┘ └─────┘ └─────┘      │
│           ⚠️ AMARELO                    │
│                                         │
│  [Agenda] [Aprovações 🔔3] [Check-in]  │
│                    └─ BADGE VERMELHO   │
└─────────────────────────────────────────┘
```

**Alertas Visuais:**
- 🔴 **Badge vermelho** no menu "Aprovações" com contador
- 🟡 **Card amarelo** nos stats com total de pendentes
- 🔔 **Notificação** (futuro: email/WhatsApp ao admin)

---

### 4️⃣ **Admin/Secretária Analisa e Decide**

```
ABA: APROVAÇÕES
┌──────────────────────────────────────────────────┐
│  ⚠️ 3 agendamentos aguardando aprovação!         │
├──────────────────────────────────────────────────┤
│                                                  │
│  [Pendentes (3)] [Confirmados (8)] [Rejeitados]│
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │ 👤 Maria Santos                            │ │
│  │ Dr. João Silva - Cardiologia               │ │
│  │                                            │ │
│  │ 📅 15/01/2026 às 14:00                     │ │
│  │ ✉️  maria@email.com                         │ │
│  │ 📱 (11) 98765-4321                         │ │
│  │                                            │ │
│  │ Motivo: Consulta de rotina                 │ │
│  │ Solicitado em 03/01/2026 10:30             │ │
│  │                                            │ │
│  │ [✅ Aprovar] [❌ Rejeitar]                  │ │
│  └────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────┘
```

**Informações Exibidas:**
- Nome completo do paciente
- Contato (email e telefone)
- Profissional solicitado
- Data e horário
- Motivo do agendamento
- Data/hora da solicitação

---

### 5️⃣ **Aprovação ou Rejeição**

#### Opção A: APROVAR

```
┌─────────────────────────────────────────┐
│  Aprovar Agendamento                    │
├─────────────────────────────────────────┤
│  Paciente: Maria Santos                 │
│  Profissional: Dr. João Silva           │
│  Data: 15/01/2026                       │
│  Horário: 14:00                         │
│  Motivo: Consulta de rotina             │
│                                         │
│  Observações (opcional):                │
│  ┌────────────────────────────────────┐│
│  │ Confirmado. Chegar 15min antes     ││
│  └────────────────────────────────────┘│
│                                         │
│  ✅ O paciente será notificado sobre   │
│     a confirmação do agendamento.      │
│                                         │
│  [Cancelar] [Aprovar]                  │
└─────────────────────────────────────────┘
```

**O que acontece:**
1. Status muda para `IN_PROGRESS`
2. Nota adicionada: `[03/01/2026 11:00] APROVADO por Ana Costa: Confirmado. Chegar 15min antes`
3. Paciente notificado (email/WhatsApp futuro)
4. Paciente vê status **"Confirmado" 🟢**

---

#### Opção B: REJEITAR

```
┌─────────────────────────────────────────┐
│  Rejeitar Agendamento                   │
├─────────────────────────────────────────┤
│  Paciente: Maria Santos                 │
│  Profissional: Dr. João Silva           │
│  Data: 15/01/2026                       │
│  Horário: 14:00                         │
│                                         │
│  Motivo da rejeição:                    │
│  ┌────────────────────────────────────┐│
│  │ Profissional em plantão externo    ││
│  │ neste horário. Por favor, entre em ││
│  │ contato para reagendar.            ││
│  └────────────────────────────────────┘│
│                                         │
│  ❌ O paciente será notificado sobre   │
│     a rejeição. Recomenda-se explicar  │
│     o motivo.                          │
│                                         │
│  [Cancelar] [Rejeitar]                 │
└─────────────────────────────────────────┘
```

**O que acontece:**
1. Status muda para `CANCELLED`
2. Nota adicionada: `[03/01/2026 11:00] REJEITADO por Ana Costa: Profissional em plantão...`
3. Paciente notificado (email/WhatsApp futuro)
4. Paciente vê status **"Não Aprovado" 🔴** com motivo

---

### 6️⃣ **Paciente Recebe Notificação Final**

#### Se APROVADO:

```
TELA DO PACIENTE - Atualização em Tempo Real
┌─────────────────────────────────────────────────┐
│  📅 Meus Agendamentos                           │
├─────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │ Dr. João Silva - Cardiologia          ✅ │  │
│  │ 15/01/2026 às 14:00                      │  │
│  │                                          │  │
│  │ ✅ AGENDAMENTO CONFIRMADO!               │  │
│  │ Seu agendamento foi aprovado!            │  │
│  │ Compareça no horário marcado.            │  │
│  │                                          │  │
│  │ 💬 Confirmado. Chegar 15min antes        │  │
│  │                                          │  │
│  │ Solicitado em 03/01/2026 às 10:30        │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  📧 EMAIL ENVIADO:                              │
│  "Olá Maria, seu agendamento com Dr. João      │
│   para 15/01 às 14h foi CONFIRMADO!"           │
│                                                 │
│  📱 WHATSAPP ENVIADO:                           │
│  "✅ Agendamento confirmado! Dr. João Silva    │
│   - 15/01/2026 14:00. Chegue 15min antes."     │
└─────────────────────────────────────────────────┘
```

---

#### Se REJEITADO:

```
TELA DO PACIENTE - Atualização em Tempo Real
┌─────────────────────────────────────────────────┐
│  📅 Meus Agendamentos                           │
├─────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────┐  │
│  │ Dr. João Silva - Cardiologia          ❌ │  │
│  │ 15/01/2026 às 14:00                      │  │
│  │                                          │  │
│  │ ❌ AGENDAMENTO NÃO APROVADO              │  │
│  │ Infelizmente seu agendamento não pôde    │  │
│  │ ser aprovado. Entre em contato com a     │  │
│  │ clínica para reagendar.                  │  │
│  │                                          │  │
│  │ 💬 Profissional em plantão externo       │  │
│  │    neste horário. Por favor, entre em    │  │
│  │    contato para reagendar.               │  │
│  │                                          │  │
│  │ Solicitado em 03/01/2026 às 10:30        │  │
│  └──────────────────────────────────────────┘  │
│                                                 │
│  📧 EMAIL ENVIADO:                              │
│  "Olá Maria, infelizmente seu agendamento      │
│   não pôde ser aprovado. Motivo: [...]         │
│   Ligue (11) 3456-7890 para reagendar."        │
│                                                 │
│  📱 WHATSAPP ENVIADO:                           │
│  "❌ Agendamento não aprovado. Motivo: [...]   │
│   Entre em contato: (11) 3456-7890"            │
└─────────────────────────────────────────────────┘
```

---

## 🔧 Configuração do Sistema

### Para Profissionais

No menu **Configurações → Minha Agenda**, configure:

```
┌─────────────────────────────────────────┐
│  Configurações de Auto-Agendamento      │
├─────────────────────────────────────────┤
│                                         │
│  ☑️ Permitir que pacientes agendem      │
│     comigo diretamente                  │
│                                         │
│  Antecedência mínima: [24] horas       │
│  Antecedência máxima: [30] dias        │
│                                         │
│  ⚙️ Aprovação:                          │
│  ○ Aprovar automaticamente              │
│  ● Requerer aprovação manual ✓          │
│                                         │
│  [Salvar Configurações]                │
└─────────────────────────────────────────┘
```

**Opções:**
- **Aprovação automática**: Agendamento confirmado na hora (status `IN_PROGRESS`)
- **Aprovação manual**: Agendamento fica pendente (status `SCHEDULED`) até admin aprovar

**Recomendação:** Use **aprovação manual** para ter controle total

---

## 📊 Relatórios e Métricas

### Dashboard de Aprovações

```
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│  45  │ │  12  │ │  30  │ │  3   │
│Total │ │Pend. │ │Aprov.│ │Rejei.│
└──────┘ └──────┘ └──────┘ └──────┘
```

**Métricas Futuras:**
- Tempo médio de aprovação
- Taxa de aprovação/rejeição
- Profissionais mais solicitados
- Horários mais populares
- Motivos de rejeição mais comuns

---

## 🔔 Sistema de Notificações (Implementação Futura)

### Email

**Template de Aprovação:**
```
Assunto: ✅ Agendamento Confirmado - Dr. João Silva

Olá Maria Santos,

Seu agendamento foi CONFIRMADO!

📅 Data: 15/01/2026
⏰ Horário: 14:00
👨‍⚕️ Profissional: Dr. João Silva
📍 Local: Clínica HealthCare
💬 Observações: Chegar 15min antes

Entre em contato: (11) 3456-7890

Atenciosamente,
Equipe HealthCare
```

**Template de Rejeição:**
```
Assunto: ⚠️ Agendamento Não Aprovado - Dr. João Silva

Olá Maria Santos,

Infelizmente seu agendamento não pôde ser aprovado.

📅 Data solicitada: 15/01/2026 14:00
👨‍⚕️ Profissional: Dr. João Silva

❌ Motivo: Profissional em plantão externo neste horário.

Por favor, entre em contato conosco para reagendar:
📞 (11) 3456-7890
✉️ contato@clinica.com

Atenciosamente,
Equipe HealthCare
```

---

### WhatsApp

**Aprovação:**
```
✅ *Agendamento Confirmado!*

Dr. João Silva
📅 15/01/2026 às 14:00

💬 Chegar 15min antes

Dúvidas: (11) 3456-7890
```

**Rejeição:**
```
❌ *Agendamento Não Aprovado*

Motivo: Profissional em plantão externo

Para reagendar:
📞 (11) 3456-7890
```

---

## 🎨 Customização Visual

### Código de Cores

| Status | Cor | Uso |
|--------|-----|-----|
| Pendente | 🟡 Amarelo (#FEF3C7) | Aguardando análise |
| Aprovado | 🟢 Verde (#D1FAE5) | Confirmado |
| Rejeitado | 🔴 Vermelho (#FEE2E2) | Não aprovado |

### Ícones

| Status | Ícone | Biblioteca |
|--------|-------|------------|
| Pendente | Clock ⏳ | lucide-react |
| Aprovado | CheckCircle ✅ | lucide-react |
| Rejeitado | XCircle ❌ | lucide-react |
| Alerta | AlertCircle ⚠️ | lucide-react |

---

## 🔐 Segurança e Permissões

### Matriz de Permissões

| Ação | Paciente | Profissional | Recepção | Admin |
|------|----------|--------------|----------|-------|
| Solicitar agendamento | ✅ | ❌ | ✅ | ✅ |
| Ver próprios agendamentos | ✅ | ✅ | ❌ | ❌ |
| Ver agendamentos pendentes | ❌ | ❌ | ✅ | ✅ |
| Aprovar/Rejeitar | ❌ | ❌ | ✅ | ✅ |
| Ver histórico completo | ❌ | ❌ | ✅ | ✅ |

### Validações

✅ **Impedimentos Automáticos:**
- Horário fora do expediente do profissional
- Data/hora já ocupada
- Profissional bloqueado (plantão/férias)
- Antecedência mínima não respeitada
- Antecedência máxima excedida
- Profissional não permite auto-agendamento

---

## 📱 Integrações Futuras

### Whatsapp Business API
```javascript
// TODO: Implementar
async function sendWhatsAppNotification(phone, type, data) {
  // Enviar mensagem via API oficial
}
```

### Email Service
```javascript
// TODO: Implementar
async function sendAppointmentEmail(email, type, data) {
  // Enviar via SendGrid/AWS SES
}
```

### Push Notifications
```javascript
// TODO: Implementar
async function sendPushNotification(userId, message) {
  // Firebase Cloud Messaging
}
```

---

## 📝 Logs e Auditoria

Todas as ações são registradas:

```
[03/01/2026 10:30:45] CRIADO - Paciente Maria Santos (ID: abc123) solicitou agendamento com Dr. João (ID: def456) para 15/01/2026 14:00

[03/01/2026 11:00:12] APROVADO - Admin Ana Costa (ID: ghi789) aprovou agendamento abc123. Nota: "Confirmado. Chegar 15min antes"

[03/01/2026 11:00:15] NOTIFICAÇÃO - Email enviado para maria@email.com
[03/01/2026 11:00:16] NOTIFICAÇÃO - WhatsApp enviado para (11) 98765-4321
```

---

## ✅ Checklist de Implementação

### Backend
- [x] API `/api/appointments/pending` (GET/PATCH)
- [x] Lógica de aprovação/rejeição
- [x] Registro em notas com timestamp
- [ ] Sistema de notificações (email)
- [ ] Sistema de notificações (WhatsApp)
- [ ] Sistema de notificações (push)

### Frontend
- [x] Componente `PendingAppointmentsManager`
- [x] Componente `PatientAppointmentStatus`
- [x] Integração no dashboard da recepção
- [x] Badge de notificação com contador
- [x] Auto-atualização (30s)
- [ ] Som de notificação
- [ ] Desktop notifications

### UX/UI
- [x] Código de cores consistente
- [x] Ícones padronizados
- [x] Mensagens claras
- [x] Estados visuais distintos
- [x] Responsivo mobile
- [ ] Acessibilidade (ARIA)
- [ ] Testes de usabilidade

---

**Última atualização:** Janeiro 2026  
**Status:** ✅ Sistema funcional, aguardando notificações
**Próximo passo:** Implementar serviço de email/WhatsApp


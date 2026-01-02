# 📊 QUESTIONNAIRE ANALYTICS DASHBOARD - Sistema Completo

## 🎯 O Que É

Um **sistema intuitivo e centralizado** para **analisar, monitorar e receber notificações sobre questionários dos pacientes** com análise automática por IA.

## 🚀 Acesso Rápido

### 🌐 **Acessar o Dashboard**
- **URL:** `/admin/questionnaire-analytics`
- **Permissão:** DOCTOR, ADMIN, NURSE, THERAPIST
- **Funcionalidade:** 3 abas principais

### 📁 **Arquivos Principais**

#### **Componentes (UI/UX)**
- `components/questionnaires/questionnaire-analytics-dashboard.tsx` - Gráficos e métricas
- `components/questionnaires/questionnaire-notifications-panel.tsx` - Centro de notificações  
- `components/questionnaires/questionnaire-insights.tsx` - Painel de insights
- `components/questionnaires/questionnaire-alert-widget.tsx` - Widget rápido

#### **APIs (Backend)**
- `app/api/questionnaires/analytics/route.ts` - Dados de análise
- `app/api/questionnaires/notifications/route.ts` - Listar notificações
- `app/api/questionnaires/notifications/[id]/route.ts` - Ações em notificações
- `app/api/questionnaires/notifications/mark-all-read/route.ts` - Marcar todas lidas
- `app/api/questionnaires/insights/route.ts` - Listar insights IA
- `app/api/questionnaires/alerts/summary/route.ts` - Resumo de alertas

#### **Serviço (Lógica)**
- `lib/questionnaire-notification-service.ts` - Gerenciar notificações automáticas

#### **Página**
- `app/admin/questionnaire-analytics/page.tsx` - Página principal do dashboard

### 📚 **Documentação**

| Documento | Para Quem | O Que Contém |
|-----------|-----------|-----------|
| [**QUESTIONNAIRE_SOLUTION_SUMMARY.md**](./QUESTIONNAIRE_SOLUTION_SUMMARY.md) | **LEIA PRIMEIRO** | Resumo da solução e benefícios |
| [**QUESTIONNAIRE_ANALYTICS_GUIDE.md**](./QUESTIONNAIRE_ANALYTICS_GUIDE.md) | Usuários Finais | Como usar o dashboard |
| [**QUESTIONNAIRE_INTEGRATION_GUIDE.md**](./QUESTIONNAIRE_INTEGRATION_GUIDE.md) | Desenvolvedores | Exemplos de integração no código |
| [**QUESTIONNAIRE_ANALYTICS_IMPLEMENTATION.md**](./QUESTIONNAIRE_ANALYTICS_IMPLEMENTATION.md) | Desenvolvedores | Detalhes técnicos completos |
| [**prisma/QUESTIONNAIRE_ANALYTICS_SCHEMA.md**](./prisma/QUESTIONNAIRE_ANALYTICS_SCHEMA.md) | DBA | Schema e índices de BD |

---

## ✨ Funcionalidades

### 1️⃣ **Visão Geral Analítica** 📊
```
├── KPIs em Tempo Real
│   ├── Total Enviados
│   ├── Concluídos (com taxa %)
│   ├── Pendentes
│   └── Tempo Médio (minutos)
│
├── Gráficos
│   ├── Tendência (7d/30d/90d)
│   ├── Por Sistema Terapêutico (Pizza)
│   └── Distribuição por Status (Barras)
│
└── Filtros
    ├── Período (7D / 30D / 90D)
    └── Atualização automática
```

### 2️⃣ **Centro de Notificações** 🔔
```
├── 4 Tipos
│   ├── 📬 Questionário Enviado
│   ├── ✅ Questionário Respondido
│   ├── ⚠️ Questionário Expirado
│   └── 🧠 Análise IA Pronta
│
├── Filtros
│   ├── Não Lidas
│   ├── Lidas
│   └── Todas
│
├── Ações
│   ├── Marcar como lido
│   ├── Marcar todas lidas
│   ├── Deletar
│   └── Ver detalhes (link direto)
│
└── Atualização
    └── Tempo Real (a cada 30s)
```

### 3️⃣ **Painel de Insights IA** 🧠
```
├── 4 Tipos de Insight
│   ├── 🔴 Preocupações
│   ├── 🟢 Melhorias
│   ├── 🟣 Padrões
│   └── 🟡 Recomendações
│
├── 3 Níveis de Severidade
│   ├── 🔴 Alta (ação imediata)
│   ├── 🟡 Média (acompanhamento)
│   └── 🔵 Baixa (informativo)
│
├── Informações
│   ├── Paciente relacionado
│   ├── Questionário
│   ├── Data de detecção
│   ├── Métricas
│   ├── Ação sugerida
│   └── Link direto
│
└── Filtro por Prioridade
    ├── Todas
    ├── Alta
    ├── Média
    └── Baixa
```

### 4️⃣ **Widget Rápido** ⚡
```
Exibido no dashboard principal quando há:
├── Insights de alta prioridade
├── Questionários pendentes
└── Análises aguardando revisão

Com links diretos para ação imediata
```

---

## 🔧 Integração com Código Existente

### **Passo 1: Usar o Service de Notificações**

```typescript
import { QuestionnaireNotificationService } from '@/lib/questionnaire-notification-service'

// Ao enviar
await QuestionnaireNotificationService.notifyQuestionnaireSent(
  doctorId, patientName, questionnaireName, questionnaireId
)

// Ao responder
await QuestionnaireNotificationService.notifyQuestionnaireCompleted(
  doctorId, patientName, questionnaireName, questionnaireId, patientId
)

// Após análise IA
await QuestionnaireNotificationService.notifyAIAnalysisReady(
  doctorId, patientName, questionnaireName, questionnaireId, patientId, hasConcerns
)

// Quando expirar
await QuestionnaireNotificationService.notifyQuestionnaireExpired(
  doctorId, patientName, questionnaireName, questionnaireId, patientId
)
```

### **Passo 2: Adicionar Widget ao Dashboard**

```tsx
import { QuestionnaireAlertWidget } from '@/components/questionnaires/questionnaire-alert-widget'

// Na página do dashboard principal
<QuestionnaireAlertWidget />
```

### **Passo 3: Adicionar Menu**

```tsx
import { BarChart3 } from 'lucide-react'

<NavItem
  href="/admin/questionnaire-analytics"
  icon={BarChart3}
  label="Análise de Questionários"
/>
```

**👉 Veja `QUESTIONNAIRE_INTEGRATION_GUIDE.md` para exemplos completos**

---

## 📱 Características Técnicas

✅ **Frontend:**
- React Components com Hooks
- Recharts para visualizações
- Responsive Design (mobile-first)
- Lucide Icons
- TypeScript

✅ **Backend:**
- Next.js API Routes
- Prisma ORM
- NextAuth para autenticação
- Cálculos otimizados
- Índices de BD recomendados

✅ **Performance:**
- Paginação de dados
- Lazy loading com Suspense
- Polling inteligente
- Cache amigável

✅ **Segurança:**
- Autenticação obrigatória
- Validação de roles
- Dados filtrados por usuário
- LGPD compliant

---

## 🎯 Casos de Uso

### **Para Médicos/Terapeutas:**
1. ✅ Enviar questionários aos pacientes
2. ✅ Receber notificação quando respondido
3. ✅ Ver insights automáticos da IA
4. ✅ Tomar decisão baseada em dados
5. ✅ Acompanhar evolução com gráficos

### **Para Administradores:**
1. ✅ Acompanhar adesão total
2. ✅ Identificar sistemas com baixa taxa
3. ✅ Gerenciar notificações
4. ✅ Exportar relatórios (futuro)

### **Para Pacientes:**
1. ✅ Responder questionários facilmente
2. ✅ Ver que sua resposta foi analisada
3. ✅ Receber feedback personalizado

---

## 📊 Dados Estruturados

### **Métricas Calculadas**
- Total enviado, concluído, pendente, expirado
- Taxa de conclusão percentual
- Tempo médio de preenchimento
- Tendências ao longo do tempo
- Breakdown por sistema terapêutico

### **Insights Extraídos**
- Preocupações clínicas
- Áreas de melhoria
- Padrões comportamentais
- Recomendações de ação

### **Notificações Criadas**
- Timestamp automático
- Metadata com links
- Status de leitura
- Tipo categorizado

---

## 🚀 Roadmap Futuro

**Curto Prazo (1-2 semanas):**
- [ ] Email/WhatsApp para notificações urgentes
- [ ] Cronjob para verificar expiração
- [ ] Mais integração nas APIs existentes

**Médio Prazo (1 mês):**
- [ ] Exportação de relatórios (PDF, CSV)
- [ ] Análise comparativa entre pacientes
- [ ] Agendamento automático de questionários

**Longo Prazo (2+ meses):**
- [ ] Predição com ML
- [ ] Detecção de anomalias
- [ ] Sugestões de tratamento personalizadas

---

## ❓ FAQ

### **P: Como ativar as notificações?**
A: Use `QuestionnaireNotificationService` nas APIs onde questionários são processados. Ver `QUESTIONNAIRE_INTEGRATION_GUIDE.md`

### **P: Qual é a taxa de atualização?**
A: Notificações: 30s | Widget: 60s | Insights: Manual

### **P: Como adicionar ao menu?**
A: Adicione um `NavItem` com href="/admin/questionnaire-analytics" e ícone BarChart3

### **P: Precisa criar tabelas novas?**
A: Não! Usa `PatientQuestionnaire` e `Notification` existentes

### **P: Funciona em mobile?**
A: Sim! Design totalmente responsivo

---

## 🆘 Troubleshooting

**Notificações não aparecem?**
→ Verificar role do usuário e se notificação foi criada no BD

**Dashboard lento?**
→ Criar índices recomendados em `prisma/QUESTIONNAIRE_ANALYTICS_SCHEMA.md`

**Análise IA não dispara?**
→ Verificar se `aiAnalyzedAt` e `aiAnalysis` estão sendo preenchidos

---

## 📞 Suporte

1. **Usuários Finais:** Consultar `QUESTIONNAIRE_ANALYTICS_GUIDE.md`
2. **Desenvolvedores:** Consultar `QUESTIONNAIRE_INTEGRATION_GUIDE.md`
3. **Técnico:** Consultar `QUESTIONNAIRE_ANALYTICS_IMPLEMENTATION.md`

---

## 📈 Versão & Status

- **Versão:** 1.0
- **Data:** 2026-01-02  
- **Status:** ✅ **PRONTO PARA PRODUÇÃO**
- **Testes:** ✅ Completos
- **Documentação:** ✅ Completa
- **Deploy:** Próximo passo

---

## 🎓 Comece Agora

1. **Leia:** [QUESTIONNAIRE_SOLUTION_SUMMARY.md](./QUESTIONNAIRE_SOLUTION_SUMMARY.md)
2. **Acesse:** `/admin/questionnaire-analytics`
3. **Integre:** Siga [QUESTIONNAIRE_INTEGRATION_GUIDE.md](./QUESTIONNAIRE_INTEGRATION_GUIDE.md)
4. **Use:** Leia [QUESTIONNAIRE_ANALYTICS_GUIDE.md](./QUESTIONNAIRE_ANALYTICS_GUIDE.md)

---

**Desenvolvido com ❤️ para Healthcare**

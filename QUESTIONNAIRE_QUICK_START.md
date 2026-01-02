# ⚡ Quick Start - 5 Minutos

## 🎯 Objetivo
Ter o Dashboard de Análise de Questionários **rodando em 5 minutos**

---

## ✅ Checklist Pré-Requisitos

- [x] Node.js 18+
- [x] TypeScript configurado
- [x] Prisma configurado
- [x] NextAuth configurado
- [x] Recharts disponível
- [x] Lucide Icons disponível

**Tudo já existe no projeto!**

---

## 🚀 5 Passos (5 minutos)

### **PASSO 1: Copiar Arquivos (1 minuto)**

```bash
# 1. Componentes
cp components/questionnaires/*.tsx components/questionnaires/

# 2. APIs
mkdir -p app/api/questionnaires/{notifications,alerts,insights}
cp app/api/questionnaires/*.ts app/api/questionnaires/
cp app/api/questionnaires/notifications/*.ts app/api/questionnaires/notifications/
cp app/api/questionnaires/alerts/*.ts app/api/questionnaires/alerts/
cp app/api/questionnaires/insights/*.ts app/api/questionnaires/insights/

# 3. Serviço
cp lib/questionnaire-notification-service.ts lib/

# 4. Página
mkdir -p app/admin/questionnaire-analytics
cp app/admin/questionnaire-analytics/page.tsx app/admin/questionnaire-analytics/
```

**Ou manualmente:** Copie cada arquivo listado em `QUESTIONNAIRE_FILES_INVENTORY.md`

---

### **PASSO 2: Verificar Dependências (30 segundos)**

```bash
# Todas essas devem estar em package.json
npm list recharts lucide-react date-fns next-auth

# Se alguma faltar, instale
npm install recharts lucide-react date-fns next-auth
```

---

### **PASSO 3: Criar Índices do Banco (1 minuto)**

```sql
-- Run in your database (PostgreSQL)

CREATE INDEX idx_patient_questionnaire_status 
  ON "PatientQuestionnaire"("status");

CREATE INDEX idx_patient_questionnaire_sent_at 
  ON "PatientQuestionnaire"("sentAt");

CREATE INDEX idx_patient_questionnaire_ai_analysis 
  ON "PatientQuestionnaire"("aiAnalysis");

CREATE INDEX idx_notification_user_id 
  ON "Notification"("userId");

CREATE INDEX idx_notification_read 
  ON "Notification"("read");

CREATE INDEX idx_notification_type 
  ON "Notification"("type");
```

**Ou via Prisma migration:**
```bash
npx prisma migrate dev --name add_questionnaire_indexes
```

---

### **PASSO 4: Adicionar Menu (30 segundos)**

Em `components/navigation.tsx` ou seu menu component:

```tsx
import { BarChart3 } from 'lucide-react'

// Adicione na seção admin do seu menu:
<NavItem
  href="/admin/questionnaire-analytics"
  icon={BarChart3}
  label="Análise de Questionários"
/>
```

---

### **PASSO 5: Testar (1 minuto)**

```bash
# 1. Inicie o servidor
npm run dev

# 2. Acesse no navegador
# http://localhost:3000/admin/questionnaire-analytics

# 3. Verifique as 3 abas:
#    ✓ Visão Geral (gráficos vazios é normal)
#    ✓ Notificações (vazio é normal)
#    ✓ Insights (vazio é normal)
```

---

## ✅ Pronto!

O dashboard está **100% funcional** e pronto para usar!

---

## 🔗 Próximos Passos

### **Integrar Notificações (Opcional)**

Para começar a receber notificações, adicione em suas APIs:

```typescript
import { QuestionnaireNotificationService } from '@/lib/questionnaire-notification-service'

// Quando enviar questionário
await QuestionnaireNotificationService.notifyQuestionnaireSent(
  doctorId, patientName, questionnaireName, questionnaireId
)

// Quando responder
await QuestionnaireNotificationService.notifyQuestionnaireCompleted(
  doctorId, patientName, questionnaireName, questionnaireId, patientId
)
```

👉 **Veja `QUESTIONNAIRE_INTEGRATION_GUIDE.md` para exemplos completos**

---

## 📚 Referência Rápida

| Recurso | Localização |
|---------|------------|
| Dashboard | `/admin/questionnaire-analytics` |
| Documentação de Uso | `QUESTIONNAIRE_ANALYTICS_GUIDE.md` |
| Integração | `QUESTIONNAIRE_INTEGRATION_GUIDE.md` |
| Arquitetura | `QUESTIONNAIRE_ARCHITECTURE.md` |
| Inventário de Arquivos | `QUESTIONNAIRE_FILES_INVENTORY.md` |

---

## 🎓 Estrutura Aprendizado

### **Para Usuários Finais (Médicos/Terapeutas):**
1. Acesse `/admin/questionnaire-analytics`
2. Leia: `QUESTIONNAIRE_ANALYTICS_GUIDE.md` (5 min)
3. Explore as 3 abas (5 min)
4. ✅ Pronto para usar!

### **Para Desenvolvedores (Integração):**
1. Copie arquivos (1 min)
2. Leia: `QUESTIONNAIRE_INTEGRATION_GUIDE.md` (10 min)
3. Integre nas APIs (10-20 min)
4. Teste (5 min)
5. ✅ Pronto!

### **Para Arquitetos (Design):**
1. Leia: `QUESTIONNAIRE_SOLUTION_SUMMARY.md` (5 min)
2. Estude: `QUESTIONNAIRE_ARCHITECTURE.md` (15 min)
3. Revise: `QUESTIONNAIRE_ANALYTICS_IMPLEMENTATION.md` (10 min)
4. ✅ Entendimento completo!

---

## 🆘 Troubleshooting Rápido

### **"Dashboard não aparece"**
```bash
# Verificar arquivo existe
ls -la app/admin/questionnaire-analytics/page.tsx

# Verificar permissão (user é DOCTOR/ADMIN?)
# Verificar login está funcionando
```

### **"APIs retornam erro 404"**
```bash
# Verificar rota existe
ls -la app/api/questionnaires/analytics/route.ts

# Verificar não há typo na URL
# Verificar método HTTP (GET vs POST)
```

### **"Banco sem dados"**
```bash
# Normal! Dashboard funciona vazio
# Dados aparecem quando questionnários são enviados
# Para teste, insira dados manualmente:

INSERT INTO "PatientQuestionnaire" (...) VALUES (...)
```

### **"Componentes não encontrados"**
```bash
# Verificar importação está correta
# import { QuestionnaireAnalyticsDashboard } 
#   from '@/components/questionnaires/...'

# Verificar arquivo existe
# ls -la components/questionnaires/
```

---

## ⚡ Comandos Úteis

```bash
# Iniciar servidor dev
npm run dev

# Build para produção
npm run build

# Criar índices Prisma
npx prisma migrate dev --name add_indexes

# Ver schema Prisma
npx prisma studio

# Limpar cache Next.js
rm -rf .next

# Restart dev server
# Ctrl+C e npm run dev novamente
```

---

## 🎯 Exemplo de Uso Real

### **Cenário: Médico usando o dashboard**

```
1. Médico acessa /admin/questionnaire-analytics
2. Vê as 3 abas disponíveis
3. Clica em "Notificações"
4. Vê lista de questionários respondidos
5. Clica em um → vai para o perfil do paciente
6. Clica em "Insights"
7. Vê análises automáticas da IA
8. Clica em "Visualizar Questionário"
9. Revisa as respostas e análises
10. Toma decisão clínica baseada em dados
```

---

## ✨ Features Prontos para Usar

✅ **Imediato (sem fazer nada):**
- Dashboard visual
- Gráficos de análise
- Painel de insights
- Filtros e busca

✅ **Com Integração (5 min de código):**
- Notificações automáticas
- Alertas em tempo real
- Widget no dashboard

✅ **Futuro (roadmap):**
- Export em PDF/CSV
- Alertas por email/SMS
- Análise preditiva
- Comparação entre pacientes

---

## 📞 Suporte

**Dúvida rápida?** Consulte:

| Pergunta | Resposta |
|----------|----------|
| Como usar? | `QUESTIONNAIRE_ANALYTICS_GUIDE.md` |
| Como integrar? | `QUESTIONNAIRE_INTEGRATION_GUIDE.md` |
| Como funciona? | `QUESTIONNAIRE_ARCHITECTURE.md` |
| Qual arquivo faz o quê? | `QUESTIONNAIRE_FILES_INVENTORY.md` |
| Qual é o problema/benefício? | `QUESTIONNAIRE_SOLUTION_SUMMARY.md` |

---

## 🎉 Conclusão

Em **5 minutos** você terá um **dashboard profissional** de análise de questionários totalmente funcional!

**Próximo passo:** Integre as notificações e comece a usar em produção.

---

**Tempo Total:** ⏱️ 5 minutos  
**Complexidade:** 🟢 Muito Fácil  
**Resultado:** 🚀 Production Ready  

**LET'S GO! 🚀**

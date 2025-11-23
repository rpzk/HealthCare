# 💼 Funcionalidades Comerciais (Long-Term Goals)

Este documento resume as funcionalidades comerciais implementadas para tornar o sistema HealthCare viável para uso em clínicas reais.

## 1. Módulo Financeiro 💰
**Localização:** `/admin/financial` (Acesso via Sidebar > Financeiro)

- **Dashboard Financeiro:** Visão geral de receitas, despesas e saldo.
- **Transações:** Registro de entradas (consultas, procedimentos) e saídas (aluguel, insumos).
- **Gráficos:** Visualização mensal de fluxo de caixa.
- **Integração:** Preparado para integração futura com gateways de pagamento.

## 2. Agenda Avançada 📅
**Localização:** `/settings/schedule` (Acesso via Sidebar > Configurações > Horários de Atendimento)

- **Configuração de Horários:** Definição de horários de trabalho por dia da semana.
- **Duração de Consulta:** Configuração personalizada da duração média.
- **Exceções:** (Backend pronto) Suporte para bloqueios de agenda (feriados, férias).

## 3. Sistema de Notificações 🔔
**Localização:** Ícone de sino no cabeçalho (Header)

- **Persistência:** Notificações salvas no banco de dados.
- **Tipos:** Lembretes de consulta, alertas de sistema, mensagens administrativas.
- **WhatsApp (Stub):** Estrutura pronta para envio de mensagens via WhatsApp (requer provedor como Twilio/Zenvia).
- **Auditoria:** Logs de leitura e envio de notificações.

## 4. Telemedicina Integrada 📹
**Localização:** `/tele/[id]`

- **Workspace Clínico:** Prontuário e IA integrados na tela de vídeo chamada.
- **IA em Tempo Real:** Transcrição e sugestões durante a consulta.

---

## ✅ Status de Implementação

- [x] Banco de Dados (Schema Prisma)
- [x] Services (Backend Logic)
- [x] API Routes (Next.js App Router)
- [x] Frontend Pages (UI/UX)
- [x] Navegação (Sidebar/Header)

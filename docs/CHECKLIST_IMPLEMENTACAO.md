# ✅ CHECKLIST DE IMPLEMENTAÇÃO - Sprint-by-Sprint

## 🎯 OBJETIVO
Guia prático para acompanhar o progresso de implementação das 5 fases do novo dashboard.

---

## 📋 FASE 0: APROVAÇÃO & PLANNING (Semana 1-2)

### Atividades Pré-Sprint

- [ ] **Apresentação Executiva Agendada**
  - [ ] Apresentação preparada (usar SUMARIO_EXECUTIVO_UX_TRANSFORMACAO.md)
  - [ ] Demo do protótipo testada
  - [ ] Stakeholders convocados (PM, CPO, Tech Lead, Dir. Clínico)
  - [ ] Sala/vídeo conferência reservada
  - Data: ___/___/___

- [ ] **Documentação Organizada**
  - [ ] Todos os 6 documentos em `/docs/` acessíveis
  - [ ] Links funcionando
  - [ ] Protótipo deployado em ambiente demo (se possível)
  - [ ] Acesso compartilhado com stakeholders

- [ ] **Aprovação Obtida**
  - [ ] ✅ PM aprova escopo
  - [ ] ✅ CPO aprova timing
  - [ ] ✅ Tech Lead aprova arquitetura
  - [ ] ✅ Dir. Clínico aprova impacto clínico
  - [ ] Documentação de aprovação salva (print de email/Slack)

### Sprint Planning

- [ ] **Equipe Alocada**
  - [ ] Frontend Engineer (Senior) confirmado - 30h
  - [ ] Backend Engineer confirmado - 20h
  - [ ] Database Engineer confirmado - 10h
  - [ ] UI/UX Designer confirmado - 8h (refinement)
  - [ ] QA Engineer confirmado - 12h
  - [ ] Product Manager alocado - 5h

- [ ] **Ambiente Dev Setup**
  - [ ] Git branch criada: `feature/novo-dashboard`
  - [ ] Development mode testado localmente
  - [ ] Docker ambiente configurado
  - [ ] Database dev conectada
  - [ ] Prisma client sincronizado
  - [ ] Todos conseguem rodar `npm run dev`

- [ ] **Documentação Distributed**
  - [ ] Equipe leu GUIA_IMPLEMENTACAO_NOVO_DASHBOARD.md
  - [ ] Arquitetura entendida (5 seções)
  - [ ] Modelos Prisma review feito
  - [ ] Q&A sessão completada
  - [ ] Design system entendido (cores, tipografia)

### Checkpoints

- [ ] Sprint 1 trello/jira criado com tasks
- [ ] Daily standup agendado (10h todos os dias)
- [ ] Sprint review agendado (sexta 14h)
- [ ] Sprint planning próximo sprint agendado

**GO/NO-GO Decision:** ___/___/___ (Data esperada)
- [ ] Aprovação completa?
- [ ] Equipe pronta?
- [ ] Documentação clara?

---

## 🗄️ FASE 1: DATABASE INFRASTRUCTURE (Semana 2-3)

### Task 1.1: Schema Prisma

- [ ] **Criar Schema File**
  - [ ] `schema.prisma` atualizado com 7 novos modelos
  - [ ] Models: PatientMoodLog, PatientAptitude, PatientBadge, PatientDevelopmentPlan, PatientHealthEvent, PatientWellnessScore, PatientJournal
  - [ ] Todas relações com `Patient` model criadas
  - [ ] Indexes criados para performance
  - [ ] Comentários em cada campo
  - [ ] Code review feito por Backend Engineer

- [ ] **Validação Local**
  - [ ] `npx prisma validate` passa sem erros
  - [ ] Schema compila sem warnings
  - [ ] Relações estão corretas (cascade delete onde apropriado)
  - [ ] Generated types fazem sentido

### Task 1.2: Migration

- [ ] **Criar Migration**
  - [ ] `npx prisma migrate dev --name "add_wellness_dashboard_tables"` executado
  - [ ] Migration file gerado sem erros
  - [ ] SQL gerado revisado (verifica para drops acidentais)
  - [ ] Migration forward testada no dev
  - [ ] Migration backward testada (`npx prisma migrate resolve`)

- [ ] **Validação em Dev**
  - [ ] Tabelas criadas em PostgreSQL
  - [ ] Indexes verificados
  - [ ] Constraints validados
  - [ ] Prisma client regenerado

- [ ] **Backup Staging**
  - [ ] Staging database backed up antes de migration
  - [ ] Migration testada em staging
  - [ ] Rollback testada em staging (em caso de erro)

### Task 1.3: Seed Data

- [ ] **Criar Seed Script**
  - [ ] `scripts/seed-wellness-demo.ts` criado
  - [ ] Demo patient mapeado (João Silva)
  - [ ] 30 dias de mood logs gerados
  - [ ] 2+ aptitudes criadas
  - [ ] 3+ badges criadas
  - [ ] Wellness scores calculados
  - [ ] Timeline events criados

- [ ] **Executar Seed**
  - [ ] `npx ts-node scripts/seed-wellness-demo.ts` rodou sem erro
  - [ ] Dados verificados em Prisma Studio (`npx prisma studio`)
  - [ ] Contagens corretas:
    - [ ] Mood logs: 30+
    - [ ] Aptitudes: 2+
    - [ ] Badges: 3+
    - [ ] Wellness scores: 30+

### Checkpoints

- [ ] Prisma Studio acessível com todos os dados
- [ ] `npm run type-check` passa 100%
- [ ] Backend Engineer code review aprovado
- [ ] DB migrations documentadas em Sprint notes

**Phase 1 Complete:** ___/___/___ (Data)
- [ ] Schema ✅
- [ ] Migration ✅
- [ ] Seed ✅
- [ ] Todos testes passando ✅

---

## 🔌 FASE 2: BACKEND APIs (Semana 3-4)

### Task 2.1: GET /api/patient/wellness/state

- [ ] **Implementação**
  - [ ] Endpoint criado em `app/api/patient/wellness/state/route.ts`
  - [ ] Autenticação verificada
  - [ ] Query Prisma escrita e otimizada
  - [ ] Resposta JSON estruturada corretamente
  - [ ] Error handling implementado (401, 500)

- [ ] **Dados Retornados**
  - [ ] mood (1-5)
  - [ ] wellnessScore (0-100)
  - [ ] scoreChange (+/-)
  - [ ] scoreChangePercentage
  - [ ] motivationalMessage
  - [ ] trend (up/down/stable)
  - [ ] lastUpdated

- [ ] **Testes**
  - [ ] Unit test escrito (vitest)
  - [ ] Mock data testado
  - [ ] Edge cases cobertos (sem mood log, primeira vez)
  - [ ] API call testada via Postman/curl
  - [ ] Response time < 500ms

### Task 2.2: GET /api/patient/wellness/priorities

- [ ] **Implementação**
  - [ ] Endpoint criado em `app/api/patient/wellness/priorities/route.ts`
  - [ ] Query múltiplas (medications, appointments, goals)
  - [ ] Ranking lógica implementada
  - [ ] Response array ordenada por prioridade

- [ ] **Dados Retornados**
  - [ ] type (medication|appointment|goal)
  - [ ] priority (1, 2, 3...)
  - [ ] title, description
  - [ ] urgency (HIGH|MEDIUM|LOW)
  - [ ] actions (array de botões)

- [ ] **Testes**
  - [ ] Unit test completo
  - [ ] Sem dados (empty state)
  - [ ] Com múltiplas prioridades
  - [ ] Ordenação correta

### Task 2.3: GET /api/patient/wellness/aptitudes

- [ ] **Implementação**
  - [ ] Endpoint criado em `app/api/patient/wellness/aptitudes/route.ts`
  - [ ] Query Prisma com ordenação por score
  - [ ] Todos os campos retornados

- [ ] **Dados Retornados**
  - [ ] name, description, icon, category
  - [ ] score (0-100)
  - [ ] discoveredAt

- [ ] **Testes**
  - [ ] Unit test
  - [ ] API call

### Task 2.4: POST /api/patient/wellness/mood

- [ ] **Implementação**
  - [ ] Endpoint POST criado
  - [ ] Request validation (mood 1-5, etc)
  - [ ] Mood log criado em DB
  - [ ] Wellness score recalculado

- [ ] **Testes**
  - [ ] Valid mood registrado
  - [ ] Invalid mood rejeitado (400)
  - [ ] DB insert verificado

### Task 2.5: GET /api/patient/wellness/timeline

- [ ] **Implementação**
  - [ ] Endpoint criado
  - [ ] Timeline events retornados ordenados por data (desc)
  - [ ] Causalité linkage incluído

- [ ] **Testes**
  - [ ] Multiple events testados
  - [ ] Ordenação correta

### Task 2.6: Utilities & Helpers

- [ ] **calculateWellnessScore function**
  - [ ] Criada em `lib/utils/wellness.ts`
  - [ ] Fórmula: (mood + energy + sleep) / 3 * 60, ajustado por stress
  - [ ] Testes para múltiplos inputs
  - [ ] Resultado sempre 0-100

### Checkpoints

- [ ] Todos 5 endpoints retornando dados corretos
- [ ] Postman collection criada e testada
- [ ] E2E request/response testado
- [ ] Performance check (todos < 500ms)
- [ ] Error handling completo
- [ ] 80%+ test coverage para APIs

**Phase 2 Complete:** ___/___/___ (Data)
- [ ] Todos endpoints ✅
- [ ] Testes ✅
- [ ] Code review ✅
- [ ] Documentação de API ✅

---

## 🎨 FASE 3: FRONTEND COMPONENTS (Semana 4-5)

### Estrutura de Pastas

- [ ] **Criar Pasta Componentes**
  ```
  components/wellness/
  ├── WellnessHero.tsx
  ├── DailyPriorities.tsx
  ├── ProgressSection.tsx
  ├── DevelopmentHub.tsx
  ├── HealthTimeline.tsx
  ├── MoodSelector.tsx
  ├── BadgeCard.tsx
  ├── MotivationalMessage.tsx
  └── AptitudeCard.tsx
  ```
  - [ ] Pasta criada
  - [ ] Todos 9 componentes criados (inicialmente vazios)

### Task 3.1: WellnessHero Component

- [ ] **Implementação**
  - [ ] `components/wellness/WellnessHero.tsx` criado
  - [ ] Chama `/api/patient/wellness/state`
  - [ ] Exibe greeting com nome
  - [ ] Mostra wellness score (0-100) com barra
  - [ ] Exibe scoreChange com seta (↑/↓)
  - [ ] Mostra motivational message
  - [ ] Estilo: gradiente roxo + rosa (design system)

- [ ] **Testes**
  - [ ] Component renderiza sem erro
  - [ ] Props passadas corretamente
  - [ ] Mobile responsivo
  - [ ] Loading state implementado

### Task 3.2: MoodSelector Component

- [ ] **Implementação**
  - [ ] `components/wellness/MoodSelector.tsx` criado
  - [ ] 5 emoji buttons (😢😐🙂😊🤗)
  - [ ] Click chama POST `/api/patient/wellness/mood`
  - [ ] Selected estado visualmente diferente (scale + opacity)
  - [ ] Confete animado após seleção (Framer Motion)
  - [ ] Toast com mensagem de sucesso (Sonner)

- [ ] **Testes**
  - [ ] Seleção mockeada
  - [ ] API call em caso real
  - [ ] Animação suave
  - [ ] Toast aparece

### Task 3.3: DailyPriorities Component

- [ ] **Implementação**
  - [ ] `components/wellness/DailyPriorities.tsx` criado
  - [ ] Chama `/api/patient/wellness/priorities`
  - [ ] 3 cards de prioridades
  - [ ] Cada card mostra: título, descrição, urgência, ações
  - [ ] Ícones corretos (💊🏥🎯)
  - [ ] Botões de ação funcionam
  - [ ] Cores por urgência (high=laranja, medium=cinza)

- [ ] **Testes**
  - [ ] 3 cards renderizam
  - [ ] Sem dados: empty state
  - [ ] Ações funcionam

### Task 3.4: ProgressSection Component

- [ ] **Implementação**
  - [ ] Streaks exibidos (🔥 X dias)
  - [ ] Aptitudes carregadas via API
  - [ ] Badges exibidos com rarity colors
  - [ ] Progress bar para próximo badge
  - [ ] Grid layout 2x2 ou 3-col

- [ ] **Testes**
  - [ ] Todos elementos renderizam
  - [ ] Cores corretas por rarity

### Task 3.5: AptitudeCard & BadgeCard

- [ ] **Implementação**
  - [ ] `components/wellness/AptitudeCard.tsx` - card individual
  - [ ] `components/wellness/BadgeCard.tsx` - badge individual
  - [ ] Hover effects (Framer Motion)
  - [ ] Rarity colors (common=gray, rare=blue, epic=purple, legendary=gold)

### Task 3.6: DevelopmentHub Component

- [ ] **Implementação**
  - [ ] Tabbed interface (Radix Tabs)
  - [ ] 4 abas: Perfil, Plano, Aprenda, Comunidade
  - [ ] Cada aba com conteúdo placeholder
  - [ ] Transição suave entre abas
  - [ ] Mobile: abas em vertical

- [ ] **Testes**
  - [ ] Todas abas funcionam
  - [ ] Conteúdo muda ao clicar

### Task 3.7: HealthTimeline Component

- [ ] **Implementação**
  - [ ] Timeline vertical
  - [ ] Eventos carregados via API
  - [ ] Cronologia (mais recente topo)
  - [ ] Ícones por tipo (medication, exam, etc)
  - [ ] Descrição e causalité linkage
  - [ ] Conectores visuais entre eventos

- [ ] **Testes**
  - [ ] Múltiplos eventos renderizam
  - [ ] Ordenação correta

### Task 3.8: Integração no novo-dashboard

- [ ] **page.tsx Atualizado**
  - [ ] Todos 5 componentes principais integrados
  - [ ] Layout correto (stack vertical, mobile-first)
  - [ ] Spacing consistente (gap classes)
  - [ ] Loading states para async data
  - [ ] Error boundaries

### Checkpoints

- [ ] Todos componentes renderizam sem erro
- [ ] TypeScript 100% compilado (0 errors)
- [ ] Responsividade testada (desktop, tablet, mobile)
- [ ] Acessibilidade básica (alt text, labels)
- [ ] Performance check (Lighthouse > 80)
- [ ] Visual review com Designer

**Phase 3 Complete:** ___/___/___ (Data)
- [ ] Todos 6 componentes principais ✅
- [ ] Integração page.tsx ✅
- [ ] Responsive ✅
- [ ] TypeScript 0 errors ✅

---

## ✅ FASE 4: TESTES & QA (Semana 5-6)

### Unit Tests

- [ ] **Component Tests (Vitest + React Testing Library)**
  - [ ] `WellnessHero.test.tsx` - 3+ casos
  - [ ] `MoodSelector.test.tsx` - seleção mood
  - [ ] `DailyPriorities.test.tsx` - prioridades
  - [ ] `ProgressSection.test.tsx` - badges/streaks
  - [ ] `HealthTimeline.test.tsx` - timeline
  - Cobertura mínima: 80%

- [ ] **API Tests**
  - [ ] GET /wellness/state - mock data
  - [ ] POST /wellness/mood - create mood
  - [ ] GET /wellness/priorities - rankings
  - [ ] Cobertura: 80%+

- [ ] **Utility Function Tests**
  - [ ] calculateWellnessScore() - múltiplos inputs
  - [ ] Cobertura: 100%

### E2E Tests

- [ ] **User Flows (Playwright)**
  - [ ] User abre novo-dashboard
  - [ ] User seleciona mood emoji
  - [ ] User completa tarefa (Já tomei)
  - [ ] User explora diferentes seções
  - [ ] User clica abas em Development Hub

- [ ] **Happy Path Testado**
  - [ ] Login → Dashboard → Mood select → Completa tarefa
  - [ ] Test passes 100%

### Manual Testing

- [ ] **QA Checklist**
  - [ ] Dashboard carrega sem erros
  - [ ] Mood selector funciona (5 emojis)
  - [ ] Prioridades mostram 3 itens
  - [ ] Streaks display correto
  - [ ] Aptitudes carregam
  - [ ] Badges mostram raridade
  - [ ] Timeline navega corretamente
  - [ ] Abas do Development Hub funcionam
  - [ ] Mobile responsivo (375px, 768px, 1024px)
  - [ ] Sem console errors
  - [ ] Sem performance warnings

### Performance Testing

- [ ] **Lighthouse Audit**
  - [ ] Performance > 80
  - [ ] Accessibility > 80
  - [ ] Best Practices > 80
  - [ ] SEO > 80
  - [ ] First Contentful Paint < 2s
  - [ ] Cumulative Layout Shift < 0.1

### Checkpoints

- [ ] Todos unit tests passam
- [ ] Todos E2E tests passam
- [ ] QA checklist 100% completo
- [ ] Lighthouse verde
- [ ] Code review final feito
- [ ] Ready for staging deployment

**Phase 4 Complete:** ___/___/___ (Data)
- [ ] Unit tests ✅
- [ ] E2E tests ✅
- [ ] Manual QA ✅
- [ ] Performance ✅

---

## 🚀 FASE 5: DEPLOYMENT & MONITORING (Semana 6)

### Feature Flags

- [ ] **Setup Feature Flags**
  - [ ] Environment variable `FEATURE_NOVO_DASHBOARD=true` no dev
  - [ ] Feature flag middleware criado
  - [ ] Fallback para old dashboard se flag off
  - [ ] Staging: flag off (para manter stability)
  - [ ] Produção: flag off (prepare for gradual rollout)

- [ ] **Configuração**
  - [ ] `.env.local`: FEATURE_NOVO_DASHBOARD=true
  - [ ] `.env.staging`: FEATURE_NOVO_DASHBOARD=false
  - [ ] `.env.production`: FEATURE_NOVO_DASHBOARD=false (inicialmente)

### Monitoring Setup

- [ ] **Tracking Code Inserted**
  - [ ] Segment/Mixpanel ID integrado
  - [ ] Events rastreados:
    - [ ] `page_view` - novo dashboard acessado
    - [ ] `mood_selected` - mood selector clicado
    - [ ] `task_completed` - tarefa marcada como completa
    - [ ] `aptitude_viewed` - aptitude clicked
    - [ ] `badge_unlocked` - badge desbloqueado
    - [ ] `session_duration` - tempo no dashboard

- [ ] **Dashboard Criado**
  - [ ] Mixpanel dashboard com 6 eventos
  - [ ] Alerts configurados (erro rate > 5%)

### Staging Deployment

- [ ] **Deploy para Staging**
  - [ ] Branch `feature/novo-dashboard` pushed
  - [ ] CI/CD pipeline passa (build, tests)
  - [ ] Merge em `develop`
  - [ ] Deploy para `staging.healthcare.com`
  - [ ] Healthcheck passes
  - [ ] URL acessível: `staging.healthcare.com/minha-saude/novo-dashboard`

- [ ] **QA em Staging**
  - [ ] Todos testes passam em staging
  - [ ] Database atualizado (migration aplicada)
  - [ ] Seed data presente
  - [ ] Sem erros em console
  - [ ] Performance OK

### Production Preparation

- [ ] **Rollout Strategy**
  - [ ] Feature flag preparado para 10%
  - [ ] Canary user group identificado (10 patients)
  - [ ] Monitoring alerts configurados
  - [ ] Rollback plan documentado

- [ ] **Communication**
  - [ ] Email preparado para 10% users
  - [ ] Support team notificado
  - [ ] FAQ preparada
  - [ ] Help docs atualizados

### Production Deployment (Phase 1: 10%)

- [ ] **Deploy Production**
  - [ ] Merge `develop` em `main`
  - [ ] Version bumped (v1.1.0)
  - [ ] CI/CD passes
  - [ ] Production deployment inicia
  - [ ] Healthcheck passes
  - [ ] Feature flag: FEATURE_NOVO_DASHBOARD=true (10% rollout)

- [ ] **Monitoring Live**
  - [ ] Observar eventos por 24h
  - [ ] Erro rate < 1%
  - [ ] Session duration aumentou (vs old dashboard)
  - [ ] Performance OK
  - [ ] Sem crashes

### Checkpoints

- [ ] Feature flags funcionando
- [ ] Monitoring eventos rastreados
- [ ] Staging stable 48h
- [ ] Production 10% live 24h
- [ ] KPIs positivos
- [ ] Ready para 50% rollout

**Phase 5 Complete:** ___/___/___ (Data)
- [ ] Feature flags ✅
- [ ] Monitoring ✅
- [ ] Staging ✅
- [ ] Production 10% ✅

---

## 📈 SUCCESS METRICS TRACKING

### Técnico

| Métrica | Target | Atual | Status |
|---------|--------|-------|--------|
| TypeScript errors | 0 | ___ | [ ] ✅ |
| Unit test coverage | 80%+ | ___ | [ ] ✅ |
| E2E tests passing | 100% | ___ | [ ] ✅ |
| Lighthouse score | >80 | ___ | [ ] ✅ |
| Response time (APIs) | <500ms | ___ | [ ] ✅ |

### Produto

| Métrica | Target | Atual | Status |
|---------|--------|-------|--------|
| Mood tracking functional | ✅ | [ ] | [ ] ✅ |
| Priorities showing | ✅ | [ ] | [ ] ✅ |
| Aptitudes displaying | ✅ | [ ] | [ ] ✅ |
| Wellness score calculating | ✅ | [ ] | [ ] ✅ |
| Timeline integrated | ✅ | [ ] | [ ] ✅ |
| Feature flag working | ✅ | [ ] | [ ] ✅ |

### Usuário (Prod 10%)

| Métrica | Target | Atual | Status |
|---------|--------|-------|--------|
| Erro rate | <1% | ___ | [ ] ✅ |
| Session duration | +50% vs old | ___ | [ ] ✅ |
| Daily active users | +30% | ___ | [ ] ✅ |
| NPS (pilot group) | >7/10 | ___ | [ ] ✅ |
| Completion rate | >70% | ___ | [ ] ✅ |

---

## 🎁 POST-LAUNCH ACTIVITIES

### Semana 7: Análise & Iteração

- [ ] Analisar dados de 10% usuarios
- [ ] Coletar feedback
- [ ] Identificar bugs/UX issues
- [ ] Priorizar fixes

### Semana 8: Rollout 50%

- [ ] Feature flag: 50% usuarios
- [ ] Monitorar KPIs
- [ ] Support team pronto para tickets

### Semana 9: Rollout 100%

- [ ] Feature flag: 100% usuarios
- [ ] Full monitoring ativo
- [ ] Celebrate launch! 🎉

### Semana 10+: Phase 2 (AI/ML)

- [ ] Iniciar Phase 2: Auto-detection de aptidões
- [ ] Trend analysis
- [ ] Insights generation

---

**Documento Checklist:** 15 de dezembro, 2025  
**Última Atualização:** ___/___/___  
**Sprint Atual:** Sprint ___  
**Responsável:** ___________  

---

## 📞 NOTAS & BLOCKERS

```
Sprint 1 Notes:
[ ] Blocker 1: _____________________
[ ] Blocker 2: _____________________
[ ] Win 1: _________________________
[ ] Win 2: _________________________
```

---

**Status Geral:** ⏳ **AWAITING LAUNCH**

Documentos de suporte:
- ✅ SUMARIO_EXECUTIVO_UX_TRANSFORMACAO.md
- ✅ ANALISE_UX_UI_JORNADA_PACIENTE.md
- ✅ GUIA_IMPLEMENTACAO_NOVO_DASHBOARD.md
- ✅ MOCKUPS_VISUAIS_ASCII.md
- ✅ PERSONAS_JORNADAS_USUARIO.md
- ✅ ROADMAP_EXECUTIVO.md
- ✅ INDICE_COMPLETO_UX_TRANSFORMACAO.md

# 🗺️ Roadmap - Healthcare System

## 📊 Status Atual do Projeto

**Versão:** 1.0.0  
**Data:** Novembro 2025  
**Status:** ✅ Estabilizado para MVP

---

## ✅ Fase 1: Estabilização (COMPLETO)

### 1.1 Correção de Erros TypeScript ✅
- [x] Corrigido `app/api/coding/autocomplete/route.ts` - query do CodeSystem
- [x] Corrigido `app/api/hr/dashboard/route.ts` - tipagem de parâmetros
- [x] Corrigido `app/api/hr/leave-requests/route.ts` - tipagem de managers
- [x] Corrigido `app/api/notifications/stats/route.ts` - método `getNotificationStats` adicionado
- [x] Corrigido `app/api/profile/route.ts` - tipagem de session
- [x] Corrigido `pages/api/admin/external-updates/*.ts` - tipagem de session
- [x] Corrigido `components/ui/notification-center.tsx` - `formatTimeAgo` inline
- [x] Movido `scripts/import-cid10.ts` para archive (schema desatualizado)
- [x] Atualizado `tsconfig.json` para excluir `scripts/archive` e `tests`

**Resultado:** Zero erros TypeScript (`npm run type-check` ✅)

### 1.2 Testes Automatizados ✅
- [x] Instalado Vitest + Testing Library
- [x] Configurado `vitest.config.ts`
- [x] Criado `tests/setup.ts` com mocks padrão
- [x] Testes de validação: `tests/lib/validation-schemas.test.ts` (9 testes)
- [x] Testes de RBAC: `tests/lib/rbac.test.ts` (13 testes)
- [x] Testes de audit: `tests/lib/audit-logger.test.ts` (7 testes)

**Resultado:** 29 testes passando (`npm run test:unit` ✅)

### 1.3 CI/CD ✅
- [x] GitHub Actions configurado (`.github/workflows/ci.yml`)
- [x] Pipeline inclui: type-check, lint, unit tests, build, integration tests
- [x] Security audit integrado

---

## 🔄 Fase 2: Produtização (EM PROGRESSO)

### 2.1 Consolidação de Componentes ✅
- [x] Unificado `ConsultationWorkspace` (de 3 para 1 componente)
- [x] Removidos ~2800 linhas de código duplicado
- [x] Criados componentes UI faltantes (`scroll-area`, `collapsible`)

### 2.2 Security Hardening (PENDENTE)
- [ ] Implementar CSP mais restritiva (remover `unsafe-inline`)
- [ ] Adicionar rate limiting global em middleware
- [ ] Implementar validação Zod em todas as APIs
- [ ] Configurar CORS adequadamente
- [ ] Adicionar headers de segurança (HSTS em produção)

### 2.3 Performance (PENDENTE)
- [ ] Lazy loading de componentes pesados
- [ ] Otimização de queries Prisma (includes seletivos)
- [ ] Caching com Redis para dados frequentes
- [ ] Compressão de assets

### 2.4 Mobile/PWA (PENDENTE)
- [ ] Configurar PWA manifest
- [ ] Service worker para offline
- [ ] Testes de responsividade

---

## 📋 Fase 3: Compliance (FUTURO)

### 3.1 Documentação
- [ ] README técnico para desenvolvedores
- [ ] Manual do usuário para profissionais de saúde
- [ ] Documentação de API (OpenAPI/Swagger)

### 3.2 LGPD/Regulatório
- [ ] Política de privacidade completa
- [ ] Termo de consentimento
- [ ] Relatório de impacto (RIPD)
- [ ] Registro de operações de tratamento

### 3.3 Certificações (OPCIONAL)
- [ ] Registro ANVISA Classe I (se aplicável)
- [ ] Certificação ISO 27001 (se enterprise)

---

## 🚀 Fase 4: Go-to-Market (FUTURO)

### 4.1 Piloto
- [ ] Identificar 1-2 clínicas parceiras
- [ ] Deploy em ambiente de testes
- [ ] Coletar feedback estruturado
- [ ] Iterar baseado em uso real

### 4.2 Infraestrutura
- [ ] Documentação de deploy (Umbrel, VPS, Cloud)
- [ ] Estratégia de backup automatizado
- [ ] Monitoramento (Prometheus/Grafana ou similar)
- [ ] SLA definido

### 4.3 Comercial
- [ ] Definir modelo de pricing (SaaS vs licença)
- [ ] Landing page
- [ ] Estrutura de suporte

---

## 📈 Métricas do Projeto

| Métrica | Valor |
|---------|-------|
| Linhas de código TypeScript | ~55.000 |
| Arquivos .ts/.tsx | 379 |
| Models Prisma | 69 |
| Endpoints API | 40+ |
| Testes Unitários | 29 |
| Erros TypeScript | 0 ✅ |

---

## 🛠️ Stack Tecnológica

- **Frontend:** Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Node.js, Prisma ORM, NextAuth.js
- **Database:** PostgreSQL, Redis
- **IA:** Ollama (local), Whisper STT
- **DevOps:** Docker, GitHub Actions
- **Testes:** Vitest, Testing Library

---

## 📝 Comandos Úteis

```bash
# Desenvolvimento
npm run dev              # Iniciar em modo desenvolvimento
npm run build            # Build de produção
npm run start            # Iniciar servidor de produção

# Qualidade
npm run type-check       # Verificar tipos TypeScript
npm run lint             # Executar ESLint
npm run test:unit        # Rodar testes unitários
npm run test:coverage    # Rodar testes com cobertura

# Banco de dados
npm run db:generate      # Gerar Prisma Client
npm run db:migrate       # Rodar migrations
npm run db:studio        # Abrir Prisma Studio
npm run db:seed          # Popular banco com dados iniciais

# Docker
docker compose up -d                    # Dev (postgres + redis)
docker compose -f docker-compose.prod.yml up -d --build  # Produção
```

---

*Última atualização: Novembro 2025*

# 🐳 Docker: Quando é Necessário Rebuild?

## ✅ Resposta Rápida

Para as **mudanças feitas no sistema de termos**:

### 🟢 Desenvolvimento Local (`npm run dev`)
**NÃO precisa rebuild** - Hot reload automático ✅
```bash
# Apenas continue usando
npm run dev
```

### 🔵 Produção (Docker)
**SIM, precisa rebuild** para incluir os novos arquivos ⚠️
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 📋 Regras Gerais: Quando Fazer Rebuild

### 🔴 SEMPRE PRECISA REBUILD:

1. **Modificar `package.json`** (adicionar/remover dependências)
   ```bash
   npm install nova-biblioteca
   # → REBUILD necessário
   ```

2. **Modificar `Dockerfile`**
   ```dockerfile
   # Qualquer mudança no Dockerfile
   # → REBUILD necessário
   ```

3. **Modificar `docker-compose.yml` ou `docker-compose.prod.yml`** (build args, env vars)
   ```yaml
   # Mudanças em environment, args, build context
   # → REBUILD necessário
   ```

4. **Modificar arquivos na pasta `prisma/`** (schema, migrations)
   ```bash
   # Mudanças em schema.prisma ou migrations
   # → REBUILD necessário
   ```

5. **Modificar arquivos de configuração**:
   - `next.config.js`
   - `tsconfig.json`
   - `tailwind.config.ts`
   - `.env` (se usar build args)

### 🟢 NÃO PRECISA REBUILD (desenvolvimento):

1. **Modificar código fonte** (`.ts`, `.tsx`, `.js`, `.jsx`)
   - Hot reload automático em dev mode
   - Rebuild necessário apenas para produção

2. **Modificar arquivos de documentação** (`.md`)
   - Não afeta o build

3. **Modificar scripts** (`.sh`, `.sql`)
   - Não afeta o build

---

## 🎯 Nossa Implementação de Termos

### Arquivos Criados/Modificados:
```
✅ lib/check-pending-terms.ts          → Código fonte
✅ hooks/use-terms-enforcement.ts      → Código fonte
✅ components/terms-guard.tsx          → Código fonte
✅ app/page.tsx                        → Código fonte
✅ app/admin/layout.tsx                → Código fonte
✅ app/minha-saude/layout.tsx          → Código fonte
✅ *.md                                → Documentação
✅ *.sh, *.sql                         → Scripts
```

### Análise:
- ✅ Apenas código TypeScript/React
- ✅ Nenhuma dependência nova em `package.json`
- ✅ Nenhuma mudança em Docker files
- ✅ Nenhuma mudança em Prisma schema

### Conclusão:
- **DEV**: Não precisa nada, hot reload funciona ✅
- **PROD**: Precisa rebuild para incluir novos arquivos no build final ⚠️

---

## 🚀 Comandos por Ambiente

### Desenvolvimento Local (sem Docker)
```bash
# Apenas rodar normalmente
npm run dev

# Hot reload automático funciona para:
# - Código TypeScript/React
# - Componentes
# - Hooks
# - Páginas
```

### Desenvolvimento com Docker
```bash
# Iniciar serviços (postgres, redis)
docker compose up -d postgres redis

# Rodar app localmente (hot reload)
npm run dev
```

### Produção (Docker Completo)
```bash
# Rebuild e restart
docker compose -f docker-compose.prod.yml up -d --build

# Ou rebuild apenas do app
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d app
```

---

## 📊 Fluxo de Build (Produção)

### O que acontece no `docker build`:

```dockerfile
# 1. DEPS: Instala dependências (node_modules)
npm ci

# 2. BUILDER: Gera Prisma client + Build Next.js
npx prisma generate
npm run build
# → Gera pasta .next com código compilado

# 3. RUNNER: Copia arquivos para imagem final
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
# → AQUI os novos arquivos são incluídos
```

### Nossos Arquivos Novos:
- Fazem parte do `npm run build`
- São incluídos em `.next/`
- **Precisam de rebuild para produção**

---

## ⚡ Otimizações

### Cache de Build
O Docker usa cache de layers. Se você **só mudou código**:
```bash
# Build será mais rápido (cache de deps)
docker compose -f docker-compose.prod.yml build app

# Layers cacheadas:
# ✅ npm ci (não executa novamente)
# ✅ node_modules (reutiliza)
# 🔄 npm run build (executa novamente - necessário)
```

### Rebuild Parcial
```bash
# Rebuild apenas do serviço app (mais rápido)
docker compose -f docker-compose.prod.yml build app
docker compose -f docker-compose.prod.yml up -d app

# vs

# Rebuild de tudo (mais lento)
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🧪 Teste Rápido (Produção)

```bash
# 1. Rebuild
docker compose -f docker-compose.prod.yml build app

# 2. Restart
docker compose -f docker-compose.prod.yml up -d app

# 3. Verificar logs
docker logs healthcare-app -f

# 4. Testar
curl http://localhost:3000/api/terms/pending
```

---

## 📝 Checklist de Deploy

Antes de fazer rebuild em produção:

- [ ] Código testado em desenvolvimento (`npm run dev`)
- [ ] Sem erros de TypeScript (`npm run type-check`)
- [ ] Sem erros de lint (`npm run lint`)
- [ ] Migrations do Prisma aplicadas (`npm run db:migrate`)
- [ ] Variáveis de ambiente configuradas (`.env`)
- [ ] Backup do banco de dados feito

Então:
```bash
# Deploy em produção
docker compose -f docker-compose.prod.yml up -d --build

# Monitorar logs
docker logs healthcare-app -f

# Verificar saúde
docker ps
```

---

## 🎯 Resumo Final

| Mudança | Dev Local | Prod Docker |
|---------|-----------|-------------|
| Código TypeScript/React | 🟢 Hot reload | 🔵 Rebuild |
| Adicionar dependência | 🔴 `npm install` | 🔴 Rebuild |
| Modificar Dockerfile | N/A | 🔴 Rebuild |
| Modificar docker-compose | N/A | 🔴 Rebuild |
| Modificar .md/.sh | 🟢 Nada | 🟢 Nada |
| Modificar Prisma schema | 🔴 `npm run db:generate` | 🔴 Rebuild |

### Para Nossa Implementação:
- **Desenvolvimento**: 🟢 Continue usando `npm run dev` - funciona automaticamente
- **Produção**: 🔵 Execute `docker compose -f docker-compose.prod.yml up -d --build`

---

**Última atualização**: 16/01/2026

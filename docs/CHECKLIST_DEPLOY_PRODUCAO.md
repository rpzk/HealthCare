# Checklist: Deploy em Produção — Início Imediato

## Status geral

**Pronto para deploy** com alguns ajustes de ambiente e path.

---

## O que está pronto

| Item | Status |
|------|--------|
| Dockerfile | ✅ Completo (Node 22, Prisma, Puppeteer, Gotenberg deps) |
| docker-compose.prod.yml | ✅ Postgres, Redis, Gotenberg, STT, Ollama, TURN, App |
| Entrypoint | ✅ db push + prisma generate + production seed |
| Production seed | ✅ Admin, termos, branding, fixtures, RENAME → Medication |
| API de health | ✅ `/api/health` (DB, Gotenberg, Redis) |
| Fixtures RENAME | ✅ `dcb-medicamentos-2025.json` presente |
| Migrações | ✅ Medication unificada, schema consistente |

---

## O que precisa ser feito antes do primeiro deploy

### 1. Variáveis obrigatórias

Crie `.env` (ou configure no host) com:

```bash
# Obrigatórias
POSTGRES_PASSWORD=<senha_forte>
NEXTAUTH_SECRET=<openssl rand -base64 32>
ENCRYPTION_KEY=<32 chars hex>
NEXTAUTH_URL=https://seu-dominio.com   # ou http://IP:3000 para testes

# IA (escolha uma)
AI_PROVIDER=groq
GROQ_API_KEY=<sua_chave>
# ou
AI_PROVIDER=ollama
# (Ollama roda no container, sem chave)
```

### 2. Path de backups (umbrel vs outros)

O `docker-compose.prod.yml` usa:

```yaml
volumes:
  - /home/umbrel/backups/healthcare:/app/backups
```

- **Se for Umbrel:** Crie `mkdir -p /home/umbrel/backups/healthcare`
- **Se for outro servidor:** Ajuste o volume no compose, ex.:

  ```yaml
  - ${BACKUPS_PATH:-./backups}:/app/backups
  ```

  E crie o diretório local antes de subir.

### 3. Primeiro acesso

Após o primeiro start:

1. Acesse `NEXTAUTH_URL`
2. Login: `admin@healthcare.com` / `admin123`
3. **Troque a senha imediatamente** (perfil ou reset)
4. Configure o **Branding** em Admin (nome da clínica, endereço) para documentos

---

## Serviços que o healthcheck exige

O `/api/health` retorna 503 se falhar:

- **DB** — Postgres conectado
- **Gotenberg** — Para geração de PDFs (prescrições, etc.)

Redis e Ollama podem estar degradados sem derrubar o health.

---

## Seed pesado (CID, CBO, SIGTAP)

Por padrão, o seed importa CID-10, CBO e SIGTAP (várias dezenas de milhares de registros). Na primeira subida isso pode levar vários minutos.

Para começar mais rápido:

```bash
PRODUCTION_SEED_SKIP_HEAVY=1
```

O sistema sobe com medicamentos RENAME, termos, branding e documentos, mas sem CID/CBO/SIGTAP. Você pode rodar depois:

```bash
docker compose -f docker-compose.prod.yml exec app npx tsx scripts/production-seed.ts --force-heavy
```

---

## Comando para subir

```bash
# 1. Ajuste o volume de backups no docker-compose.prod.yml se necessário
# 2. Crie .env com as variáveis acima
# 3. Suba
docker compose -f docker-compose.prod.yml up -d

# 4. Acompanhe os logs (seed pode demorar)
docker compose -f docker-compose.prod.yml logs -f app
```

---

## Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Path `/home/umbrel/...` não existe | Ajuste o volume no compose antes de subir |
| Seed RENAME falha (arquivo ausente) | Fixture `dcb-medicamentos-2025.json` está no projeto |
| Gotenberg fora do ar | Health 503; prescrições em PDF podem falhar |
| Senha admin padrão | Trocar no primeiro acesso |
| SMTP não configurado | Emails não saem; cadastro e agendamento continuam funcionando |

---

## Conclusão

Para **início imediato** em produção:

1. Configure `.env` com `POSTGRES_PASSWORD`, `NEXTAUTH_SECRET`, `ENCRYPTION_KEY`, `NEXTAUTH_URL`
2. Ajuste o volume de backups se não for ambiente Umbrel
3. Rode `docker compose -f docker-compose.prod.yml up -d`
4. Aguarde o seed (ou use `PRODUCTION_SEED_SKIP_HEAVY=1` para subir mais rápido)
5. Acesse, faça login e troque a senha do admin

O sistema está funcional para **clínicas particulares** e **atendimento médico individual** com prontuário, prescrições, exames, agenda e portal do paciente.

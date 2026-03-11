# Guia de Deploy - HealthCare

## Fluxo de produção

### 1. Build e migrações

```bash
# Build da aplicação
npm run build

# Em Docker, o entrypoint executa:
# - prisma db push (sincroniza schema)
# - prisma generate
# - production seed (se PRODUCTION_SEED=1)
```

### 2. Production Seed (fixtures e dados mestres)

Na primeira inicialização, com `PRODUCTION_SEED=1` (padrão em prod), o container executa:

1. **Admin e usuários base** – `db:seed`
2. **Termos e configurações** – termos de uso, system-settings
3. **Branding** – identidade da clínica (nome, endereço) para documentos
4. **Fixtures adicionais** – document-templates, CIAP2, exam-catalog, formula-templates
5. **RENAME medicamentos** – importação direta em Medication (tabela unificada)
6. **CID, CBO, SIGTAP** – apenas se banco vazio (evita violar FKs)

#### Variáveis de ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PRODUCTION_SEED` | `1` | Ativa seed na inicialização |
| `PRODUCTION_SEED_SKIP_HEAVY` | `0` | `1` = pula CID/CBO/SIGTAP (início mais rápido) |

#### Execução manual

```bash
# Seed completo (dentro do container)
docker compose -f docker-compose.prod.yml exec app npm run db:seed:production

# Sem imports pesados (CID/CBO/SIGTAP)
docker compose -f docker-compose.prod.yml exec app npx tsx scripts/production-seed.ts --skip-heavy

# Forçar CID/CBO/SIGTAP mesmo com dados existentes
docker compose -f docker-compose.prod.yml exec app npx tsx scripts/production-seed.ts --force-heavy
```

### 3. Consistência dos fixtures

- **Termos**: `fixtures/terms.json` → Term
- **Settings**: `fixtures/system-settings.json` → SystemSetting
- **Documentos**: `fixtures/document-templates.json` → DocumentTemplate
- **CIAP2**: `fixtures/01-master-data/ciap2/` → CIAP2
- **Exames**: `fixtures/01-master-data/exams/` → ExamCatalog
- **Fórmulas**: `fixtures/01-master-data/formulas/` → FormulaTemplate
- **RENAME/Medication**: `fixtures/01-master-data/dcb-medicamentos-2025.json` → Medication (tabela unificada)
- **CID/CBO/SIGTAP**: `fixtures/01-master-data/{cid10,cbo,sigtap}/`

Os fixtures são incluídos na imagem Docker. Os scripts usam `process.cwd()` para localizar os arquivos.

### 4. Banco já populado

Se o banco já tiver diagnósticos/medical codes, o seed não tenta reimportar CID/CBO/SIGTAP (evita erro de FK). Use `--force-heavy` apenas em banco limpo ou após backup.

### 5. Migrate vs db push

O entrypoint usa `prisma db push`. Para migrações versionadas em produção:

```bash
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### 6. Upgrade: RENAMEMedication → Medication (instalações antigas)

Se a instalação já possui a tabela `rename_medications`:

1. Aplicar migração que adiciona campos em Medication
2. Executar script de migração de dados
3. Aplicar migração que remove RENAMEMedication

```bash
# 1. Migrações
npx prisma migrate deploy

# 2. Migração de dados (entre as duas migrações, se necessário)
npx tsx scripts/migrate-rename-to-medication.ts

# 3. A migração 20260315000001 remove a tabela
```

## Checklist pré-deploy

- [ ] `DATABASE_URL` configurado
- [ ] `NEXTAUTH_SECRET` e `ENCRYPTION_KEY` definidos
- [ ] Fixtures presentes em `fixtures/`
- [ ] Volume de backup montado (ex.: `/app/backups`)
- [ ] `PRODUCTION_SEED=1` para primeiro deploy

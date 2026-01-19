# Scripts do HealthCare

Referência dos scripts mantidos no projeto após consolidação (Janeiro 2026).

## 🔧 Deployment & Produção
- `deploy-production.sh` - Deploy completo em produção
- `prepare-production.sh` - Preparação pré-deploy
- `post-deployment-check.sh` - Validação pós-deploy
- `production-deployment-checklist.sh` - Checklist de deploy
- `docker-entrypoint.sh` - Entry point do container Docker
- `first-start.sh` - Inicialização do sistema

## 💾 Backup & Restore
- `healthcare-backup.sh` - Backup completo (DB + configs)
- `healthcare-restore.sh` - Restore de backups
- `setup-auto-backup.sh` - Configurar backup automático
- `setup-systemd-backup.sh` - Configurar backup via systemd

## 🗄️ Database & Migrations
- `migrate-safe.sh` - Migrações seguras com backup automático
- `pre-migration-validation.ts` - Validação pré-migração
- `post-migration-validation.ts` - Validação pós-migração
- `reset-with-seed.ts` - Reset DB com dados iniciais

## 👤 Admin & Usuários
- `setup-admin.ts` - Criar/configurar usuário admin
- `createsuperuser.js` - Criar superusuário alternativo
- `hash-passwords.ts` - Utilitário para hash de senhas

## 📊 Seeds & Data Import
- `seed-modules.ts` - Popular módulos do sistema
- `seed-system-settings.ts` - Configurações do sistema
- `seed-terms.ts` - Termos de uso e políticas
- `seed-territories.ts` - Dados geográficos/territórios
- `seed-ciap2.ts` - Códigos CIAP2
- `seed-questionnaire-templates.ts` - Templates de questionários
- `seed-reading-thresholds.ts` - Limiares de leitura
- `import-cbo.ts` - Importar CBO (Classificação Brasileira de Ocupações)
- `import-codes-csv.ts` - Importar códigos via CSV
- `import-formulas.ts` - Importar fórmulas médicas
- `import-medications.ts` - Importar medicamentos
- `import-patients.ts` - Importar pacientes
- `export-master-data.ts` - Exportar dados mestre
- `populate-geographic-data.ts` - Popular dados geográficos
- `normalize-patient-names.ts` - Normalizar nomes de pacientes

## 🔍 Monitoring & Health
- `monitor.sh` - Monitoramento contínuo
- `health-check.sh` - Health check do sistema
- `check-turn-health.sh` - Verificar servidor TURN (WebRTC)
- `check-endpoints.mjs` - Testar endpoints da API
- `check-terms-config.ts` - Validar configuração de termos

## 🧪 Testing
- `test-api-endpoints.js` - Testes de API
- `test-integration-system.sh` - Testes de integração
- `test-telemedicine.sh` - Testes de telemedicina
- `ci-local.sh` - CI local

## 🛠️ Utilities
- `worker-ai-queue.ts` - Worker de fila AI/BullMQ
- `purge-old-audit-logs.ts` - Limpar logs antigos
- `maintenance.sh` - Tarefas de manutenção
- `create-professional.sh` - Criar perfil profissional
- `generate-pwa-icons.js` - Gerar ícones PWA
- `start-with-ollama.sh` - Iniciar com Ollama (IA local)
- `install-coturn.sh` - Instalar servidor TURN

## 📁 External Data
- `download-cbo-govbr.ps1` - Download CBO do gov.br (PowerShell)
- `fetch-raw.ts` - Fetch dados externos
- `run-icd11-fetch.ts` - Fetch ICD-11

## 📂 Arquivados
- `archive/` - Scripts legados mantidos por referência histórica

## 🗑️ Removidos (Janeiro 2026)
Scripts duplicados/obsoletos removidos:
- `backup-db.sh`, `backup-local.sh`, `backup-cron.sh`, `backup-complete.sh`, `backup-database.sh`
- `restore-local.sh`, `restore-database.sh`
- `debug-admin-issue.ts`, `fix-admin-roles.ts`, `delete-test-admin.ts`, `verify-admin.ts`
- `hash-passwords.js` (mantida versão .ts)
- `cleanup-now.sh`, `cleanup-robust.sh`, `production-cleanup.sh`
- `check-mock-data.sh`, `test-backup-gdrive.sh`, `test-certificates-flow.sh`, `test-signature-flow.sh`

## 📌 Uso Comum

### Setup inicial do admin
```bash
npx tsx scripts/setup-admin.ts
```

### Backup manual
```bash
./scripts/healthcare-backup.sh
```

### Migração segura
```bash
./scripts/migrate-safe.sh
```

### Seed completo
```bash
npx tsx scripts/reset-with-seed.ts
```

### Deploy em produção
```bash
./scripts/deploy-production.sh
```

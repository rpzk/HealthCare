# Backups do sistema (estado atual)

Este documento descreve **o que existe no repositório hoje**, sem promessas de “100%”, “garantido”, “tempo de recuperação” ou “risco 0%”.

Para uma visão mais completa (e alinhada ao que foi implementado recentemente), use: [BACKUP_GUARANTEE_ALL_DOCUMENTS.md](BACKUP_GUARANTEE_ALL_DOCUMENTS.md).

## O que existe (implementado)

### Backup do banco de dados (PostgreSQL)

- Script principal (usado pelas rotas/admin): [scripts/backup-complete.sh](scripts/backup-complete.sh)
- Mecanismo: `pg_dump` + `gzip` usando variáveis de ambiente (ex.: `DATABASE_URL` ou `POSTGRES_*`)
- Diretório de saída: definido por `BACKUPS_DIR` (em produção, normalmente `/app/backups`, com bind mount no host)
- Arquivos gerados: `healthcare_<timestamp>.sql.gz` + `manifest_<timestamp>.json` + `status_<timestamp>.json` (e logs)

### Backup de configurações/arquivos (best-effort)

O mesmo fluxo pode gerar tarballs auxiliares (ex.: configs/certificados), mas isso é **dependente de paths existentes** e do ambiente onde o script roda.

## O que NÃO é garantido por este documento

- **Agendamento automático**: depende de configurar systemd/cron na máquina/ambiente.
- **Cobertura de arquivos fora do banco**: anexos em filesystem (ex.: `uploads/`) só serão protegidos se você incluir esse diretório na estratégia de backup.
- **Restauração “sem perda”**: restore é um procedimento operacional; precisa ser testado e validado no seu ambiente.

## Restore (implementado)

- Script: [scripts/restore-database.sh](scripts/restore-database.sh)
- Restaura a partir de um arquivo `healthcare_<timestamp>.sql.gz`.

## Como usar (alto nível)

- UI/Admin: Settings → Backups
- API: `POST /api/admin/backups` (criar) e `POST /api/admin/backups/restore` (restaurar)

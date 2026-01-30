# Backup Guide

Este documento reúne todos os procedimentos, scripts e recomendações para backup e restauração do sistema HealthCare.

## Estratégia de Backup
- Backup do banco de dados PostgreSQL usando pg_dump + gzip
- Proteção de arquivos anexos (diretório uploads/)
- Agendamento automático via cron/systemd

## Scripts Utilizados
- scripts/healthcare-backup.sh
- scripts/backup-db.sh
- scripts/restore-database.sh

## Restore
- Restauração a partir de arquivos .sql.gz
- Recomenda-se testar restore em ambiente de homologação

## Troubleshooting
- Verifique logs dos scripts
- Confirme variáveis de ambiente (DATABASE_URL, BACKUPS_DIR)
- Consulte documentação dos scripts para detalhes

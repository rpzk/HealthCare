# Sistema de Backup Automatizado

## Estratégia 3-2-1

- **3 cópias** dos dados (original + 2 backups)
- **2 mídias** diferentes (local + cloud)
- **1 cópia offsite** (Google Drive/S3)

## Componentes

### 1. Backup PostgreSQL
- Dump completo com compressão (`pg_dump -F c`)
- Diário às 3h AM
- Formato: `db_backup_YYYY-MM-DD_HH-MM-SS.dump`

### 2. Backup Arquivos
- Compressão tar.gz do diretório `/uploads`
- Incluí: prontuários, exames, gravações telemedicina
- Formato: `files_backup_YYYY-MM-DD_HH-MM-SS.tar.gz`

### 3. Upload Cloud
- **AWS S3**: Armazenamento primário offsite
- **Google Drive**: Redundância adicional
- Upload automático após cada backup

### 4. Rotação Automática
- Manter últimos **30 dias** de backups locais
- Manter **90 dias** no S3 (configurar lifecycle policy)
- Backups mensais: manter 12 meses

### 5. Teste de Restore
- **Mensal automático**: Primeiro domingo do mês, 2h AM
- Cria database temporário
- Restaura backup mais recente
- Valida integridade com queries
- Remove database de teste
- Envia alerta se falhar

## Configuração

### Variáveis de Ambiente

```bash
# .env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=healthcare
POSTGRES_PASSWORD=senha_segura
POSTGRES_DB=healthcare_db

BACKUP_DIR=/var/backups/healthcare
UPLOADS_DIR=/home/umbrel/HealthCare/uploads
RETENTION_DAYS=30

# AWS S3 (opcional)
S3_BACKUP_BUCKET=healthcare-backups
S3_BACKUP_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# Google Drive (opcional)
GOOGLE_CREDENTIALS={"type":"service_account",...}
GOOGLE_DRIVE_BACKUP_FOLDER=1XYZ...

# Notificações
BACKUP_NOTIFICATION_EMAIL=admin@clinica.com.br
```

### Crontab

```bash
# Editar crontab
crontab -e

# Adicionar linha:
0 3 * * * /home/umbrel/HealthCare/scripts/backup-cron.sh >> /var/log/healthcare-backup.log 2>&1
```

### Docker (alternativa)

```yaml
# docker-compose.yml
services:
  backup:
    image: postgres:16
    volumes:
      - ./backups:/backups
      - ./scripts:/scripts
      - ./uploads:/uploads
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_USER=healthcare
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
      - POSTGRES_DB=healthcare_db
    command: >
      sh -c "
        apk add --no-cache aws-cli &&
        crond -f -l 2
      "
    restart: unless-stopped
```

## Restore Manual

### Database

```bash
# Listar backups
ls -lh /var/backups/healthcare/db_backup_*.dump

# Restore
PGPASSWORD=senha_segura pg_restore \
  -h localhost \
  -p 5432 \
  -U healthcare \
  -d healthcare_db \
  --clean \
  --if-exists \
  /var/backups/healthcare/db_backup_2024-01-15_03-00-00.dump
```

### Arquivos

```bash
# Extrair
tar -xzf /var/backups/healthcare/files_backup_2024-01-15_03-00-00.tar.gz -C /home/umbrel/HealthCare/uploads
```

### Download do S3

```bash
# Listar backups no S3
aws s3 ls s3://healthcare-backups/backups/

# Download
aws s3 cp s3://healthcare-backups/backups/db_backup_2024-01-15_03-00-00.dump ./
```

## Monitoramento

### Verificar Último Backup

```bash
# Via API (Next.js)
curl -H "Authorization: Bearer $TOKEN" https://clinica.com.br/api/backup/status

# Via filesystem
ls -lht /var/backups/healthcare/ | head -5
```

### Logs

```bash
# Cron logs
tail -f /var/log/healthcare-backup.log

# System logs
journalctl -u healthcare-backup -f
```

## Disaster Recovery

### Cenário 1: Perda de Database
1. Parar aplicação
2. Restaurar último backup do database
3. Validar integridade
4. Reiniciar aplicação

**RTO**: 15 minutos  
**RPO**: 24 horas (último backup diário)

### Cenário 2: Perda de Arquivos
1. Baixar backup de arquivos do S3
2. Extrair para `/uploads`
3. Ajustar permissões

**RTO**: 30 minutos  
**RPO**: 24 horas

### Cenário 3: Perda Total do Servidor
1. Provisionar novo servidor
2. Instalar Docker + PostgreSQL
3. Restaurar database do S3
4. Restaurar arquivos do S3
5. Deploy da aplicação
6. Validar funcionamento

**RTO**: 2 horas  
**RPO**: 24 horas

## Checklist de Produção

- [ ] Configurar variáveis de ambiente
- [ ] Criar bucket S3 com lifecycle policy
- [ ] Configurar Google Drive service account
- [ ] Testar backup manual
- [ ] Testar restore manual
- [ ] Configurar crontab
- [ ] Validar primeiro backup automático
- [ ] Configurar alertas (email/Slack)
- [ ] Documentar RTO/RPO para equipe
- [ ] Simular disaster recovery (quarterly)

## Custos Estimados

- **AWS S3**: ~R$ 50/mês (100GB, acesso infrequente)
- **Google Drive Business**: R$ 30/mês (2TB)
- **Total**: ~R$ 80/mês

## Compliance

- ✅ **LGPD**: Backups criptografados (S3 SSE-AES256)
- ✅ **CFM**: Retenção de 20 anos (ajustar lifecycle)
- ✅ **ISO 27001**: Teste de restore documentado
- ✅ **Auditoria**: Logs de todos os backups/restores

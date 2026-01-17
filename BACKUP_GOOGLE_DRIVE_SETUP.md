# 🔐 Configurar Backup Automático para Google Drive

O sistema de backup já suporta envio automático para Google Drive via **Service Account**. Siga os passos abaixo para ativar.

## 📋 Pré-requisitos

- Uma conta Google (pessoal ou de empresa)
- Acesso ao [Google Cloud Console](https://console.cloud.google.com)
- Uma pasta no Google Drive para armazenar backups
- `rclone` (já instalado no container)

## 🚀 Passo a Passo

### 1️⃣ Criar Service Account no Google Cloud

```bash
# 1. Vá para: https://console.cloud.google.com/iam-admin/serviceaccounts
# 2. Selecione ou crie um projeto
# 3. Clique em "Criar conta de serviço"
# 4. Preencha:
#    - Nome: "healthcare-backup"
#    - ID: "healthcare-backup"
#    - Descrição: "Backup automático do HealthCare"
# 5. Clique em "Continuar"
```

### 2️⃣ Atribuir Função

```bash
# 1. Na seção "Conceder acesso ao projeto", selecione "Editor"
# 2. Clique em "Continuar" e depois "Concluído"
```

### 3️⃣ Criar Chave JSON

```bash
# 1. Na lista de contas de serviço, abra "healthcare-backup"
# 2. Vá para a guia "Chaves"
# 3. Clique em "Adicionar chave" > "Criar nova chave"
# 4. Selecione formato "JSON"
# 5. Clique em "Criar"
# 6. O arquivo JSON será baixado automaticamente
```

### 4️⃣ Salvar a Chave no Projeto

```bash
# Salve o arquivo JSON baixado em:
# ./scripts/google-drive-key.json
```

### 5️⃣ Criar Pasta no Google Drive

```bash
# 1. Abra https://drive.google.com
# 2. Clique em "+ Nova pasta"
# 3. Nomeie como "HealthCare Backups" (ou similar)
# 4. Abra a pasta
# 5. Na URL, encontre o ID (exemplo):
#    https://drive.google.com/drive/folders/1ABC-XYZ-123...
#    ↑ O que vem após "/folders/" é o FOLDER_ID
```

### 6️⃣ Compartilhar Pasta com Service Account

```bash
# 1. Na pasta do Google Drive, clique em "Compartilhar"
# 2. Cole o email da service account (encontrado no JSON):
#    healthcare-backup@PROJECT_ID.iam.gserviceaccount.com
# 3. Selecione "Editor"
# 4. Clique em "Compartilhar"
```

### 7️⃣ Executar Script de Setup Automático

```bash
# Na raiz do projeto:
./scripts/setup-google-drive-backup.sh
```

O script vai:
- ✅ Validar o arquivo JSON
- ✅ Extrair o email da service account
- ✅ Pedir para você informar o FOLDER_ID
- ✅ Atualizar automaticamente o `.env`
- ✅ Compactar o JSON para uma única linha

## ✅ Testar a Configuração

Após completar o setup, teste se tudo está funcionando:

```bash
# Reconstruir o container
docker compose -f docker-compose.prod.yml up -d --build

# Executar backup manualmente
docker compose -f docker-compose.prod.yml exec app \
  bash /app/scripts/backup-complete.sh
```

Você deve ver na saída:
```
[1/5] Fazendo backup do banco de dados PostgreSQL...
[2/4] Fazendo backup de configurações críticas...
[3/4] Fazendo backup de certificados digitais...
[4/4] Validando e gerando resumo...
[5/5] Enviando backups para Google Drive...
✅ Backup enviado para Google Drive
```

## 📊 Verificar Backups no Google Drive

```bash
# Abra a pasta no Google Drive
# Você verá os arquivos:
# - healthcare_TIMESTAMP.sql.gz (banco de dados)
# - config_TIMESTAMP.tar.gz (configurações)
# - certs_TIMESTAMP.tar.gz (certificados digitais)
# - manifest_TIMESTAMP.json (informações do backup)
# - backup_TIMESTAMP.log (log da execução)
```

## ⏰ Automatizar Backup Diário

Para executar o backup automaticamente a cada dia às 2 AM:

### Opção 1: Usando Cron (Recommended)

```bash
# Editar crontab
crontab -e

# Adicionar linha (0 2 = 2 AM todos os dias)
0 2 * * * docker compose -f /opt/healthcare/docker-compose.prod.yml exec app bash /app/scripts/backup-complete.sh >> /var/log/healthcare-backup.log 2>&1
```

### Opção 2: Usando Docker Compose Health Check

O `docker-compose.prod.yml` pode incluir um health check que executa backups:

```yaml
services:
  app:
    healthcheck:
      test: ["CMD", "bash", "-c", "[ -f /tmp/backup-check ] && rm /tmp/backup-check || bash /app/scripts/backup-complete.sh"]
      interval: 86400s  # 24 horas
      timeout: 3600s    # 1 hora
      retries: 1
```

## 🔍 Troubleshooting

### "rclone não instalado"
O container deve ter `rclone` instalado. Verifique o Dockerfile - já vem incluso.

### "Credenciais do Google Drive inválidas"
- Verifique o arquivo JSON
- Confirme que a pasta foi compartilhada com o email da service account
- Verifique que o projeto tem acesso à Google Drive API

### "GDRIVE_FOLDER_ID não foi fornecido"
O backup será feito localmente em `/app/backups/healthcare/`, mas não será enviado para Drive.
Execute `./scripts/setup-google-drive-backup.sh` novamente e forneça o ID.

### Upload lento ou falha
O script tenta fazer upload com:
```
--transfers=2 --checkers=4 --fast-list
```
Se estiver muito lento, você pode ajustar em [backup-complete.sh](scripts/backup-complete.sh) linha 277.

## 📁 Estrutura dos Backups

```
/app/backups/healthcare/
├── healthcare_20250117120000.sql.gz         # Banco PostgreSQL
├── config_20250117120000.tar.gz             # Configurações (.env, docker-compose, etc)
├── certs_20250117120000.tar.gz              # Certificados digitais
├── manifest_20250117120000.json             # Metadados e estatísticas
└── backup_20250117120000.log                # Log detalhado
```

## 🔐 Segurança

- ✅ Arquivo JSON NUNCA é commitado (adicione à `.gitignore`)
- ✅ Dados sensíveis (.env) não são expostos (mantidos criptografados em `.env.metadata`)
- ✅ Certificados digitais são protegidos
- ✅ Backups locais são mantidos por 7 dias apenas
- ✅ Google Drive oferece controle de acesso fino

## 📞 Suporte

Para dúvidas sobre o Google Cloud Console:
- [Documentação Google Cloud](https://cloud.google.com/docs)
- [Guia Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [rclone Google Drive](https://rclone.org/drive/)

Para dúvidas sobre o HealthCare:
- Veja [DATABASE_BACKUP_PROCEDURE.md](DATABASE_BACKUP_PROCEDURE.md)
- Veja [scripts/backup-complete.sh](scripts/backup-complete.sh)

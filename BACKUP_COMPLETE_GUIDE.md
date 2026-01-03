# 🔐 Backup Completo - Configurações Críticas

## 📋 O que é Protegido

O novo sistema de backup **COMPLETO** (backup-complete.sh) protege TUDO que é crítico:

### 1️⃣ **Banco de Dados PostgreSQL** (healthcare_TIMESTAMP.sql.gz)
```sql
✅ Tabelas de negócio:
   - Pacientes, usuários, profissionais
   - Consultas, agendamentos, prescrições
   - Exames, receitas, formulários
   - Questionários respondidos

✅ Configurações no banco (tabela SystemSetting):
   - SMTP_HOST, SMTP_PORT, SMTP_USER
   - EMAIL_ENABLED, EMAIL_PROVIDER
   - Chaves de criptografia
   - URLs do sistema
   - Configurações de segurança

✅ Certificados digitais:
   - Metadados de A1/A3/A4
   - Referências a arquivos .pfx
   - Hashes de senhas
   - Datas de validade
```

### 2️⃣ **Configurações Críticas** (config_TIMESTAMP.tar.gz)
```
.env (variáveis de ambiente)
├── DATABASE_URL
├── ENCRYPTION_KEY
├── HASH_SALT
├── NEXTAUTH_SECRET
├── NEXTAUTH_URL
├── EMAIL_* (se definido)
├── SMTP_* (se definido)
├── REDIS_HOST, REDIS_PORT
├── STORAGE_TYPE
├── RECORDING_ENCRYPTION_KEY
└── ... (todas as variáveis críticas)

docker-compose.yml (configuração de serviços)
├── PostgreSQL (versão, porta, settings)
├── Redis (configuração)
├── Ollama (modelo, URL)
└── Outros serviços

prisma/schema.prisma (estrutura do banco)
└── Importante para manter estrutura consistente

next.config.js (configuração Next.js)
├── Compressão
├── Headers de segurança
├── Variáveis públicas
└── ...

tsconfig.json (configuração TypeScript)

data/settings.json (fallback de configurações)
└── Se banco não está acessível
```

### 3️⃣ **Certificados Digitais** (certs_TIMESTAMP.tar.gz)
```
A1 Certificados:
  ├── arquivo.pfx (chave privada + certificado)
  ├── senha criptografada
  └── metadata no banco

A3/A4 Tokens:
  ├── referências de seriais
  ├── issuer, subject
  └── datas de validade
```

### 4️⃣ **Manifest com Metadados** (manifest_TIMESTAMP.json)
```json
{
  "timestamp": "ISO-8601",
  "database_statistics": {
    "patients": 150,
    "users": 25,
    "consultations": 500,
    "digital_certificates": 5,
    "system_settings": 42
  },
  "files_included": [
    "healthcare_*.sql.gz",
    "config_*.tar.gz",
    "certs_*.tar.gz",
    "backup_*.log"
  ]
}
```

---

## 🚨 Configurações Críticas (Não Perder!)

### 🔑 Segurança
```
ENCRYPTION_KEY
└─ Sem isso: dados criptografados inacessíveis

HASH_SALT
└─ Sem isso: CPFs/documentos não validam

NEXTAUTH_SECRET
└─ Sem isso: sessões inválidas, logout forçado

NEXTAUTH_URL
└─ Sem isso: autenticação não funciona
```

### 📧 Email/SMTP
```
SMTP_HOST
SMTP_PORT
SMTP_USER
SMTP_PASS
EMAIL_FROM
└─ Sem isso: nenhum email será enviado
   (notificações, lembretes, resultados)
```

### 🗄️ Banco de Dados
```
DATABASE_URL
└─ Sem isso: aplicação não conecta

system_settings.SMTP_*
└─ Configurações de email salvas no banco
   Se não fizer backup, perde configuração
```

### 💾 Storage
```
STORAGE_TYPE (local/s3/minio)
LOCAL_STORAGE_PATH
RECORDING_ENCRYPTION_KEY
└─ Sem isso: vídeos de telemedicina inacessíveis
```

### 🔴 Redis
```
REDIS_HOST
REDIS_PORT
REDIS_PASSWORD
└─ Sem isso: rate limiting não funciona
   sessões podem ser perdidas
```

---

## 📊 Comparativo: Antes vs Depois

### ❌ ANTES (apenas DB)
```
Backup:
  ✅ Dados de pacientes
  ✅ Histórico de consultas
  ❌ Configuração SMTP (necessário reconfigure)
  ❌ Variáveis .env (necessário recopiar)
  ❌ Docker-compose (necessário refazer)
  ❌ Certificados .pfx (perdidos!)

Resultado: Sistema inutilizável! Precisa reconfigurar tudo.
```

### ✅ DEPOIS (backup-complete.sh)
```
Backup:
  ✅ Dados de pacientes
  ✅ Histórico de consultas
  ✅ Configuração SMTP (salva!)
  ✅ Variáveis .env (salvas!)
  ✅ Docker-compose (salvo!)
  ✅ Certificados .pfx (salvos!)
  ✅ Metadata do Prisma (salvo!)
  ✅ SystemSettings do banco (salvo!)

Resultado: Sistema 100% funcional! Restaura e já funciona.
```

---

## 🔄 Fluxo de Backup Completo

```
1. PostgreSQL Dump
   └─ healthcare_YYYYMMDDHHMMSS.sql.gz
      └─ Inclui: dados + schema + triggers + indices

2. Configurações
   └─ config_YYYYMMDDHHMMSS.tar.gz
      ├─ .env (todas as variáveis)
      ├─ docker-compose*.yml
      ├─ prisma/schema.prisma
      ├─ next.config.js
      ├─ tsconfig.json
      └─ data/settings.json (fallback)

3. Certificados Digitais
   └─ certs_YYYYMMDDHHMMSS.tar.gz
      ├─ /home/umbrel/certs/*.pfx
      ├─ /home/umbrel/HealthCare/certs/*.pfx
      ├─ /etc/healthcare/certs/*.pfx
      └─ /var/healthcare/certs/*.pfx

4. Metadata & Log
   ├─ manifest_YYYYMMDDHHMMSS.json
   │  └─ Estatísticas e lista de arquivos
   └─ backup_YYYYMMDDHHMMSS.log
      └─ Rastreamento completo do backup
```

---

## 📥 Restauração (Completa)

### Passo 1: Restaurar Banco
```bash
gunzip < healthcare_20250125143022.sql.gz | \
  psql -h localhost -U healthcare -d healthcare_db
```

### Passo 2: Restaurar Configurações
```bash
tar xzf config_20250125143022.tar.gz -C /home/umbrel/HealthCare/

# Agora você tem:
# - .env (com SMTP_HOST, EMAIL_*, etc)
# - docker-compose.yml (com services)
# - prisma/schema.prisma (com schema completo)
```

### Passo 3: Restaurar Certificados
```bash
tar xzf certs_20250125143022.tar.gz -C /home/umbrel/certs/

# A1/A3/A4 certificados restaurados
```

### Passo 4: Reiniciar Serviços
```bash
docker-compose restart  # Pega nova config
npm run dev             # Reinicia com novo .env
```

**Resultado:** Sistema 100% funcional! 🎉

---

## 📊 Checklist de Configurações Críticas

### ✅ Antes de Restaurar Backup, Validar:

```
Database:
  [ ] DATABASE_URL está correto
  [ ] PostgreSQL está rodando
  [ ] Credenciais corretas

Email/SMTP:
  [ ] SMTP_HOST está correto
  [ ] SMTP_USER/PASS está correto
  [ ] EMAIL_FROM está válido
  
Segurança:
  [ ] ENCRYPTION_KEY foi restaurado
  [ ] NEXTAUTH_SECRET foi restaurado
  [ ] HASH_SALT foi restaurado
  
Storage:
  [ ] LOCAL_STORAGE_PATH existe
  [ ] Permissões corretas (755)
  [ ] Espaço em disco suficiente
  
Certificados:
  [ ] .pfx files existem
  [ ] Permissões corretas (400)
  [ ] Senhas criptografadas
  
Services:
  [ ] Docker está rodando
  [ ] PostgreSQL acessível
  [ ] Redis acessível (se usado)
```

---

## 🔧 Como Usar o Novo Backup

### Interface Web (Admin)
```
Configurações → Backups → "Criar Backup Manual Agora"

Agora inclui:
  ✅ Banco de dados
  ✅ Configurações (.env, docker-compose, etc)
  ✅ Certificados digitais
  ✅ Manifest com metadados
```

### Via Terminal
```bash
bash /home/umbrel/HealthCare/scripts/backup-complete.sh

Cria:
  - healthcare_TIMESTAMP.sql.gz (DB)
  - config_TIMESTAMP.tar.gz (Configs)
  - certs_TIMESTAMP.tar.gz (Certs)
  - manifest_TIMESTAMP.json (Metadata)
  - backup_TIMESTAMP.log (Log)
```

### Automático (Systemd)
```bash
# Já configurado para rodar 02:00 AM diariamente
# Usa backup-complete.sh automaticamente

sudo systemctl status healthcare-backup.timer
```

---

## ⚠️ Configurações Sensíveis

Essas configurações são **críticas** e devem ser SEMPRE incluídas no backup:

| Configuração | Impacto se Perdida |
|---|---|
| ENCRYPTION_KEY | Dados criptografados inacessíveis |
| SMTP_HOST | Sem envio de emails |
| DATABASE_URL | Sem conexão com banco |
| NEXTAUTH_SECRET | Logout de todos os usuários |
| Certificados .pfx | Sem assinatura digital |
| REDIS_CREDENTIALS | Sessões perdidas |
| RECORDING_ENCRYPTION_KEY | Vídeos inacessíveis |

---

## ✨ Benefícios da Nova Abordagem

```
ANTES:
  Backup = Dados apenas
  Restauração = Horas de reconfiguração
  Risco = MUITO ALTO (configs perdidas)

DEPOIS:
  Backup = Dados + Config + Certificados
  Restauração = Imediata (tudo salvo)
  Risco = BAIXO (tudo protegido)
```

---

## 📞 Suporte

Dúvidas sobre configurações críticas?

1. Consulte `manifest_TIMESTAMP.json` (metadados do backup)
2. Veja `backup_TIMESTAMP.log` (o que foi feito)
3. Leia `DATABASE_BACKUP_PROCEDURE.md` (procedimentos)
4. Confira `.env.metadata` no backup (o que tem)

---

**Última atualização:** 2025-01-25
**Status:** ✅ Backup COMPLETO implementado

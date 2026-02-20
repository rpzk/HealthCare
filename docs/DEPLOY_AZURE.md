# Guia de Deploy Azure - HealthCare System

## Passo a Passo: Deploy Completo no Azure

### Pré-requisitos
- Conta Azure ativa
- Azure CLI instalado (`az` command)
- Git
- Conhecimentos básicos de Docker

---

## 1. Preparação Inicial

### 1.1 Instalar Azure CLI

```bash
# Ubuntu/Debian
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# macOS
brew install azure-cli

# Windows
# Baixar de: https://aka.ms/installazurecliwindows
```

### 1.2 Login no Azure

```bash
az login

# Configurar assinatura padrão
az account set --subscription "Sua Assinatura"

# Verificar
az account show
```

### 1.3 Criar Resource Group

```bash
# Definir variáveis
RESOURCE_GROUP="healthcare-rg"
LOCATION="brazilsouth"  # Ou: "brazilsoutheast"

# Criar resource group
az group create \
  --name $RESOURCE_GROUP \
  --location $LOCATION
```

---

## 2. Infraestrutura Base

### 2.1 Criar Virtual Network

```bash
# Criar VNet
az network vnet create \
  --resource-group $RESOURCE_GROUP \
  --name healthcare-vnet \
  --address-prefix 10.0.0.0/16 \
  --subnet-name app-subnet \
  --subnet-prefix 10.0.1.0/24

# Criar subnet para dados
az network vnet subnet create \
  --resource-group $RESOURCE_GROUP \
  --vnet-name healthcare-vnet \
  --name data-subnet \
  --address-prefix 10.0.2.0/24
```

### 2.2 Criar Network Security Group

```bash
az network nsg create \
  --resource-group $RESOURCE_GROUP \
  --name healthcare-nsg

# Permitir HTTP/HTTPS
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name healthcare-nsg \
  --name AllowHTTP \
  --priority 100 \
  --source-address-prefixes Internet \
  --destination-port-ranges 80 \
  --protocol Tcp \
  --access Allow

az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name healthcare-nsg \
  --name AllowHTTPS \
  --priority 101 \
  --source-address-prefixes Internet \
  --destination-port-ranges 443 \
  --protocol Tcp \
  --access Allow

# Permitir SSH (temporário, para configuração)
az network nsg rule create \
  --resource-group $RESOURCE_GROUP \
  --nsg-name healthcare-nsg \
  --name AllowSSH \
  --priority 200 \
  --source-address-prefixes $(curl -s ifconfig.me)/32 \
  --destination-port-ranges 22 \
  --protocol Tcp \
  --access Allow
```

---

## 3. Banco de Dados PostgreSQL

### 3.1 Criar PostgreSQL Flexible Server

```bash
# Definir variáveis
POSTGRES_SERVER="healthcare-db-$(uuidgen | cut -d'-' -f1)"
POSTGRES_ADMIN="healthcare_admin"
POSTGRES_PASSWORD="$(openssl rand -base64 32)"  # Gerar senha forte

# Salvar credenciais
echo "PostgreSQL Server: $POSTGRES_SERVER" > azure-credentials.txt
echo "Admin User: $POSTGRES_ADMIN" >> azure-credentials.txt
echo "Admin Password: $POSTGRES_PASSWORD" >> azure-credentials.txt
echo "" >> azure-credentials.txt

# Criar servidor PostgreSQL
az postgres flexible-server create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --location $LOCATION \
  --admin-user $POSTGRES_ADMIN \
  --admin-password "$POSTGRES_PASSWORD" \
  --sku-name Standard_B2s \
  --tier Burstable \
  --version 15 \
  --storage-size 32 \
  --public-access 0.0.0.0 \
  --yes

# Criar banco de dados
az postgres flexible-server db create \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --database-name healthcare_db

# Configurar firewall (permitir acesso do Azure)
az postgres flexible-server firewall-rule create \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --rule-name AllowAzureServices \
  --start-ip-address 0.0.0.0 \
  --end-ip-address 0.0.0.0
```

### 3.2 Configurar Backup

```bash
az postgres flexible-server parameter set \
  --resource-group $RESOURCE_GROUP \
  --server-name $POSTGRES_SERVER \
  --name backup_retention_days \
  --value 35

# Habilitar geo-redundância
az postgres flexible-server geo-restore \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER \
  --source-server $POSTGRES_SERVER
```

---

## 4. Cache Redis

### 4.1 Criar Azure Cache for Redis

```bash
REDIS_NAME="healthcare-redis-$(uuidgen | cut -d'-' -f1)"

az redis create \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --location $LOCATION \
  --sku Basic \
  --vm-size c0 \
  --enable-non-ssl-port false

# Obter chave de acesso
REDIS_KEY=$(az redis list-keys \
  --resource-group $RESOURCE_GROUP \
  --name $REDIS_NAME \
  --query primaryKey -o tsv)

# Salvar credenciais
echo "Redis Server: $REDIS_NAME.redis.cache.windows.net" >> azure-credentials.txt
echo "Redis Key: $REDIS_KEY" >> azure-credentials.txt
echo "" >> azure-credentials.txt
```

---

## 5. Storage Account

### 5.1 Criar Storage Account

```bash
STORAGE_ACCOUNT="healthcarestorage$(date +%s)"

az storage account create \
  --resource-group $RESOURCE_GROUP \
  --name $STORAGE_ACCOUNT \
  --location $LOCATION \
  --sku Standard_LRS \
  --kind StorageV2 \
  --access-tier Hot

# Criar containers
STORAGE_KEY=$(az storage account keys list \
  --resource-group $RESOURCE_GROUP \
  --account-name $STORAGE_ACCOUNT \
  --query [0].value -o tsv)

az storage container create \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --name certificates

az storage container create \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --name documents

az storage container create \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --name recordings

az storage container create \
  --account-name $STORAGE_ACCOUNT \
  --account-key $STORAGE_KEY \
  --name backups

# Salvar credenciais
echo "Storage Account: $STORAGE_ACCOUNT" >> azure-credentials.txt
echo "Storage Key: $STORAGE_KEY" >> azure-credentials.txt
echo "" >> azure-credentials.txt
```

---

## 6. Virtual Machine (Aplicação)

### 6.1 Criar VM

```bash
VM_NAME="healthcare-app-vm"

az vm create \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --location $LOCATION \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys \
  --vnet-name healthcare-vnet \
  --subnet app-subnet \
  --nsg healthcare-nsg \
  --public-ip-address-allocation static \
  --public-ip-sku Standard

# Obter IP público
VM_IP=$(az vm show -d \
  --resource-group $RESOURCE_GROUP \
  --name $VM_NAME \
  --query publicIps -o tsv)

echo "VM Public IP: $VM_IP" >> azure-credentials.txt
echo "VM SSH: ssh azureuser@$VM_IP" >> azure-credentials.txt
```

### 6.2 Configurar VM

```bash
# Conectar via SSH
ssh azureuser@$VM_IP

# Dentro da VM:
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Instalar Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Verificar
docker --version
docker-compose --version

# Reiniciar para aplicar permissões
exit
```

---

## 7. Deploy da Aplicação

### 7.1 Clonar Repositório

```bash
# Reconectar à VM
ssh azureuser@$VM_IP

# Clonar repositório
git clone https://github.com/rpzk/HealthCare.git
cd HealthCare
```

### 7.2 Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env
cat > .env << 'EOF'
# Database
DATABASE_URL=postgresql://healthcare_admin:SUA_SENHA@SEU_SERVIDOR.postgres.database.azure.com:5432/healthcare_db?sslmode=require

# Redis
REDIS_URL=redis://:SUA_CHAVE@SEU_REDIS.redis.cache.windows.net:6380?ssl=true

# NextAuth
NEXTAUTH_URL=https://SEU_DOMINIO.com
NEXTAUTH_SECRET=$(openssl rand -base64 32)

# Storage (Azure Blob)
AZURE_STORAGE_CONNECTION_STRING=DefaultEndpointsProtocol=https;AccountName=SEU_STORAGE;AccountKey=SUA_CHAVE;EndpointSuffix=core.windows.net

# App
NODE_ENV=production
PORT=3000

# Gotenberg
GOTENBERG_URL=http://gotenberg:3001

# Ollama (opcional)
OLLAMA_URL=http://ollama:11434

# Whisper STT (opcional)
STT_URL=http://stt:9000/asr
STT_LANGUAGE=pt
EOF

# Editar com suas credenciais
nano .env
```

### 7.3 Build e Deploy

```bash
# Build da aplicação
docker-compose -f docker-compose.prod.yml build

# Iniciar serviços
docker-compose -f docker-compose.prod.yml up -d

# Verificar logs
docker-compose -f docker-compose.prod.yml logs -f app

# Verificar status
docker-compose -f docker-compose.prod.yml ps
```

### 7.4 Executar Migrações

```bash
# Executar migrações Prisma
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy

# Gerar Prisma Client
docker-compose -f docker-compose.prod.yml exec app npx prisma generate

# Seed inicial (opcional)
docker-compose -f docker-compose.prod.yml exec app npm run seed
```

---

## 8. Configurar SSL/HTTPS

### 8.1 Instalar Certbot

```bash
sudo apt install certbot python3-certbot-nginx -y
```

### 8.2 Instalar Nginx

```bash
sudo apt install nginx -y

# Configurar proxy reverso
sudo tee /etc/nginx/sites-available/healthcare << 'EOF'
server {
    listen 80;
    server_name SEU_DOMINIO.com www.SEU_DOMINIO.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Ativar site
sudo ln -s /etc/nginx/sites-available/healthcare /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 8.3 Obter Certificado Let's Encrypt

```bash
sudo certbot --nginx -d SEU_DOMINIO.com -d www.SEU_DOMINIO.com

# Renovação automática
sudo certbot renew --dry-run
```

---

## 9. Configurar Backup Automatizado

### 9.1 Script de Backup para Azure

```bash
# Criar script
sudo tee /usr/local/bin/backup-healthcare.sh << 'EOF'
#!/bin/bash
set -e

# Configurações
BACKUP_DIR="/home/azureuser/backups"
DATE=$(date +%Y%m%d_%H%M%S)
STORAGE_ACCOUNT="SEU_STORAGE_ACCOUNT"
CONTAINER="backups"

# Criar diretório
mkdir -p $BACKUP_DIR

# Backup PostgreSQL
docker-compose -f /home/azureuser/HealthCare/docker-compose.prod.yml exec -T postgres \
  pg_dump -U healthcare -d healthcare_db | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz -C /home/azureuser/HealthCare uploads/

# Upload para Azure Blob
az storage blob upload-batch \
  --account-name $STORAGE_ACCOUNT \
  --destination $CONTAINER \
  --source $BACKUP_DIR \
  --pattern "*_$DATE.*"

# Limpar backups locais antigos (manter 7 dias)
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup concluído: $DATE"
EOF

sudo chmod +x /usr/local/bin/backup-healthcare.sh
```

### 9.2 Agendar Backup (Cron)

```bash
# Adicionar ao cron
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/backup-healthcare.sh >> /var/log/healthcare-backup.log 2>&1") | crontab -
```

---

## 10. Monitoramento (Opcional)

### 10.1 Azure Monitor

```bash
# Habilitar Azure Monitor para VM
az vm extension set \
  --resource-group $RESOURCE_GROUP \
  --vm-name $VM_NAME \
  --name AzureMonitorLinuxAgent \
  --publisher Microsoft.Azure.Monitor \
  --version 1.0
```

### 10.2 Instalar Prometheus + Grafana (Self-hosted)

```bash
# Adicionar ao docker-compose.prod.yml
cat >> docker-compose.prod.yml << 'EOF'

  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
    restart: unless-stopped

  grafana:
    image: grafana/grafana:latest
    ports:
      - "3001:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    restart: unless-stopped

volumes:
  prometheus-data:
  grafana-data:
EOF

# Reiniciar
docker-compose -f docker-compose.prod.yml up -d
```

---

## 11. Testes Finais

### 11.1 Verificar Saúde da Aplicação

```bash
# Health check
curl https://SEU_DOMINIO.com/api/health

# Teste de login
curl -X POST https://SEU_DOMINIO.com/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@healthcare.com","password":"SUA_SENHA"}'
```

### 11.2 Verificar Conectividade do Banco

```bash
docker-compose -f docker-compose.prod.yml exec app npx prisma db push --preview-feature
```

---

## 12. Segurança Pós-Deploy

### 12.1 Desabilitar SSH com Senha

```bash
sudo nano /etc/ssh/sshd_config
# Alterar: PasswordAuthentication no
sudo systemctl restart ssh
```

### 12.2 Configurar Firewall

```bash
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### 12.3 Atualizar NSG

```bash
# Remover regra SSH pública após configuração
az network nsg rule delete \
  --resource-group $RESOURCE_GROUP \
  --nsg-name healthcare-nsg \
  --name AllowSSH
```

---

## 13. Custos Mensais Estimados (Cenário Básico)

```
VM Standard_B2s:                ~R$ 165
PostgreSQL Flexible Server:    ~R$ 138
Redis Basic C0:                 ~R$ 88
Storage Account (50GB):         ~R$ 6
Bandwidth (100GB):              ~R$ 44
Backup (50GB):                  ~R$ 14
──────────────────────────────────────
TOTAL:                          ~R$ 455/mês
```

---

## 14. Troubleshooting

### Problema: Aplicação não inicia

```bash
# Verificar logs
docker-compose -f docker-compose.prod.yml logs app

# Verificar variáveis de ambiente
docker-compose -f docker-compose.prod.yml exec app printenv
```

### Problema: Erro de conexão com PostgreSQL

```bash
# Testar conexão
docker-compose -f docker-compose.prod.yml exec app \
  npx prisma db push --preview-feature

# Verificar firewall do PostgreSQL
az postgres flexible-server firewall-rule list \
  --resource-group $RESOURCE_GROUP \
  --name $POSTGRES_SERVER
```

### Problema: Certificado SSL não funciona

```bash
# Verificar configuração Nginx
sudo nginx -t

# Reobter certificado
sudo certbot --nginx --force-renewal
```

---

## 15. Scripts Úteis

### Reiniciar Aplicação

```bash
cd /home/azureuser/HealthCare
docker-compose -f docker-compose.prod.yml restart app
```

### Atualizar Aplicação

```bash
cd /home/azureuser/HealthCare
git pull origin main
docker-compose -f docker-compose.prod.yml build app
docker-compose -f docker-compose.prod.yml up -d app
docker-compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

### Restaurar Backup

```bash
# Download do Azure Blob
az storage blob download \
  --account-name $STORAGE_ACCOUNT \
  --container-name backups \
  --name db_20260220_020000.sql.gz \
  --file /tmp/restore.sql.gz

# Restaurar PostgreSQL
gunzip < /tmp/restore.sql.gz | docker-compose -f docker-compose.prod.yml exec -T postgres \
  psql -U healthcare -d healthcare_db
```

---

## Conclusão

Após seguir este guia, você terá:

✅ Aplicação HealthCare rodando no Azure  
✅ Banco de dados PostgreSQL gerenciado  
✅ Cache Redis configurado  
✅ SSL/HTTPS ativo  
✅ Backup automatizado  
✅ Monitoramento básico  

**Próximos passos recomendados**:
1. Configurar domínio personalizado
2. Implementar WAF (Web Application Firewall)
3. Configurar alertas de monitoramento
4. Testar plano de disaster recovery
5. Documentar procedimentos operacionais

---

**Suporte**:  
- GitHub Issues: https://github.com/rpzk/HealthCare/issues  
- Documentação: https://github.com/rpzk/HealthCare/tree/main/docs  

**Última atualização**: Fevereiro 2026

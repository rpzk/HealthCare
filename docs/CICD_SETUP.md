# CI/CD - Configuração de Deploy Automático

Este documento descreve como configurar o pipeline de CI/CD para deploy automático do HealthCare.

## Visão Geral

| Ambiente | Workflow | Trigger | Status |
|----------|----------|---------|--------|
| **UmbrelOS** (minipc) | `deploy-umbrel.yml` | Push em `main` | Pronto para uso |
| **Azure** (VM) | `deploy-azure.yml` | Push em `main` (quando ativado) | Template - aguardando credenciais |

---

## 1. Deploy no UmbrelOS (Produção Atual)

### Fluxo

```
Notebook (dev) → git push → GitHub → Actions (build + test) → SSH no Umbrel → docker compose up
```

### Pré-requisitos no Umbrel

1. **SSH habilitado** no Umbrel (Settings → System → SSH)
2. **Repositório clonado** em `/home/umbrel/HealthCare`
3. **Arquivo `.env`** configurado (use `.env-umbrel` como base)
4. **Diretório de backups** criado: `mkdir -p /home/umbrel/backups/healthcare`

### Configurar Secrets no GitHub

1. Acesse **Settings** → **Secrets and variables** → **Actions**
2. Clique em **New repository secret**
3. Adicione:

| Secret | Descrição | Exemplo |
|--------|-----------|---------|
| `UMBREL_SSH_HOST` | IP ou hostname do minipc | `192.168.1.100` ou `healthcare.seudominio.com` |
| `UMBREL_SSH_USER` | Usuário SSH | `umbrel` |
| `UMBREL_SSH_KEY` | Chave privada SSH (conteúdo completo) | Conteúdo de `~/.ssh/id_ed25519` |
| `UMBREL_SSH_PORT` | (opcional) Porta SSH | `22` |
| `UMBREL_APP_URL` | (opcional) URL para health check | `https://healthcare.seudominio.com` |

### Gerar chave SSH para deploy

```bash
# No seu notebook
ssh-keygen -t ed25519 -f ~/.ssh/healthcare_deploy -N ""

# Copiar a chave pública para o Umbrel
ssh-copy-id -i ~/.ssh/healthcare_deploy.pub umbrel@SEU_IP_UMBREL

# Copiar o conteúdo da chave privada para o secret UMBREL_SSH_KEY
cat ~/.ssh/healthcare_deploy
# Cole o conteúdo inteiro (incluindo -----BEGIN e -----END) no GitHub
```

### Testar

1. Faça um `git push origin main`
2. Acesse **Actions** no GitHub e acompanhe o workflow
3. Ou dispare manualmente: **Actions** → **Deploy to Umbrel** → **Run workflow**

---

## 2. Deploy no Azure (Cliente)

### Quando o cliente fornecer as credenciais

O workflow `deploy-azure.yml` está preparado mas **desativado por padrão**. Para ativar:

### Passo 1: Configurar a VM no Azure

Siga o guia [docs/DEPLOY_AZURE.md](DEPLOY_AZURE.md) para criar:
- Resource Group, VNet, NSG
- PostgreSQL Flexible Server
- Azure Cache for Redis
- Storage Account
- VM com Docker + Docker Compose
- Repositório clonado em `/home/azureuser/HealthCare`

**Importante:** O `docker-compose.prod.yml` usa o path `/home/umbrel/backups/healthcare`. Para Azure, você pode:
- Criar symlink: `sudo ln -s /home/azureuser/backups/healthcare /home/umbrel/backups/healthcare`
- Ou criar um `docker-compose.azure.yml` com paths ajustados

### Passo 2: Adicionar Secrets no GitHub

| Secret | Descrição |
|--------|-----------|
| `AZURE_SSH_HOST` | IP público da VM Azure |
| `AZURE_SSH_USER` | `azureuser` |
| `AZURE_SSH_KEY` | Chave privada SSH (a mesma gerada no `az vm create --generate-ssh-keys`) |
| `AZURE_SSH_PORT` | (opcional) `22` |

### Passo 3: Ativar o deploy

1. **Settings** → **Secrets and variables** → **Variables**
2. **New repository variable**
3. Nome: `AZURE_DEPLOY_ENABLED`, Valor: `true`

A partir daí, cada push em `main` fará deploy tanto no Umbrel quanto no Azure.

### Deploy manual (sem ativar variável)

Você pode rodar o deploy Azure manualmente a qualquer momento:
**Actions** → **Deploy to Azure** → **Run workflow**

---

## 3. Alternativa: Azure Container Apps (Futuro)

Para um setup mais "cloud-native" no Azure (sem VM, usando serviços gerenciados):

- **Azure Container Registry (ACR)** para as imagens Docker
- **Azure Container Apps** ou **Azure App Service** para a aplicação
- **Azure Database for PostgreSQL** e **Azure Cache for Redis** (já no guia)

Isso exigiria adaptar o `docker-compose.prod.yml` para rodar apenas o container `app` (com DB e Redis externos). O guia DEPLOY_AZURE.md já cobre a infraestrutura; o workflow poderia evoluir para:

```yaml
# Exemplo futuro - build + push ACR + deploy Container Apps
- uses: azure/docker-login@v1
  with:
    login-server: ${{ secrets.ACR_LOGIN_SERVER }}
    username: ${{ secrets.ACR_USERNAME }}
    password: ${{ secrets.ACR_PASSWORD }}
- run: docker build -t ${{ secrets.ACR_LOGIN_SERVER }}/healthcare:${{ github.sha }} .
- run: docker push ${{ secrets.ACR_LOGIN_SERVER }}/healthcare:${{ github.sha }}
- uses: azure/container-apps-deploy-action@v1
  with:
    acrName: ...
    containerAppName: ...
    resourceGroup: ...
```

---

## 4. Resumo do Fluxo de Desenvolvimento

```
┌─────────────────┐     push      ┌─────────┐     trigger     ┌──────────────────┐
│  Notebook (dev) │ ────────────► │ GitHub  │ ──────────────► │  GitHub Actions   │
│  git commit     │              │  main   │                 │  build + test     │
└─────────────────┘              └─────────┘                 └────────┬─────────┘
                                                                      │
                                                                      │ se OK
                                                                      ▼
                        ┌─────────────────────────────────────────────────────────┐
                        │  Deploy (SSH)                                            │
                        │  • git pull                                              │
                        │  • docker compose build app                               │
                        │  • docker compose up -d app                               │
                        │  • prisma migrate deploy                                  │
                        └───────────────────────┬─────────────────────────────────┘
                                                │
                    ┌───────────────────────────┼───────────────────────────┐
                    ▼                           ▼                           ▼
            ┌───────────────┐           ┌───────────────┐           ┌───────────────┐
            │   UmbrelOS    │           │  Azure VM     │           │  (futuro)     │
            │   (minipc)    │           │  (cliente)    │           │  Container    │
            │   produção    │           │  quando ativo │           │  Apps         │
            └───────────────┘           └───────────────┘           └───────────────┘
```

---

## 5. Troubleshooting

### "docker compose" não encontrado no servidor

Se o Umbrel ou Azure VM tiver apenas Docker Compose V1, edite o workflow e troque `docker compose` por `docker-compose` nos comandos do script SSH.

### Deploy Umbrel falha com "Permission denied (publickey)"

- Verifique se a chave pública está em `~/.ssh/authorized_keys` no Umbrel
- Teste manualmente: `ssh -i ~/.ssh/healthcare_deploy umbrel@SEU_IP`

### Deploy falha no "prisma migrate deploy"

- O container pode estar iniciando. O workflow usa `|| true` para não falhar
- Execute manualmente no servidor: `docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy`

### Build falha no GitHub Actions

- Verifique os logs do job "Build & Test"
- O build usa variáveis dummy (DATABASE_URL de teste) - não precisa de secrets para build

### Desabilitar deploy automático temporariamente

- **Umbrel:** Remova os secrets `UMBREL_SSH_*` ou renomeie o workflow para `.yml.disabled`
- **Azure:** Defina `AZURE_DEPLOY_ENABLED=false` nas variables

# Deploy com Docker

## Pré-requisitos

- Docker e Docker Compose instalados
- Arquivo `.env` na raiz do projeto com as variáveis de produção (veja abaixo)

## Variáveis obrigatórias para produção

No `.env` (ou exportadas no shell), defina pelo menos:

```bash
POSTGRES_PASSWORD=<senha_forte_postgres>
NEXTAUTH_SECRET=<openssl rand -base64 32>
NEXTAUTH_URL=https://seu-dominio.com
ENCRYPTION_KEY=<32_caracteres_ou_mais>
```

Opcionais (IA, STT, etc.) – veja `docker-compose.prod.yml` e `.env.example`.

## Deploy com docker-compose (produção)

Na raiz do projeto:

```bash
# 1) Build da imagem da aplicação (usa DATABASE_URL no build)
docker compose -f docker-compose.prod.yml build

# 2) Subir toda a stack (Postgres, Redis, Gotenberg, STT, Ollama, app, Coturn)
docker compose -f docker-compose.prod.yml up -d

# 3) Ver logs da aplicação
docker compose -f docker-compose.prod.yml logs -f app
```

O entrypoint do container já executa `prisma db push` na subida (sincroniza o schema com o banco). A aplicação fica em **http://localhost:3000** (ou na porta que você mapear).

## Comandos úteis

```bash
# Parar tudo
docker compose -f docker-compose.prod.yml down

# Rebuild só do app e subir de novo
docker compose -f docker-compose.prod.yml up -d --build app

# Entrar no container do app
docker compose -f docker-compose.prod.yml exec app bash
```

## Volumes

- **uploads_data** → `/app/uploads` (arquivos e certificados)
- **postgres_data** → dados do PostgreSQL
- Backups (ex.: `/home/umbrel/backups/healthcare`) mapeado em `docker-compose.prod.yml` para `/app/backups`

Ajuste o caminho do host em `volumes` no compose se necessário.

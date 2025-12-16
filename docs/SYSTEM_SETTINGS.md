# Sistema de Configurações (SystemSettings)

## Visão Geral

O HealthCare Medical Records implementa um sistema centralizado de configurações que permite gerenciar parâmetros do sistema através do banco de dados, com interface administrativa e fallback para variáveis de ambiente.

## Arquitetura

### Componentes

1. **SystemSettingsService** (`lib/system-settings-service.ts`)
   - Serviço principal para gerenciamento de configurações
   - Criptografia AES-256-CBC para valores sensíveis
   - Cache em memória (5 minutos)
   - Fallback automático para `.env`

2. **API REST** (`app/api/system/settings/route.ts`)
   - Endpoints CRUD para configurações
   - Proteção de chaves críticas
   - Acesso restrito a administradores

3. **Interface Admin** (`app/admin/settings/page.tsx`)
   - UI para gerenciar configurações
   - Organização por categorias
   - Controle de visibilidade de secrets

4. **Seed Script** (`scripts/seed-system-settings.ts`)
   - Popula configurações padrão
   - Execução: `npx tsx scripts/seed-system-settings.ts`

## Categorias de Configuração

### STORAGE (Armazenamento)
```typescript
STORAGE_TYPE: 'local' | 's3' | 'minio'
LOCAL_STORAGE_PATH: string
STORAGE_BUCKET: string
STORAGE_REGION: string (S3 only)
S3_ACCESS_KEY_ID: string (encrypted)
S3_SECRET_ACCESS_KEY: string (encrypted)
MINIO_ENDPOINT: string
MINIO_ACCESS_KEY: string (encrypted)
MINIO_SECRET_KEY: string (encrypted)
```

### REDIS (Cache/Queue)
```typescript
REDIS_HOST: string
REDIS_PORT: string
REDIS_DB: string
REDIS_PASSWORD: string (encrypted, optional)
```

### WHATSAPP (Notificações)
```typescript
WHATSAPP_PROVIDER: 'evolution' | 'twilio' | 'zenvia'
WHATSAPP_API_URL: string
WHATSAPP_API_KEY: string (encrypted)
WHATSAPP_INSTANCE_ID: string
```

### EMAIL (SMTP)
```typescript
SMTP_HOST: string
SMTP_PORT: string
SMTP_SECURE: 'true' | 'false'
SMTP_USER: string
SMTP_PASSWORD: string (encrypted)
EMAIL_FROM: string
EMAIL_FROM_NAME: string
```

### WEBRTC (Telemedicina)
```typescript
NEXT_PUBLIC_ICE_SERVERS: JSON string
TURN_SERVER_URL: string (optional)
TURN_USERNAME: string (encrypted, optional)
TURN_CREDENTIAL: string (encrypted, optional)
```

### GENERAL (Geral)
```typescript
SYSTEM_NAME: string
SUPPORT_EMAIL: string
MAX_FILE_SIZE_MB: string
SESSION_TIMEOUT_MINUTES: string
MAINTENANCE_MODE: 'true' | 'false'
```

## Uso no Código

### Leitura de Configuração

```typescript
import { SystemSettingsService } from '@/lib/system-settings-service'

// Valor único
const storageType = await SystemSettingsService.get('STORAGE_TYPE', 'local')

// Configuração completa
const storageConfig = await SystemSettingsService.getStorageConfig()
// {
//   type: 'local',
//   bucket: 'healthcare-recordings',
//   path: './uploads/recordings',
//   ...
// }
```

### Helpers Disponíveis

```typescript
// Redis
const redisConfig = await SystemSettingsService.getRedisConfig()

// WhatsApp
const whatsappConfig = await SystemSettingsService.getWhatsAppConfig()

// Email
const emailConfig = await SystemSettingsService.getEmailConfig()

// WebRTC
const webrtcConfig = await SystemSettingsService.getWebRTCConfig()
```

### Salvando Configuração

```typescript
// Via serviço
await SystemSettingsService.set('REDIS_HOST', 'redis.example.com', {
  category: 'REDIS',
  encrypted: false,
})

// Via API (POST)
fetch('/api/system/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: 'REDIS_HOST',
    value: 'redis.example.com',
    category: 'REDIS',
    encrypted: false,
  }),
})
```

## Criptografia

### Valores Criptografados

Configurações marcadas como `encrypted: true` são automaticamente criptografadas no banco usando AES-256-CBC.

**Chave Mestra:** `ENCRYPTION_KEY` (deve estar em `.env`)

**Processo:**
1. Gera IV aleatório (16 bytes)
2. Criptografa valor com AES-256-CBC
3. Armazena: `<IV_HEX>:<ENCRYPTED_VALUE_HEX>`
4. Na leitura, extrai IV e descriptografa

**Exemplo:**
```typescript
await SystemSettingsService.set('S3_SECRET_ACCESS_KEY', 'my-secret-key', {
  encrypted: true,
})
// Banco: "a1b2c3d4...:<encrypted>"
// Leitura: "my-secret-key" (descriptografado automaticamente)
```

## Chaves Protegidas (Não Editáveis via API)

Por segurança, as seguintes chaves **não podem** ser modificadas via API/UI:

- `ENCRYPTION_KEY` - Chave mestra de criptografia
- `NEXTAUTH_SECRET` - Secret de autenticação
- `DATABASE_URL` - URL do banco de dados
- `RECORDING_ENCRYPTION_KEY` - Chave para gravações
- `CRON_SECRET` - Secret para jobs agendados

Estas devem permanecer exclusivamente no arquivo `.env`.

## Fallback para .env

O sistema **sempre** verifica o banco de dados primeiro, mas faz fallback automático para variáveis de ambiente:

```typescript
// Ordem de prioridade:
1. Cache (se válido)
2. Banco de dados
3. Variável de ambiente (.env)
4. Valor padrão fornecido
```

Isso permite migração gradual e garante compatibilidade com deploys existentes.

## Cache

- **TTL:** 5 minutos
- **Escopo:** Processo Node.js (Map em memória)
- **Invalidação:** Automática em `set()` ou manual com `clearCache()`

```typescript
// Forçar recarga
SystemSettingsService.clearCache('REDIS_HOST')
// ou limpar tudo:
SystemSettingsService.clearCache()
```

## API REST

### GET /api/system/settings
Lista todas as configurações (admin only).

**Query Params:**
- `category` - Filtrar por categoria
- `publicOnly=true` - Apenas configurações públicas

**Resposta:**
```json
{
  "success": true,
  "settings": [
    {
      "key": "STORAGE_TYPE",
      "value": "local",
      "category": "STORAGE",
      "encrypted": false,
      "isPublic": false
    }
  ]
}
```

### POST /api/system/settings
Cria ou atualiza uma configuração.

**Body:**
```json
{
  "key": "REDIS_HOST",
  "value": "localhost",
  "category": "REDIS",
  "encrypted": false
}
```

### PUT /api/system/settings
Atualização em lote.

**Body:**
```json
{
  "settings": [
    { "key": "REDIS_HOST", "value": "localhost", "category": "REDIS" },
    { "key": "REDIS_PORT", "value": "6379", "category": "REDIS" }
  ]
}
```

### DELETE /api/system/settings?key=REDIS_HOST
Remove uma configuração (admin only).

## Interface Admin

Acesse: `/admin/settings`

**Funcionalidades:**
- ✅ Navegação por categorias (tabs)
- ✅ Edição inline de valores
- ✅ Toggle de visibilidade para secrets
- ✅ Salvamento individual ou em lote
- ✅ Indicadores visuais (encrypted badge)
- ✅ Proteção de chaves críticas

## Migração de .env para DB

### Passo 1: Identificar Configurações
Revise seu `.env` e identifique quais valores podem ir para o banco.

### Passo 2: Criar Seed Custom
Crie um script em `scripts/migrate-env-to-db.ts`:

```typescript
import { SystemSettingsService } from '@/lib/system-settings-service'

const settings = [
  { key: 'REDIS_HOST', value: process.env.REDIS_HOST || 'localhost' },
  { key: 'SMTP_HOST', value: process.env.SMTP_HOST || 'smtp.gmail.com' },
  // ...
]

for (const setting of settings) {
  await SystemSettingsService.set(setting.key, setting.value, {
    category: 'REDIS', // ajuste conforme necessário
  })
}
```

### Passo 3: Executar Migração
```bash
npx tsx scripts/migrate-env-to-db.ts
```

### Passo 4: Remover do .env (Opcional)
Após confirmar que funciona, você pode remover as variáveis do `.env` (o sistema fará fallback ao banco).

## Boas Práticas

1. **Secrets Sensíveis:** Use `encrypted: true` para passwords, API keys, tokens
2. **Públicas:** Marque `isPublic: true` apenas para valores seguros (ex: SYSTEM_NAME)
3. **Categorização:** Use categorias consistentes para organização
4. **Backup:** Sempre mantenha backup do `.env` com valores críticos
5. **Auditoria:** O campo `updatedBy` rastreia quem modificou (implementar no futuro)

## Troubleshooting

### "Erro ao descriptografar"
- Verifique se `ENCRYPTION_KEY` está no `.env`
- Confirme que a chave não foi alterada após criptografar valores

### "Configuração não encontrada"
- Verifique se existe no banco: `SELECT * FROM system_settings WHERE key = '...'`
- Confirme que existe no `.env` como fallback
- Execute o seed: `npx tsx scripts/seed-system-settings.ts`

### "Cache desatualizado"
```typescript
SystemSettingsService.clearCache('MINHA_CONFIG')
```

## Roadmap

- [ ] Auditoria completa (track de mudanças com timestamp)
- [ ] Versionamento de configurações
- [ ] Import/export de configurações
- [ ] Validação de schemas por categoria
- [ ] Notificações quando configurações críticas mudam
- [ ] UI para visualizar histórico de mudanças

## Referências

- Prisma Schema: `prisma/schema.prisma` (SystemSetting model)
- Service: `lib/system-settings-service.ts`
- API: `app/api/system/settings/route.ts`
- UI: `app/admin/settings/page.tsx`
- Seed: `scripts/seed-system-settings.ts`

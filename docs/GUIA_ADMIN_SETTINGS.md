# Guia Rápido: Interface de Configurações do Sistema

## Acesso

**URL:** `/admin/settings`  
**Permissão:** Apenas administradores (role: ADMIN)

---

## Visão Geral

A interface de configurações permite gerenciar todas as configurações do sistema através de uma interface visual organizada por categorias.

![Admin Settings Interface](../public/docs/admin-settings-preview.png)

---

## Categorias Disponíveis

### 📦 Armazenamento (Storage)
Configure onde e como os arquivos são armazenados.

**Configurações principais:**
- `STORAGE_TYPE`: Tipo de armazenamento (`local`, `s3`, `minio`)
- `LOCAL_STORAGE_PATH`: Caminho para armazenamento local
- `STORAGE_BUCKET`: Nome do bucket (S3/MinIO)
- `S3_ACCESS_KEY_ID`: ⚠️ Chave de acesso S3 (criptografado)
- `S3_SECRET_ACCESS_KEY`: ⚠️ Chave secreta S3 (criptografado)

**Exemplo de uso:**
1. Selecione a aba **Storage**
2. Escolha o tipo: `local` para desenvolvimento, `s3` para produção
3. Configure as credenciais correspondentes
4. Clique em **Salvar Tudo**

---

### 🔴 Redis / Cache
Configure o servidor Redis para cache e filas.

**Configurações principais:**
- `REDIS_HOST`: Endereço do servidor Redis (ex: `localhost`)
- `REDIS_PORT`: Porta do Redis (padrão: `6379`)
- `REDIS_DB`: Número do banco de dados (padrão: `0`)
- `REDIS_PASSWORD`: ⚠️ Senha do Redis (criptografado, opcional)

**Teste de conectividade:**
```bash
docker exec healthcare-redis redis-cli ping
# Deve retornar: PONG
```

---

### 💬 WhatsApp
Configure o provedor de mensagens WhatsApp.

**Configurações principais:**
- `WHATSAPP_PROVIDER`: Provedor (`evolution`, `twilio`, `zenvia`)
- `WHATSAPP_API_URL`: URL da API do provedor
- `WHATSAPP_API_KEY`: ⚠️ Chave de API (criptografado)
- `WHATSAPP_INSTANCE_ID`: ID da instância

**Provedores suportados:**

#### Evolution API (Recomendado)
```
WHATSAPP_PROVIDER=evolution
WHATSAPP_API_URL=https://evolution.example.com
WHATSAPP_API_KEY=sua-chave-aqui
WHATSAPP_INSTANCE_ID=instance-name
```

#### Twilio
```
WHATSAPP_PROVIDER=twilio
WHATSAPP_API_KEY=ACxxxxxxxxxxxxxxxxxxxxx
WHATSAPP_API_SECRET=sua-secret-aqui
```

#### Zenvia
```
WHATSAPP_PROVIDER=zenvia
WHATSAPP_API_KEY=seu-token-zenvia
```

---

### 📧 E-mail (SMTP)
Configure o servidor SMTP para envio de e-mails.

**Configurações principais:**
- `SMTP_HOST`: Servidor SMTP (ex: `smtp.gmail.com`)
- `SMTP_PORT`: Porta (587 para TLS, 465 para SSL)
- `SMTP_SECURE`: Use SSL/TLS (`true`/`false`)
- `SMTP_USER`: Usuário de autenticação
- `SMTP_PASSWORD`: ⚠️ Senha SMTP (criptografado)
- `EMAIL_FROM`: E-mail remetente
- `EMAIL_FROM_NAME`: Nome do remetente

**Exemplo Gmail:**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua-senha-de-app
EMAIL_FROM=noreply@healthcare.com
EMAIL_FROM_NAME=HealthCare System
```

**⚠️ Gmail:** Use uma "Senha de App" em vez da senha da conta. [Como criar](https://support.google.com/accounts/answer/185833)

---

### 📹 WebRTC / Vídeo
Configure servidores STUN/TURN para videochamadas.

**Configurações principais:**
- `NEXT_PUBLIC_ICE_SERVERS`: Lista de servidores ICE (JSON)
- `TURN_SERVER_URL`: URL do servidor TURN (opcional)
- `TURN_USERNAME`: ⚠️ Usuário TURN (opcional)
- `TURN_CREDENTIAL`: ⚠️ Credencial TURN (opcional)

**Exemplo básico (apenas STUN):**
```json
[
  {"urls": "stun:stun.l.google.com:19302"},
  {"urls": "stun:stun1.l.google.com:19302"}
]
```

**Exemplo com TURN (produção):**
```json
[
  {"urls": "stun:stun.l.google.com:19302"},
  {
    "urls": "turn:turn.example.com:3478",
    "username": "usuario",
    "credential": "senha"
  }
]
```

---

### ⚙️ Geral
Configurações gerais do sistema.

**Configurações principais:**
- `SYSTEM_NAME`: Nome do sistema (exibido no UI)
- `SUPPORT_EMAIL`: E-mail de suporte
- `MAX_FILE_SIZE_MB`: Tamanho máximo de upload em MB
- `SESSION_TIMEOUT_MINUTES`: Timeout de sessão inativa
- `MAINTENANCE_MODE`: Modo de manutenção (`true`/`false`)

---

## Recursos da Interface

### 🔒 Visibilidade de Secrets

Configurações sensíveis (marcadas como criptografadas) são exibidas com máscara:

```
SMTP_PASSWORD [Criptografado]  [👁️]
[••••••••••••••••••••••••••••]
```

Clique no ícone 👁️ para alternar a visibilidade.

---

### 💾 Salvamento

**Opção 1: Salvar Tudo**
- Botão no canto superior direito
- Salva todas as configurações de uma vez
- Use quando fizer múltiplas alterações

**Opção 2: Salvar Individual**
- Disponível por configuração (se implementado)
- Use para mudanças pontuais

---

### 🔐 Configurações Protegidas

As seguintes configurações **NÃO podem** ser editadas via interface por questões de segurança:

- ❌ `ENCRYPTION_KEY` - Chave mestra de criptografia
- ❌ `NEXTAUTH_SECRET` - Secret de autenticação
- ❌ `DATABASE_URL` - URL do banco de dados
- ❌ `RECORDING_ENCRYPTION_KEY` - Chave para gravações
- ❌ `CRON_SECRET` - Secret para jobs cron

Estas devem ser gerenciadas diretamente no arquivo `.env` no servidor.

---

## Fluxos Comuns

### Configurar Storage Local (Desenvolvimento)

1. Acesse `/admin/settings`
2. Vá para a aba **Storage**
3. Configure:
   ```
   STORAGE_TYPE = local
   LOCAL_STORAGE_PATH = ./uploads/recordings
   ```
4. Clique em **Salvar Tudo**
5. Verifique que a pasta existe:
   ```bash
   mkdir -p ./uploads/recordings
   ```

---

### Configurar Storage S3 (Produção)

1. Acesse `/admin/settings`
2. Vá para a aba **Storage**
3. Configure:
   ```
   STORAGE_TYPE = s3
   STORAGE_BUCKET = healthcare-prod-recordings
   STORAGE_REGION = us-east-1
   S3_ACCESS_KEY_ID = AKIAIOSFODNN7EXAMPLE
   S3_SECRET_ACCESS_KEY = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
   ```
4. Marque `S3_ACCESS_KEY_ID` e `S3_SECRET_ACCESS_KEY` como **criptografado** ✅
5. Clique em **Salvar Tudo**

---

### Ativar Notificações WhatsApp

1. Primeiro, configure sua Evolution API (ou outro provedor)
2. Acesse `/admin/settings`
3. Vá para a aba **WhatsApp**
4. Configure:
   ```
   WHATSAPP_PROVIDER = evolution
   WHATSAPP_API_URL = https://evolution.seudominio.com
   WHATSAPP_API_KEY = sua-chave-api
   WHATSAPP_INSTANCE_ID = healthcare-instance
   ```
5. Marque `WHATSAPP_API_KEY` como **criptografado** ✅
6. Clique em **Salvar Tudo**
7. Teste enviando uma notificação

---

### Configurar E-mail (Gmail)

1. Crie uma "Senha de App" no Gmail: [Instruções](https://support.google.com/accounts/answer/185833)
2. Acesse `/admin/settings`
3. Vá para a aba **Email**
4. Configure:
   ```
   SMTP_HOST = smtp.gmail.com
   SMTP_PORT = 587
   SMTP_SECURE = false
   SMTP_USER = seu-email@gmail.com
   SMTP_PASSWORD = xxxx xxxx xxxx xxxx (senha de app)
   EMAIL_FROM = noreply@healthcare.com
   EMAIL_FROM_NAME = HealthCare System
   ```
5. Marque `SMTP_PASSWORD` como **criptografado** ✅
6. Clique em **Salvar Tudo**
7. Teste enviando um e-mail de boas-vindas

---

## Solução de Problemas

### "Erro ao salvar configuração"

**Possíveis causas:**
- Você não é administrador
- Tentou modificar uma chave protegida
- Valor inválido para o tipo de configuração

**Solução:**
1. Verifique que está logado como ADMIN
2. Confirme que a chave não está na lista de protegidas
3. Valide o formato do valor (ex: portas devem ser números)

---

### "Configurações não aparecem"

**Possíveis causas:**
- Banco de dados vazio (seed não executado)
- Categoria incorreta
- Erro de conexão com banco

**Solução:**
```bash
# Execute o seed
npx tsx scripts/seed-system-settings.ts

# Verifique no banco
docker exec healthcare-postgres psql -U healthcare -d healthcare_db \
  -c "SELECT key, category FROM system_settings ORDER BY category, key;"
```

---

### "Valores criptografados não descriptografam"

**Possíveis causas:**
- `ENCRYPTION_KEY` não está definida no `.env`
- `ENCRYPTION_KEY` foi alterada após criptografar valores

**Solução:**
1. Verifique o `.env`:
   ```bash
   grep ENCRYPTION_KEY .env
   ```
2. Se não existir, gere uma nova:
   ```bash
   echo "ENCRYPTION_KEY=$(openssl rand -hex 32)" >> .env
   ```
3. ⚠️ **AVISO:** Alterar a chave invalidará valores criptografados existentes!

---

## Boas Práticas

### ✅ Faça

- ✅ Use criptografia para senhas, API keys, tokens
- ✅ Teste configurações após salvar (envie um e-mail de teste, etc.)
- ✅ Documente mudanças importantes
- ✅ Mantenha backup do `.env` com chaves críticas
- ✅ Use categorias consistentes

### ❌ Não Faça

- ❌ Compartilhe valores criptografados (são específicos da chave)
- ❌ Edite `ENCRYPTION_KEY` via interface (use .env)
- ❌ Delete configurações sem entender o impacto
- ❌ Use valores de produção em desenvolvimento

---

## API Programática

Se preferir gerenciar via código:

```typescript
// Listar configurações
const res = await fetch('/api/system/settings?category=STORAGE')
const { settings } = await res.json()

// Criar/atualizar
await fetch('/api/system/settings', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    key: 'REDIS_HOST',
    value: 'redis.example.com',
    category: 'REDIS',
    encrypted: false,
  }),
})

// Atualização em lote
await fetch('/api/system/settings', {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    settings: [
      { key: 'SMTP_HOST', value: 'smtp.gmail.com', category: 'EMAIL' },
      { key: 'SMTP_PORT', value: '587', category: 'EMAIL' },
    ],
  }),
})

// Deletar
await fetch('/api/system/settings?key=OBSOLETE_CONFIG', {
  method: 'DELETE',
})
```

Veja a documentação completa em [`docs/SYSTEM_SETTINGS.md`](./SYSTEM_SETTINGS.md).

---

## Suporte

Para mais informações:
- 📖 Documentação técnica: `docs/SYSTEM_SETTINGS.md`
- 🧪 Testes: `tests/integration/system-settings.test.ts`
- 💬 Suporte: support@healthcare.com

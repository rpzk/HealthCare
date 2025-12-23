# 🇧🇷 Implementação de Assinatura Digital com Gov.br

**Data:** 16 de Dezembro de 2025  
**Status:** ✅ Implementação Completa (Fase 1)  
**Arquitetura:** Next.js 14 + OAuth 2.0

---

## 📋 Visão Geral

Este documento descreve a implementação completa do fluxo de assinatura digital com a plataforma **Gov.br**, utilizando OAuth 2.0. O sistema permite que usuários assinem atestados médicos digitalmente com reconhecimento legal em todo o Brasil.

### ✨ Características

- ✅ **OAuth 2.0 Completo** - Fluxo de autorização padrão
- ✅ **Sem Custo Inicial** - Usa certificação gratuita do Gov.br
- ✅ **Reconhecimento Legal** - Válido para Cartório, SUS, governo
- ✅ **Híbrido** - Suporte a PKI-Local + Gov.br simultaneamente
- ✅ **Seguro** - SHA-256, CSRF protection, estado validado

---

## 🏗️ Arquitetura

### Componentes Criados

```
/lib/govbr-utils.ts
├── generateDocumentHash() - SHA-256 hash
├── generateOAuthState() - CSRF prevention
├── buildAuthorizationUrl() - URL de redirecionamento
└── buildTokenRequestBody() - Requisição de token

/app/api/govbr/
├── iniciar-assinatura/route.ts - POST (inicia fluxo)
└── callback/route.ts - GET (recebe callback)

/components/
├── govbr-signature-button.tsx - Botão de ação
└── certificate-signature-example.tsx - Exemplo de integração

/app/govbr/
├── sucesso/page.tsx - Página de sucesso
└── erro/page.tsx - Página de erro
```

---

## 🔐 Fluxo OAuth 2.0

```
┌──────────────────────────────────────────────────────────┐
│ 1. FRONTEND                                              │
│ Usuário clica em "Assinar com Gov.br"                   │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ 2. POST /api/govbr/iniciar-assinatura                   │
│ Backend gera hash SHA-256 do documento                  │
│ Gera estado CSRF (random 32 bytes)                      │
│ Constrói URL de autorização                             │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ 3. FRONTEND REDIRECIONA                                  │
│ window.location.href = authorizationUrl                 │
│ Usuário vai para Gov.br                                 │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ 4. GOV.BR                                                │
│ Usuário se autentica                                    │
│ Concede autorização                                     │
│ Gov.br o redireciona para nosso callback               │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ 5. GET /api/govbr/callback?code=XXX&state=YYY          │
│ Backend valida estado (CSRF protection)                 │
│ Troca code por access_token                            │
│ Valida token                                            │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ 6. FINALIZAÇÃO                                           │
│ Backend assina documento com Gov.br                     │
│ Armazena assinatura no banco                           │
│ Redireciona para /govbr/sucesso                        │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│ 7. SUCESSO                                               │
│ Página de confirmação exibida                           │
│ Usuário pode baixar/compartilhar documento assinado    │
└──────────────────────────────────────────────────────────┘
```

---

## ⚙️ Configuração

### 1. Variáveis de Ambiente

Adicionadas em `.env.development`:

```env
# Gov.br OAuth Credentials
GOVBR_CLIENT_ID="seu_client_id_aqui"
GOVBR_CLIENT_SECRET="seu_client_secret_aqui"

# Gov.br URLs (Homologação)
GOVBR_AUTHORIZATION_URL="https://sso.staging.acesso.gov.br/authorize"
GOVBR_TOKEN_URL="https://sso.staging.acesso.gov.br/token"
GOVBR_SIGNATURE_API_URL="https://assinador.staging.acesso.gov.br/api"

# URLs da Aplicação
APP_FRONTEND_URL="http://localhost:3001"
APP_BACKEND_URL="http://localhost:3001"
GOVBR_REDIRECT_URI="http://localhost:3001/api/govbr/callback"
```

### 2. Obter Credenciais Gov.br

**Passo a Passo:**

1. Acesse: https://sso.acesso.gov.br/ (produção) ou https://sso.staging.acesso.gov.br/ (testes)
2. Crie uma conta de desenvolvedor
3. Registre sua aplicação como "OAuth 2.0 Application"
4. Configure a URI de callback: `http://localhost:3001/api/govbr/callback`
5. Receberá: `CLIENT_ID` e `CLIENT_SECRET`
6. Copie para `.env.development`

### 3. Instalar Dependências

```bash
npm install axios
```

(axios já deve estar instalado no projeto)

---

## 📖 Como Usar

### No Componente de Atestados

```tsx
import { GovBrSignatureButton } from '@/components/govbr-signature-button'

export function MyCertificatePage() {
  return (
    <div>
      <h1>Meu Atestado</h1>
      
      <GovBrSignatureButton
        certificateId="cert_123"
        onSuccess={(data) => {
          console.log('Assinado!', data)
          // Recarregar página ou atualizar UI
        }}
        onError={(error) => {
          console.error('Erro:', error)
        }}
      />
    </div>
  )
}
```

### Em Página de Certificados

```tsx
import { CertificateSignatureExample } from '@/components/certificate-signature-example'

export default function CertificatePage() {
  return (
    <CertificateSignatureExample
      certificateId="cert_123"
      certificateNumber="001/2025"
      patientName="João Silva"
    />
  )
}
```

---

## 🧪 Testes

### Teste 1: Fluxo Completo em Staging

```bash
# 1. Iniciar servidor
npm run dev

# 2. Ir para página de certificados
# http://localhost:3001/certificates

# 3. Clicar em "Assinar com Gov.br"

# 4. Verificar redirecionamento para Gov.br
# Console deve exibir:
# [Gov.br] Sessão de assinatura iniciada: {...}

# 5. Seguir fluxo de autenticação no Gov.br

# 6. Voltar para /govbr/sucesso após autorização
```

### Teste 2: Verificar Logs

```bash
# Ver logs no console do backend
tail -f /tmp/next.log

# Procurar por:
# [Gov.br] Sessão de assinatura iniciada
# [Gov.br] Callback recebido
# [Gov.br] Token obtido com sucesso
# [Gov.br] Assinatura finalizada
```

### Teste 3: Validar Assinatura

```bash
# Verificar se assinatura foi armazenada no banco
# A coluna signature deve conter a assinatura em Base64

select 
  id,
  signature_method,
  signature,
  timestamp
from "MedicalCertificate"
where signature_method = 'GOV_BR'
limit 1;
```

---

## 🛡️ Segurança

### Proteções Implementadas

✅ **CSRF Protection**
- Estado aleatório gerado (32 bytes)
- Validação de estado antes de aceitar token

✅ **Validação de Token**
- Comparação timing-safe de states
- Expiração de sessão (10 minutos)
- Código trocado imediatamente por token

✅ **Armazenamento Seguro**
- Assinatura em Base64
- Timestamp registrado
- Audit log completo

✅ **Criptografia**
- SHA-256 para hash de documento
- RSA para assinatura (via Gov.br)

### Boas Práticas

⚠️ **Em Produção:**

```typescript
// NÃO fazer:
const token = request.headers.get('authorization')

// FAZER:
const token = extractJWTFromHeader(request)
validateJWT(token, process.env.JWT_SECRET)

// Usar Redis em vez de Map para sessões
import redis from '@/lib/redis'
await redis.setex(`session:${sessionId}`, 600, JSON.stringify({...}))
```

---

## 📊 Campos no Banco de Dados

### MedicalCertificate

```sql
ALTER TABLE "MedicalCertificate" ADD COLUMN IF NOT EXISTS:
  - signature: String (Base64 da assinatura)
  - signatureMethod: String ('NONE' | 'PKI_LOCAL' | 'GOV_BR')
  - certificateChain: String (cadeia de certificados, opcional)
  - timestamp: DateTime (quando foi assinado)
```

---

## 🔄 Próximas Fases

### Fase 2: Persistência (1 semana)

- [ ] Armazenar sessões em Redis em vez de Map
- [ ] Persistir histórico de assinaturas
- [ ] Implementar renovação de tokens
- [ ] Adicionar suporte a múltiplas assinaturas

### Fase 3: Produção (1-2 semanas)

- [ ] Mudar URLs para ambiente de produção do Gov.br
- [ ] Implementar webhook para notificação de revogação
- [ ] Adicionar suporte a certificados com renovação
- [ ] Dashboard de auditoria de assinaturas

### Fase 4: Integrações (2-4 semanas)

- [ ] Validação externa via Gov.br
- [ ] Integração com Cartório
- [ ] Integração com SUS
- [ ] Suporte a assinatura em lote

---

## 🐛 Troubleshooting

### Erro: "CLIENT_ID não configurado"

```
Solução: Definir GOVBR_CLIENT_ID em .env.development
```

### Erro: "Sessão inválida ou expirada"

```
Solução: Sessões expiram em 10 minutos
Se tomar mais tempo, terá que começar novamente
Aumentar tempo em production conforme necessário
```

### Gov.br retorna "Código inválido"

```
Solução: 
1. Verificar se GOVBR_REDIRECT_URI corresponde ao registrado
2. Certificar que code é usado imediatamente
3. Verificar se timestamp do servidor está correto
```

### Assinatura não aparece no banco

```
Solução:
1. Verificar logs: [Gov.br] Assinatura finalizada
2. Validar se certificateId existe
3. Verificar permissões de banco de dados
```

---

## 📞 Suporte

- **Documentação Gov.br:** https://www.gov.br/cidadao/pt-br/acesso-a-servicos
- **OAuth 2.0 RFC:** https://tools.ietf.org/html/rfc6749
- **Issues do Projeto:** GitHub Issues

---

## ✅ Checklist de Produção

Antes de colocar em produção:

- [ ] Obter credenciais Gov.br production
- [ ] Testar fluxo completo com certificado real
- [ ] Implementar Redis para sessões
- [ ] Adicionar logging estruturado
- [ ] Configurar backup de assinaturas
- [ ] Testar revogação de certificados
- [ ] Implementar monitoramento
- [ ] Documentar processo de renovação
- [ ] Treinar equipe de suporte
- [ ] Realizar teste de carga

---

**Implementação realizada com ❤️ para o projeto HealthCare**

# Passo a Passo: Cadastro do Aplicativo no Gov.br

## Pré-requisitos

- [ ] Domínio com certificado SSL/TLS válido (HTTPS obrigatório)
- [ ] Aplicação acessível publicamente na internet
- [ ] CPF e e-mail válidos do responsável técnico
- [ ] Conta gov.br nível prata ou ouro (pode exigir biometria)
- [ ] CNPJ da instituição (se for pessoa jurídica)

---

## Etapa 1: Acesso ao Portal de Desenvolvedores Gov.br

### 1.1 Acesse o portal
- URL de produção: https://sso.acesso.gov.br
- URL de homologação: https://sso.staging.acesso.gov.br (ou https://h.acesso.gov.br)
- Documentação oficial: https://manual-roteiro-integracao-login-unico.servicos.gov.br/

### 1.2 Faça login
- Use sua conta Gov.br (nível prata ou ouro recomendado)
- Se não tiver, crie em: https://acesso.gov.br

### 1.3 Acesse a área de desenvolvedores
- Procure por "API" ou "Desenvolvedores" no menu
- Ou acesse: https://api.staging.acesso.gov.br (homologação)

---

## Etapa 2: Solicitar Credenciais de Homologação

### 2.1 Preencher formulário de cadastro
Informações necessárias:

**Dados do Responsável:**
- Nome completo
- CPF
- E-mail
- Telefone

**Dados da Aplicação:**
- Nome do sistema: "HealthCare - Prontuário Eletrônico"
- Descrição: "Sistema de prontuário eletrônico do paciente com assinatura digital de atestados médicos via Gov.br"
- Tipo: "Aplicação Web"
- Ambiente: "Homologação" (primeiro)

**URLs de Callback (Redirecionamento):**
```
https://seu-dominio.com.br/api/govbr/callback
https://seu-dominio.com.br/api/auth/callback/govbr
```
⚠️ **IMPORTANTE**: Substitua `seu-dominio.com.br` pelo seu domínio real

**Escopos solicitados:**
- `openid` - Identificação do usuário
- `email` - E-mail do usuário
- `profile` - Nome e dados do perfil
- `signature_session` - Assinatura digital (se disponível)

### 2.2 Aguardar aprovação
- Prazo: 3 a 10 dias úteis
- Você receberá por e-mail:
  - `client_id` (ID do cliente)
  - `client_secret` (chave secreta)
  - Endpoints oficiais (Authorization, Token, UserInfo)

---

## Etapa 3: Configurar Variáveis de Ambiente

Após receber as credenciais, configure no arquivo `.env`:

```bash
# ============================================
# GOV.BR - HOMOLOGAÇÃO
# ============================================

# URLs base (homologação)
GOVBR_AUTHORIZATION_URL=https://sso.staging.acesso.gov.br/authorize
GOVBR_TOKEN_URL=https://sso.staging.acesso.gov.br/token
GOVBR_USERINFO_URL_LOGIN=https://sso.staging.acesso.gov.br/userinfo

# Credenciais de assinatura digital
GOVBR_CLIENT_ID=seu_client_id_aqui
GOVBR_CLIENT_SECRET=seu_client_secret_aqui
GOVBR_REDIRECT_URI=https://seu-dominio.com.br/api/govbr/callback

# Credenciais de login (podem ser as mesmas ou separadas)
GOVBR_CLIENT_ID_LOGIN=seu_client_id_aqui
GOVBR_CLIENT_SECRET_LOGIN=seu_client_secret_aqui

# API de assinatura digital (aguardar documentação do Gov.br)
GOVBR_SIGNATURE_API_URL=https://assinatura.staging.gov.br/api/sign

# URL pública do frontend
APP_FRONTEND_URL=https://seu-dominio.com.br

# Sessão (tempo de expiração em segundos)
GOVBR_SESSION_TTL_SECONDS=600

# Redis (para persistir sessões OAuth)
REDIS_URL=redis://localhost:6379
# OU
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

---

## Etapa 4: Preparar Infraestrutura

### 4.1 Certificado SSL/TLS
```bash
# Se usar Let's Encrypt (Certbot)
sudo certbot certonly --standalone -d seu-dominio.com.br

# Ou configure reverse proxy (nginx/caddy) com SSL
```

### 4.2 Iniciar Redis
```bash
# Se usar Docker Compose (já configurado no projeto)
docker compose up -d redis

# Verificar se está rodando
docker compose ps redis

# Testar conexão
redis-cli ping
# Deve retornar: PONG
```

### 4.3 Verificar domínio e callback
```bash
# Teste se o callback está acessível
curl -I https://seu-dominio.com.br/api/govbr/callback

# Deve retornar 405 (Method Not Allowed) ou 200
# NÃO pode retornar 404 ou erro de SSL
```

---

## Etapa 5: Teste no Ambiente de Homologação

### 5.1 Criar atestado de teste
1. Acesse o sistema
2. Crie um atestado médico
3. Gere o PDF do atestado
4. Verifique que o campo `pdfHash` foi preenchido no banco

### 5.2 Testar fluxo de assinatura
1. Clique no botão "Assinar com Gov.br"
2. Será redirecionado para `https://sso.staging.acesso.gov.br/authorize`
3. Faça login com sua conta Gov.br
4. Autorize o acesso aos escopos solicitados
5. Será redirecionado de volta para `/api/govbr/callback`
6. Verifique o redirecionamento final para `/govbr/sucesso`

### 5.3 Verificar no banco de dados
```sql
-- Verificar se a assinatura foi gravada
SELECT 
  id, 
  sequenceNumber, 
  signatureMethod, 
  signature, 
  digitalSignature,
  timestamp
FROM "MedicalCertificate"
WHERE id = 'ID_DO_CERTIFICADO';
```

### 5.4 Logs para debug
```bash
# Acompanhar logs do servidor
docker compose logs -f app

# Procurar por:
# [Gov.br] Sessão de assinatura iniciada
# [Gov.br] Callback recebido
# [Gov.br] Token obtido com sucesso
# [Gov.br] Assinatura finalizada e armazenada
```

---

## Etapa 6: Solicitar Acesso à Produção

### 6.1 Documentação necessária
Prepare os seguintes documentos:

1. **Termo de Responsabilidade**
   - Documento assinado pelo responsável legal
   - Comprometendo-se com LGPD e segurança

2. **Política de Privacidade**
   - Como os dados serão usados
   - Retenção e exclusão de dados
   - Direitos dos usuários

3. **Evidências de Homologação**
   - Prints do fluxo completo
   - Logs de sucesso
   - Vídeo demonstrativo (opcional, mas recomendado)

4. **Dados da Instituição**
   - CNPJ ou CPF
   - Razão social
   - Endereço completo
   - Responsável técnico e contatos

### 6.2 Enviar solicitação
- Acesse o portal de desenvolvedores
- Selecione "Migrar para Produção"
- Anexe a documentação
- Aguarde aprovação (10 a 30 dias)

### 6.3 Receber credenciais de produção
Após aprovação:
- Novos `client_id` e `client_secret` (produção)
- Endpoints de produção

---

## Etapa 7: Configurar Produção

### 7.1 Atualizar variáveis de ambiente
```bash
# ============================================
# GOV.BR - PRODUÇÃO
# ============================================

# URLs base (produção)
GOVBR_AUTHORIZATION_URL=https://sso.acesso.gov.br/authorize
GOVBR_TOKEN_URL=https://sso.acesso.gov.br/token
GOVBR_USERINFO_URL_LOGIN=https://sso.acesso.gov.br/userinfo

# Credenciais de produção (diferentes das de homologação)
GOVBR_CLIENT_ID=client_id_producao
GOVBR_CLIENT_SECRET=client_secret_producao
GOVBR_REDIRECT_URI=https://seu-dominio.com.br/api/govbr/callback

GOVBR_CLIENT_ID_LOGIN=client_id_producao
GOVBR_CLIENT_SECRET_LOGIN=client_secret_producao

# API de assinatura (produção)
GOVBR_SIGNATURE_API_URL=https://assinatura.acesso.gov.br/api/sign

APP_FRONTEND_URL=https://seu-dominio.com.br
```

### 7.2 Testar em produção
Repita os testes da Etapa 5, mas agora com usuários reais e dados reais.

---

## Checklist Final

Antes de liberar para uso clínico:

- [ ] Credenciais de produção configuradas
- [ ] HTTPS válido e funcionando
- [ ] Redis em produção (não memória)
- [ ] Backup automático configurado
- [ ] Logs de auditoria ativados
- [ ] Política de privacidade publicada
- [ ] Termo de consentimento do paciente
- [ ] Teste com médico real assinando atestado real
- [ ] Validação de assinatura funcionando
- [ ] QR Code de validação funcionando
- [ ] Conformidade com CFM (Resolução 1.821/2007 e 2.299/2021)
- [ ] Conformidade com LGPD (Lei 13.709/2018)
- [ ] Plano de continuidade (fallback se Gov.br cair)

---

## Contatos de Suporte

### Gov.br
- Portal: https://www.gov.br/governodigital/
- E-mail: suporte.login.unico@economia.gov.br
- Documentação: https://manual-roteiro-integracao-login-unico.servicos.gov.br/

### SERPRO (Provedor do Gov.br)
- Site: https://www.serpro.gov.br/
- Atendimento: https://www.serpro.gov.br/menu/contato

---

## Observações Importantes

### ⚠️ Segurança
1. **NUNCA** commite `client_secret` no Git
2. Use variáveis de ambiente ou secrets manager
3. Ative rate limiting no Redis
4. Monitore tentativas de fraude
5. Implemente logs de auditoria

### 📋 Conformidade
1. Consulte o CFM sobre validade jurídica de atestados digitais
2. Alguns estados exigem CRM eletrônico para assinatura digital
3. Verifique legislação local antes de usar em produção
4. Mantenha cópia física/PDF assinado por 20 anos (prazo legal)

### 🔄 Manutenção
1. Renove certificados SSL antes do vencimento
2. Atualize credenciais Gov.br se houver rotação
3. Monitore logs de erro no callback
4. Teste mensalmente o fluxo completo
5. Mantenha backup do Redis (sessões críticas)

---

## Próximos Passos

Após cadastro aprovado:

1. **Configurar geração do PDF com hash**
   - Garantir que `pdfHash` seja sempre preenchido
   - Usar SHA-256 base64 do PDF final

2. **Ajustar API de assinatura**
   - Adaptar `finalizeSignature()` ao contrato real
   - Validar cadeia de certificados ICP-Brasil
   - Implementar carimbo de tempo

3. **Implementar validação de assinatura**
   - Criar endpoint `/api/certificates/validate/signature`
   - Verificar cadeia ICP-Brasil
   - Exibir dados do certificado digital

4. **Conformidade legal**
   - Revisar com jurídico
   - Adicionar termos de uso
   - Implementar consentimento LGPD

---

**Última atualização**: Dezembro 2025
**Versão do guia**: 1.0

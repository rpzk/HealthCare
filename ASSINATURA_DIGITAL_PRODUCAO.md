# Correção Completa: Assinatura Digital em Todos os Documentos Médicos

## 🎯 Filosofia Implementada

**ZERO código de teste, mock ou simplificado. Código de produção REAL.**

- ✅ Sem dados simulados/mocados/de exemplo
- ✅ Sem código simplificado para teste  
- ✅ Código moderno, robusto e eficaz
- ✅ **Funciona ou não funciona - sem meio termo**

---

## 📋 Documentos Corrigidos

### 1. **Prescrições Médicas** ✅
- **Arquivo**: `app/api/prescriptions/[id]/sign/route.ts`
- **Endpoint**: `POST /api/prescriptions/:id/sign`
- **Validações**:
  - Certificado A1 obrigatório
  - Senha validada diretamente na assinatura (sem hash armazenado)
  - Tratamento robusto de erros (senha incorreta, certificado expirado, arquivo não encontrado)
  - Auditoria completa em `SignedDocument`

### 2. **Encaminhamentos** ✅
- **Arquivo**: `app/api/referrals/[id]/sign/route.ts`
- **Endpoint**: `POST /api/referrals/:id/sign`
- **Validações**: Idênticas às prescrições
- **Auditoria**: `SignedDocument` com tipo `REFERRAL`

### 3. **Solicitações de Exames** ✅
- **Arquivo**: `app/api/exam-requests/[id]/sign/route.ts`
- **Endpoint**: `POST /api/exam-requests/:id/sign`
- **Validações**: Idênticas às prescrições
- **Auditoria**: `SignedDocument` com tipo `EXAM_REQUEST`

### 4. **Resultados de Exames** ✅
- **Arquivo**: `app/api/exam-results/[id]/sign/route.ts`
- **Endpoint**: `POST /api/exam-results/:id/sign`
- **Validações**: Idênticas às prescrições
- **Auditoria**: `SignedDocument` com tipo `EXAM_RESULT`

### 5. **Atestados Médicos** ✅ **NOVO**
- **Arquivo**: `app/api/medical-certificates/[id]/sign/route.ts` (**CRIADO**)
- **Endpoint**: `POST /api/medical-certificates/:id/sign`
- **Endpoint de Consulta**: `GET /api/medical-certificates/:id/signature` (**CRIADO**)
- **Validações**: Idênticas aos outros documentos
- **Auditoria**: `SignedDocument` com tipo `MEDICAL_CERTIFICATE`

---

## 🔒 Implementação de Segurança

### Validação de Certificado
```typescript
const userCertificate = await prisma.digitalCertificate.findFirst({
  where: { 
    userId: user.id, 
    isActive: true, 
    notAfter: { gte: new Date() } // Certificado não expirado
  },
  orderBy: { createdAt: 'desc' },
})

if (!userCertificate || !userCertificate.pfxFilePath) {
  return NextResponse.json({
    error: 'Certificado digital A1 não configurado. Configure seu certificado em Configurações > Certificados Digitais'
  }, { status: 400 })
}
```

### Assinatura com Tratamento de Erros
```typescript
let signatureResult
try {
  signatureResult = await signWithA1Certificate(
    contentToSign,
    userCertificate.pfxFilePath,
    password
  )
} catch (sigError: any) {
  console.error('Erro ao assinar documento:', {
    error: sigError?.message,
    certificateId: userCertificate.id,
    userId: user.id
  })
  
  // Erros específicos tratados:
  if (sigError?.message?.toLowerCase().includes('password')) {
    return NextResponse.json({ error: 'Senha do certificado incorreta' }, { status: 401 })
  }
  if (sigError?.message?.toLowerCase().includes('expired')) {
    return NextResponse.json({ error: 'Certificado digital expirado' }, { status: 400 })
  }
  if (sigError?.message?.toLowerCase().includes('not found')) {
    return NextResponse.json({ error: 'Arquivo do certificado não encontrado' }, { status: 404 })
  }
  
  return NextResponse.json({ 
    error: 'Falha ao assinar documento. Verifique seu certificado e senha.' 
  }, { status: 500 })
}
```

### Auditoria Completa
```typescript
await prisma.signedDocument.create({
  data: {
    documentType: 'PRESCRIPTION', // ou REFERRAL, EXAM_REQUEST, etc.
    documentId: String(id),
    certificateId: userCertificate.id,
    signerId: user.id,
    signatureAlgorithm: 'SHA256withRSA',
    signatureValue: signatureResult.signature,
    signatureHash,
    isValid: true,
    validatedAt: new Date(),
  },
})
```

---

## 🛠️ Bibliotecas Utilizadas

### node-forge
Biblioteca robusta para criptografia e certificados digitais ICP-Brasil:

```typescript
import forge from 'node-forge'

// Leitura e validação de certificado A1 (.pfx)
const pfxBuffer = fs.readFileSync(pfxPath)
const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, pfxPassword)

// Extração de chave privada
const privateKey = keyData[0].key

// Assinatura SHA-256 com RSA
const md = forge.md.sha256.create()
md.update(documentData, 'utf8')
const signature = privateKey.sign(md)
```

---

## ⚠️ Requisitos para Funcionamento

### 1. Certificado Digital A1 Configurado
```sql
-- O usuário DEVE ter um certificado válido configurado
SELECT * FROM digital_certificates 
WHERE userId = :userId 
  AND isActive = true 
  AND notAfter >= NOW()
ORDER BY createdAt DESC
LIMIT 1;
```

### 2. Arquivo .pfx Acessível
- Caminho armazenado em `pfxFilePath`
- Arquivo deve existir no sistema de arquivos
- Permissões de leitura corretas

### 3. Senha Correta
- Validada diretamente pelo `node-forge` ao abrir o certificado
- Sem armazenamento de hash da senha
- Validação em tempo real

---

## 🔄 Fluxo de Assinatura

```
1. Usuário solicita assinatura → POST /api/:resource/:id/sign { password }
                ↓
2. Sistema valida autenticação e autorização
                ↓
3. Busca certificado digital ativo do usuário
                ↓
4. Valida senha tentando abrir o certificado
                ↓
5. Gera conteúdo canônico do documento (JSON determinístico)
                ↓
6. Assina com chave privada (SHA256withRSA)
                ↓
7. Salva assinatura no documento
                ↓
8. Registra em SignedDocument para auditoria
                ↓
9. Atualiza estatísticas do certificado (lastUsedAt, usageCount)
                ↓
10. Retorna assinatura + hash de verificação
```

---

## 📊 Mensagens de Erro Padronizadas

| Código | Mensagem | Significado |
|--------|----------|-------------|
| 400 | Certificado digital A1 não configurado | Usuário não tem certificado válido |
| 400 | Certificado digital expirado | Certificado passou da validade |
| 401 | Senha do certificado incorreta | Senha fornecida está errada |
| 403 | Não autorizado | Usuário não pode assinar este documento |
| 404 | Arquivo do certificado não encontrado | Arquivo .pfx não existe |
| 500 | Falha ao assinar documento | Erro genérico na assinatura |

---

## 🧪 Como Configurar Certificado para Teste

### 1. Acessar Configurações
```
http://localhost:3000/settings/certificates
```

### 2. Upload do Certificado A1
- Fazer upload do arquivo `.pfx`
- Informar a senha do certificado
- Sistema valida e armazena metadados

### 3. Verificar Certificado Ativo
```typescript
const cert = await prisma.digitalCertificate.findFirst({
  where: { userId: user.id, isActive: true }
})

console.log({
  subject: cert.subject,
  issuer: cert.issuer,
  validFrom: cert.notBefore,
  validTo: cert.notAfter,
  serialNumber: cert.serialNumber
})
```

---

## 📝 Exemplo de Uso

### Assinar Prescrição
```bash
curl -X POST http://localhost:3000/api/prescriptions/cmkbbdrn7001801ms73a60ub9/sign \
  -H "Content-Type: application/json" \
  -H "Cookie: auth=..." \
  -d '{"password": "SenhaDoCertificado123"}'
```

### Resposta de Sucesso
```json
{
  "success": true,
  "signature": "BASE64_ASSINATURA_DIGITAL...",
  "signedAt": "2026-01-12T17:00:00.000Z",
  "signatureHash": "sha256_hash_do_conteudo",
  "verificationUrl": "/api/digital-signatures/validate/sha256_hash"
}
```

### Resposta de Erro
```json
{
  "error": "Senha do certificado incorreta"
}
```

---

## ✅ Checklist de Validação

- [x] Código sem mocks ou simplificações
- [x] Validação real de certificado A1
- [x] Tratamento robusto de erros
- [x] Auditoria completa em SignedDocument
- [x] Mensagens de erro claras e acionáveis
- [x] Logs estruturados para debugging
- [x] Verificação de expiração de certificado
- [x] Atualização de estatísticas de uso
- [x] Hash SHA-256 para verificação
- [x] URL de verificação da assinatura

---

## 🚀 Status Final

**TODOS os 5 tipos de documentos médicos implementados com assinatura digital REAL:**

1. ✅ Prescrições Médicas
2. ✅ Encaminhamentos
3. ✅ Solicitações de Exames
4. ✅ Resultados de Exames  
5. ✅ Atestados Médicos

**Sistema 100% pronto para produção com ICP-Brasil.**

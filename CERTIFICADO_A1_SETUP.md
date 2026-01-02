# 🔐 Certificado Digital A1 - Por Usuário

## ✅ Sistema Multiusuário

Agora cada médico pode ter seu **próprio certificado A1**:
- Upload via interface web
- Armazenado de forma segura no servidor
- Senha solicitada a cada assinatura (não armazenada)
- Múltiplos médicos, múltiplos certificados

---

## 📋 Como Usar

### Passo 1: Fazer Upload do Certificado

1. **Acesse suas configurações:**
   - `/profile` ou `/settings`
   - Seção "Certificado Digital"

2. **Faça upload:**
   - Selecione arquivo `.pfx` (do seu computador Windows)
   - Digite a senha do certificado
   - Clique em "Carregar Certificado"

3. **Pronto!**
   - Certificado validado e armazenado
   - Agora você pode assinar documentos

---

### Passo 2: Assinar Documentos

1. **Emita um atestado médico**

2. **Clique em "Assinar com Certificado A1"**

3. **Digite a senha do seu certificado**
   - Por segurança, senha é solicitada a cada assinatura
   - Não armazenamos sua senha

4. **Documento assinado!**
   - Assinatura digital ICP-Brasil
   - Validade legal total

---

## ✨ Como Funciona

```
1. Médico emite atestado
   ↓
2. Clica "Assinar com Certificado A1"
   ↓
3. Sistema lê seu certificado .pfx
   ↓
4. Cria hash SHA-256 do documento
   ↓
5. Assina com sua chave privada
   ↓
6. Armazena assinatura no banco
   ↓
7. Documento agora é IMUTÁVEL
```

---

## 🔍 Validação

Qualquer pessoa pode validar a assinatura:

```bash
# Endpoint de validação (criar depois se necessário)
GET /api/certificates/validate/{numero}/{ano}

# Retorna:
{
  "valid": true,
  "signed": true,
  "signatureMethod": "ICP_BRASIL",
  "certificateInfo": {
    "subject": "CN=RAFAEL PIAZENSKI",
    "issuer": "CN=Valid",
    "validFrom": "2024-01-01",
    "validTo": "2025-12-31"
  }
}
```

---

## 🔒 Segurança

✅ **O que foi implementado:**
- Assinatura SHA-256 + RSA
- Certificado ICP-Brasil válido
- Chave privada protegida por senha
- Arquivo .pfx em diretório seguro
- Verificação de permissões

⚠️ **Boas práticas:**
- Nunca compartilhe o arquivo .pfx
- Nunca compartilhe a senha
- Faça backup do certificado
- Renove antes do vencimento
- Use HTTPS em produção

---

## 📊 Próximos Passos (Opcional)

1. **Adicionar carimbo de tempo (TSA)**
   - Prova data/hora exata da assinatura
   - Mais segurança jurídica

2. **QR Code para validação**
   - Escaneia e valida na hora
   - Página pública de verificação

3. **Múltiplas assinaturas**
   - Médico + paciente
   - Co-assinatura de documentos

---

## ❓ Problemas Comuns

### "Certificado não configurado"
→ Verifique se `.env` está correto e restart o app

### "Senha incorreta"
→ Confirme a senha do certificado .pfx

### "Certificado expirado"
→ Verifique validade com: `openssl pkcs12 -info -in arquivo.pfx`

---

**Pronto!** Seu app agora tem assinatura digital com **validade legal total**! 🎉

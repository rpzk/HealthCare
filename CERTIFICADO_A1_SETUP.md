# 🔐 Certificado digital A1 (.pfx/.p12) — upload e uso (estado atual)

Este documento descreve **o que está implementado no código** hoje, sem prometer validade jurídica, conformidade regulatória ou formatos padronizados (PAdES/CAdES).

## ✅ Upload do certificado (implementado)

- Endpoint: `POST /api/certificates/upload-a1` (multipart/form-data)
  - Campos: `file` (arquivo `.pfx`/`.p12`) e `password` (senha do certificado)
  - O endpoint valida se o certificado está dentro da janela de validade (`notBefore`/`notAfter`).
- Armazenamento:
  - O arquivo é salvo em `uploads/certificates/` (volume persistente no deploy Docker).
  - O caminho é gravado no banco em `DigitalCertificate.pfxFilePath`.
- Metadados gravados no banco:
  - `subject`, `issuer`, `serialNumber`, `notBefore`, `notAfter`, `certificatePem`, `publicKeyPem`.
- Senha:
  - A senha **não é armazenada em texto**.
  - O sistema atualmente grava um **hash SHA-256** da senha em `DigitalCertificate.pfxPasswordHash`.

## 🧭 Onde fica na interface

Na UI, o gerenciamento de certificados aparece na tela de configurações em `/settings` (seção de certificados digitais).

## ✍️ Assinatura de documentos (implementado)

Existe assinatura baseada em RSA/SHA-256 usando a chave privada do `.pfx`.

Rotas de assinatura existentes no código:
- `POST /api/prescriptions/[id]/sign`
- `POST /api/referrals/[id]/sign`
- `POST /api/exam-requests/[id]/sign`
- `POST /api/exam-results/[id]/sign`
- `POST /api/medical-certificates/[id]/sign`

Observação: essas rotas pedem a senha no request e usam `signWithA1Certificate` para assinar um conteúdo canônico.

## 🔎 Validação (implementado com limitações)

Há um endpoint de validação por hash: `GET /api/digital-signatures/validate/[hash]`.

Ele valida **metadados** e a janela de validade do certificado (ativo e dentro do período), mas **não faz verificação criptográfica completa do conteúdo original**.

## ⚠️ Limitações / não implementado

- Não gera um container padrão ICP-Brasil (ex.: PAdES/CAdES).
- Não implementa TSA (carimbo de tempo) ou validação completa de cadeia/AC.
- A validação completa depende de ter o conteúdo original assinado e de um processo de verificação dedicado.

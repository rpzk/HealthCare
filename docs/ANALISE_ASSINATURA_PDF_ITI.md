# Análise: por que o ITI não valida nossas assinaturas (e o que a Memed faz certo)

## Referência: PDF Memed

O arquivo `docs/0f77fa4e-bc44-4832-b76a-a92f9acf1c26.pdf` é um exemplo de receita **assinada digitalmente e válida** no validar.iti.gov.br. Ele contém:

- **Tokens/assinatura embebidos no próprio PDF**: o validador do ITI lê o arquivo e encontra uma assinatura PAdES (Filter/SubFilter, ByteRange, `/Contents` com PKCS#7).
- **Certificado e cadeia** dentro do PKCS#7, permitindo ao ITI validar a cadeia ICP-Brasil.
- **ByteRange** correto: o hash é calculado sobre os bytes exatos do PDF (excluindo o trecho de `/Contents`), então a assinatura protege o conteúdo do documento.

Ou seja: a assinatura que o ITI reconhece está **dentro do arquivo PDF**, não em um banco de dados externo.

---

## Onde estamos errando

### 1. Fluxo atual de “assinar prescrição” (`POST /api/prescriptions/[id]/sign`)

Hoje esse endpoint:

1. Monta um JSON com `{ id, medications, patientId, doctorId, date }`.
2. Chama `signWithA1Certificate(contentToSign, pfxPath, password)`.
3. `signWithA1Certificate` (em `lib/certificate-a1-signer.ts`):
   - Faz hash SHA-256 **desse texto JSON**.
   - Assina o hash com a chave privada do A1 (RSA).
   - Retorna a assinatura em Base64.
4. A assinatura é gravada no banco (`prescription.digitalSignature`, `SignedDocument.signatureValue`, etc.).
5. **Nenhum PDF é gerado nem assinado.** Nenhum arquivo é escrito em `uploads/documents/prescription/{id}.pdf`.

Consequência: a “assinatura” que guardamos é de um **conteúdo JSON**, não do **PDF**. O ITI só valida assinaturas que estão **dentro do PDF** (PAdES). Por isso a mensagem: *“documento sem assinatura reconhecível ou com assinatura corrompida”*.

### 2. O que o ITI (e o PDF da Memed) esperam

Para o validar.iti.gov.br aceitar, o **próprio arquivo PDF** precisa ter:

| Elemento | Descrição |
|--------|------------|
| **Filter** | Ex.: `Adobe.PPKLite` ou `Adobe.PPKMS` |
| **SubFilter** | Ex.: `adbe.pkcs7.detached` (ou ETSI.CAdES.detached) |
| **ByteRange** | Array de pares [offset, length] que definem os bytes usados no hash (todo o PDF exceto o bloco de `/Contents`) |
| **/Contents** | Conteúdo binário da assinatura PKCS#7 (certificado do signatário + cadeia intermediária/raiz, assinatura, etc.) |

Ou seja: **assinatura PAdES embutida no PDF**, com certificado (e preferencialmente cadeia) dentro do PKCS#7. O PDF da Memed segue esse modelo; o nosso fluxo atual não gera esse PDF.

### 3. Quem grava o PDF em disco?

- `lib/documents/service.ts` → `saveSignedDocument()` grava em `uploads/documents/{tipo}/{id}.pdf` **somente** quando usamos o serviço de documentos (ex.: `createPrescription()` do módulo documents).
- O fluxo da tela de prescrição (botão “Assinar”) usa **apenas** `POST /api/prescriptions/[id]/sign`, que **não** chama `createPrescription` nem `saveSignedDocument`.
- Por isso, para prescrições assinadas por esse fluxo, o arquivo `uploads/documents/prescription/{id}.pdf` **não chega a ser criado** (ou não é o PDF assinado com PAdES).

Quando o usuário abre “Ver PDF” ou o link do PDF:

- A rota `GET /api/prescriptions/[id]/pdf` verifica se existe `SignedDocument` e tenta ler `uploads/documents/prescription/{id}.pdf`.
- Se o arquivo não existir (ou não tiver sido gerado com PAdES), a rota pode devolver PDF gerado **on-the-fly**, **sem assinatura embutida** → o ITI continua não reconhecendo.

---

## O que precisamos fazer (alinhado ao que a Memed faz)

Para que o documento seja **válido no ITI** e contenha “tokens”/assinatura no próprio PDF:

1. **No momento em que o médico clica em “Assinar” (prescrição)**:
   - Gerar o **PDF** da prescrição (ex.: `generatePrescriptionPdf`).
   - Assinar **esse PDF** com **PAdES** (ex.: `signPdfWithPAdES` em `lib/documents/pades-signer.ts`), que usa `@signpdf` e coloca Filter/SubFilter, ByteRange e PKCS#7 no PDF.
   - Salvar o **PDF já assinado** em `uploads/documents/prescription/{id}.pdf`.
   - Manter o registro em `SignedDocument` (hash do PDF assinado, certificado, etc.) para nossa página de conferência interna.

2. **Manter a senha do certificado apenas no fluxo de assinatura**  
   O PAdES precisa do A1 para assinar; depois disso, o PDF já traz a assinatura embutida e pode ser servido sem senha.

3. **Implementado (melhorias)**  
   - **Cadeia completa no PKCS#7:** O `@signpdf/signer-p12` já inclui **todos os certificados** do .pfx no PKCS#7. Para o ITI validar a cadeia, o médico deve **exportar o certificado com “incluir cadeia completa”**. Foi adicionado `getCertificateChainCount(pfxBuffer, password)`, que conta os certs no P12 e registra aviso no log se houver apenas 1.  
   - **PAdES-T (DocTimeStamp no PDF):** Carimbo de tempo incorporado ao PDF:  
     - `lib/documents/doc-timestamp.ts`: `appendDocTimeStampToPdf(pdfBuffer, timestampToken)` anexa revisão incremental com assinatura DocTimeStamp (SubFilter ETSI.RFC3161).  
     - `signPdfWithPAdESAndOptionalTimestamp`: assina com PAdES-B e, se TSA estiver configurada (`TSA_URL` ou TSA em dev), incorpora o DocTimeStamp no PDF.  
     - O fluxo de assinatura de prescrição usa essa função com `includeTimestamp: true`.  
   - Para habilitar TSA em produção: definir `TSA_URL` (ex.: ACT Certisign, ACT Valid). Em desenvolvimento, usa FreeTSA quando TSA_URL não está definida.

---

## Resumo

| Aspecto | Memed (válido no ITI) | Nosso fluxo atual |
|--------|------------------------|-------------------|
| Onde está a assinatura? | **Dentro do PDF** (PAdES) | No banco (assinatura do JSON) |
| PDF servido em `/pdf` | Arquivo único, já assinado | Pode ser gerado on-the-fly, **sem** assinatura no arquivo |
| Validador ITI | Reconhece assinatura no PDF | Não encontra assinatura reconhecível |

---

## Se o ITI ainda rejeitar ("assinatura não reconhecível ou corrompida")

1. **SubFilter:** O sistema usa por padrão `adbe.pkcs7.detached` (compatível com o validador e com o plugin PAdES/Adobe AATL do ITI). Se tiver definido `PADES_SUBFILTER=etsi`, remova ou use `PADES_SUBFILTER=adbe`.
2. **Certificado:** O .pfx deve ter sido exportado com **"incluir cadeia completa"** (AC intermediária + raiz). Sem isso o ITI não consegue validar a cadeia.
3. **ByteRange:** Use `npx tsx scripts/inspect-prescription-pdf.ts uploads/documents/prescription/<id>.pdf` para conferir se o ByteRange está consistente com o tamanho do arquivo.
4. **Alternativa oficial:** O ITI oferece o [plugin PAdES](https://www.gov.br/iti/pt-br/aplicativos/111-aplicativos/4105-plugin-pades). Para produção crítica, pode ser necessário integrar com uma solução certificada (ex.: API GOV.BR Assinatura).

**Conclusão:** Para ficarmos alinhados ao que a Memed faz e ao que o ITI valida, precisamos que o **fluxo de assinatura de prescrição** gere o PDF, assine-o com PAdES (assinatura embutida no arquivo) e salve esse PDF em disco; a partir daí, o mesmo arquivo servido em “Ver PDF” / link será o que o usuário pode enviar ao validar.iti.gov.br.

# Guia de Geração de Documentos Médicos - Padrões CFM

## 📋 Visão Geral

Este sistema implementa a geração de prescrições médicas eletrônicas conforme os padrões do Conselho Federal de Medicina (CFM), respeitando:

- Manual de Orientações Básicas para Prescrição Médica (CFM)
- Portaria SVS/MS nº 344/98 (Medicamentos Controlados)
- Resolução CFM nº 2.299/2021 (Assinatura Digital)
- NBR ISO/IEC 32000-1:2015 (Especificação PDF)

## 🏗️ Arquitetura

### Arquivos Principais

| Arquivo | Responsabilidade |
|---------|-----------------|
| `.cursorrules` | Instruções para IA/Copilot - Padrões normativos |
| `components/prescriptions/medical-prescription-cfm.tsx` | Componente React com layout conforme CFM |
| `lib/prescription-cfm-validator.ts` | Validação de regras de negócio (medicamentos controlados, antimicrobianos) |
| `app/api/prescriptions/generate-cfm/route.ts` | Endpoint para geração com assinatura digital |

### Pipeline de Processamento

```
Entrada (JSON)
    ↓
[1] Validação Schema (Zod)
    ↓
[2] Detecção Automática (Controlado? Antimicrobiano?)
    ↓
[3] Validação de Regras CFM
    ↓
[4] Renderização HTML (React → String)
    ↓
[5] Aplicação de Estilos CSS
    ↓
[6] Assinatura Digital (Gotenberg + Certificado A1)
    ↓
[7] Armazenamento (Banco + PDF)
    ↓
Saída (PDF Assinado)
```

## 📝 Estrutura Obrigatória de Prescrição

### 1. CABEÇALHO
```
┌─────────────────────────────────┐
│  Dr. João Silva                 │
│  Médico - CRM-SP 12345          │
│  RQE 54321 - Clínica Geral      │
│  Rua das Flores, 123 - São Paulo│
└─────────────────────────────────┘
```

**Elementos obrigatórios:**
- Nome completo em MAIÚSCULAS
- CRM com estado
- RQE (se especialista)
- Endereço completo
- Logo (se aplicável)

### 2. SUPERINSCRIÇÃO
```
Paciente: Maria Santos
Idade: 34 anos
CPF: 123.456.789-01
Data de Nascimento: 15/05/1990

                [USO INTERNO]
```

**Elementos obrigatórios:**
- Nome do paciente
- Idade e data de nascimento
- CPF (recomendado)
- Indicação de USO INTERNO ou EXTERNO

### 3-5. INSCRIÇÃO + SUBINSCRIÇÃO + ADSCRIÇÃO
```
1. Amoxicilina 500mg (cápsula)
   Quantidade: 20 (vinte) cápsulas
   Posologia: 1 cápsula por via oral a cada 8 horas,
              não excedendo 3 doses ao dia
   Observações: Tomar com água. Evitar alimentos ácidos.
   ⚕️ ANTIMICROBIANO

2. Diazepam 5mg (comprimido)
   Quantidade: 10 (dez) comprimidos
   Posologia: 1 comprimido por via oral ao deitar,
              não excedendo 1 dose ao dia
   🔒 CONTROLADO (Portaria 344/98 - Lista B1)
```

**Elementos obrigatórios:**
- Nome do fármaco (DCB/Genérico)
- Concentração e forma farmacêutica
- Quantidade em algarismos + por extenso (se controlado)
- Posologia detalhada com intervalo e limite de doses
- Indicação se controlado/antimicrobiano

### 6. FECHAMENTO
```
São Paulo, 01 de fevereiro de 2026

        ┌────────────────┐
        │   Dr. João     │
        │   Silva        │
        │ CRM-SP 12345   │
        │ RQE 54321      │
        └────────────────┘

         [QR CODE]
    Prescrição eletrônica assinada
    digitalmente. Verifique em
    verificador.iti.br

    ✓ Documento assinado conforme
      Resolução CFM nº 2.299/2021
    SHA-256: abc123...
    Timestamp: 2026-02-01T10:30:00Z
```

## 🔬 Regras de Medicamentos Específicos

### Antimicrobianos (Antibióticos)

**Regra:** Gerar DUAS vias automaticamente

```typescript
{
  name: "Amoxicilina",
  concentration: "500mg",
  quantity: 20,
  quantityUnit: "cápsula",
  isAntimicrobial: true,
  // Sistema gera automaticamente:
  // Via 1: "1ª VIA - RETENÇÃO DA FARMÁCIA"
  // Via 2: "2ª VIA - ORIENTAÇÃO DO PACIENTE"
  // Validade: 10 dias
}
```

**Validação:**
- ✅ Tipo de via definido
- ✅ Validade calculada (10 dias)
- ✅ Quantidade clara

### Medicamentos Controlados (Portaria 344/98)

**Listas:**
- **A1:** Anfetamina, Cocaína, Dietilpropiona (anorexígenos)
- **A2:** Benzoilecgonina, Ecgonina
- **A3:** Fentanila, Metadona, Tramadol
- **B1:** Benzodiazepínicos (Diazepam, Alprazolam, Lorazepam)
- **B2:** Barbitúricos (Fenobarbital, Pentobarbital)

**Regra:** Quantidade OBRIGATORIAMENTE por extenso entre parênteses

```typescript
// ❌ ERRADO
{ quantity: 30, quantityUnit: "cápsula" }

// ✅ CORRETO
{ 
  quantity: 30, 
  quantityUnit: "cápsula",
  quantityWritten: "trinta"  // OBRIGATÓRIO
}
```

**Validação:**
```
30 (trinta) ✅
30 trinta ❌
trinta ❌
```

**Números suportados:** 1-999 (um a novecentos e noventa e nove)

### Medicamentos Tópicos

```typescript
{
  name: "Pomada Dermatológica",
  form: "pomada",
  posology: "Aplicar fina camada na lesão, 2 vezes ao dia (manhã e noite)",
  observations: "Uso externo exclusivamente. Não ingerir.",
  // Será marcado como "USO EXTERNO"
}
```

## 🚫 Erros Comuns e Correções

### ❌ Posologia Ambígua
```
"Tomar se dor"
"Conforme necessário"
"À noite"
"Pela manhã"
"Conforme orientação verbal"
```

### ✅ Posologia Correta
```
"Em caso de dor, administrar 1 comprimido por via oral 
a cada 6 horas, não excedendo 4 doses ao dia"

"Administrar 1 cápsula por via oral a cada 8 horas, 
não excedendo 3 doses ao dia, com as refeições"

"Aplicar 2 gotas (0,1 mL) no olho afetado, 
3 vezes ao dia, por 7 dias"
```

### ❌ Unidades Confusas
```
"gotas" (ambíguo - 1 gota = 50µL?)
"colheres" (qual tamanho?)
"uma caixa" (qual o conteúdo?)
"pó" (qual apresentação?)
```

### ✅ Unidades Precisas
```
"10 gotas" = "0,5 mL" (especificar na pomada)
"5 mL" (colher de café = 5mL)
"30 comprimidos" (quantidade específica)
"Pó para inalação 100mg/dose"
```

## 🛡️ Assinatura Digital (PAdES)

### Fluxo de Assinatura

```
1. Geração de HTML
   ↓
2. Renderização em PDF (Gotenberg)
   ↓
3. Cálculo de Hash SHA-256 do conteúdo
   ↓
4. Leitura do certificado A1 (P12/PFX)
   ↓
5. Criação de assinatura PKCS#7
   ↓
6. Injeção em dicionário /Signature do PDF
   ↓
7. Retorno de PDF/A-1a assinado
```

### Metadados Obrigatórios

```json
{
  "title": "Prescrição Médica - Maria Santos",
  "author": "Dr. João Silva - CRM-SP 12345",
  "subject": "Prescrição eletrônica",
  "keywords": "prescrição,medicamento,CFM,PAdES",
  "creation_date": "2026-02-01T10:30:00Z",
  "signature_hash": "sha256:abc123...",
  "verification_url": "https://app.healthcare.com/api/prescriptions/RX-123/verify"
}
```

## 📚 Exemplo Completo de Uso

### Via cURL

```bash
curl -X POST http://localhost:3000/api/prescriptions/generate-cfm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_SESSION_TOKEN>" \
  -d '{
    "doctor": {
      "name": "Dr. João Silva",
      "crm": "12345",
      "state": "SP",
      "rqe": "54321",
      "specialty": "Clínica Geral",
      "address": "Rua das Flores, 123",
      "city": "São Paulo",
      "phone": "(11) 98765-4321",
      "clinicName": "Clínica Silva & Cia"
    },
    "patient": {
      "name": "Maria Santos",
      "cpf": "12345678901",
      "dateOfBirth": "1990-05-15",
      "address": "Av. Paulista, 1000"
    },
    "medications": [
      {
        "name": "Amoxicilina",
        "concentration": "500mg",
        "form": "cápsula",
        "quantity": 20,
        "quantityUnit": "cápsula",
        "posology": "1 cápsula por via oral a cada 8 horas, não excedendo 3 doses ao dia",
        "observations": "Tomar com água",
        "quantityWritten": "vinte"
      }
    ],
    "notes": "Retornar em 7 dias",
    "userCertificatePassword": "senha_do_certificado"
  }'
```

### Via React Component

```typescript
import { MedicalPrescriptionCFM } from '@/components/prescriptions/medical-prescription-cfm'

export function MyPrescriptionForm() {
  const [prescription, setPrescription] = useState(null)

  const handleGenerate = async (data) => {
    const response = await fetch('/api/prescriptions/generate-cfm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        doctor: data.doctor,
        patient: data.patient,
        medications: data.medications,
        notes: data.notes,
        userCertificatePassword: data.certPassword,
      }),
    })

    if (response.ok) {
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `prescricao-${data.patient.name}.pdf`
      a.click()
    }
  }

  return (
    <form onSubmit={(e) => handleGenerate(prescription)}>
      {/* Form fields */}
      <button type="submit">Gerar Prescrição CFM</button>
    </form>
  )
}
```

## ✅ Checklist de Validação

Antes de gerar a prescrição, verificar:

- [ ] Médico tem CRM válido
- [ ] Paciente tem nome, idade e CPF
- [ ] Cada medicamento tem: nome, concentração, quantidade, posologia
- [ ] Medicamentos controlados têm quantidade por extenso
- [ ] Antibióticos detectados para gerar 2 vias
- [ ] Posologia não usa termos ambíguos
- [ ] Data é válida
- [ ] Certificado digital A1 está configurado
- [ ] Assinatura digital é gerada
- [ ] QR Code de verificação está presente
- [ ] Metadados do PDF estão corretos

## 🔍 Verificação e Compliance

### Teste Local

```bash
# Validar HTML gerado
npm run validate:prescription-html

# Testar com Gotenberg
npm run test:gotenberg-pdf

# Verificar certificado
npm run test:certificate-validity

# Validar conformidade CFM
npm run validate:cfm-compliance
```

### Verificação Online

Documentos assinados podem ser verificados em:
- **Verificador da ICP-Brasil:** https://www.verificador.iti.br/
- **Plataforma e-CFM:** https://e-med.cfm.org.br/

## 📞 Suporte Técnico

### Referências Normativas

- [Manual de Orientações CFM](https://portal.cfm.org.br/images/stories/pdf/guia_pratico_2011_atualizadojaneiro2020.pdf)
- [Portaria SVS/MS 344/98](https://www.gov.br/anvisa/pt-br/assuntos/medicamentos/legislacao-de-medicamentos/portaria-svs-ms-344-1998)
- [Resolução CFM 2.299/2021](https://portal.cfm.org.br/images/stories/pdf/resolucao-2299-2021.pdf)
- [Manual ITI - Prescrição Eletrônica](https://www.gov.br/iti/pt-br/assuntos/noticias/manual-de-implementacao-da-prescricao-eletronica)

### Contato

Para dúvidas sobre conformidade com padrões médicos, consulte:
- CFM (Conselho Federal de Medicina): https://portal.cfm.org.br/
- ITI (Instituto Nacional de Tecnologia da Informação): https://www.gov.br/iti/

---

**Última atualização:** 01 de fevereiro de 2026  
**Versão:** 2.0 - Padrões Ouro CFM

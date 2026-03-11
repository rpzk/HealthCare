# 💊 Análise: Medicamentos e SIGTAP

## 📊 Situação Atual vs Proposta

### 1. MEDICAMENTOS

#### ✅ **O Que Está BOM no Schema Atual**

```prisma
model Medication {
  // ✅ Campos essenciais bem estruturados
  name, synonym, tradeName
  
  // ✅ Disponibilidade em farmácias (8 tipos)
  basicPharmacy, municipalPharmacy, statePharmacy...
  
  // ✅ Informações farmacêuticas completas
  strength, unit, form, packaging, route
  
  // ✅ Restrições de uso
  minAge, maxAge, sexRestriction
  
  // ✅ Dosagem padrão
  dosePerKg, defaultFrequency, defaultDuration
}
```

#### ❌ **O Que Está FALTANDO**

1. **Sem Classificação ATC** (Anatômico Terapêutico Químico - OMS)
2. **Sem Princípio Ativo** (DCB - Denominação Comum Brasileira)
3. **Sem Registro ANVISA** (número, validade, fabricante)
4. **Sem Rename 2024** (medicamentos essenciais SUS)
5. **Sem Controlados** (Portaria 344/98 - listas A, B, C, D)
6. **Sem Classe Terapêutica** estruturada
7. **Sem Hierarquia** (grupo terapêutico → subgrupo → princípio ativo)

---

### 2. SIGTAP (Procedimentos SUS)

#### ✅ **O Que Está BOM no Schema Atual**

```prisma
model Procedure {
  // ✅ Campos básicos do SIGTAP
  code (10 dígitos), name, complexity
  
  // ✅ Restrições
  minAge, maxAge, sexRestriction
  
  // ✅ Agrupamentos simples
  group, subgroup
  
  // ✅ CBO relacionado
  cboRequired
}
```

#### ❌ **O Que Está FALTANDO**

1. **Hierarquia Incompleta** (Grupo → Subgrupo → Forma Organização)
2. **Sem Financiamento** estruturado (FAB, FAE, etc)
3. **Sem Rubrica** (orçamentária)
4. **Sem Valores** (SH, SA, SP - valores de remuneração)
5. **Sem Compatibilidades** (CID, CBO, habilitação)
6. **Sem Regras Condicionadas**
7. **Sem Modalidade** (ambulatorial, hospitalar, SADT)

---

## 🎯 PROPOSTA: Estruturas Hierárquicas Completas

### MEDICAMENTOS - Nova Estrutura

#### Hierarquia Proposta (3 níveis + classificações)

```
Classe Terapêutica ATC Nível 1 (14 classes)
  └─ Grupo Terapêutico ATC Nível 2
      └─ Subgrupo Terapêutico ATC Nível 3
          └─ Princípio Ativo (DCB)
              └─ Medicamento (apresentação comercial)
```

#### Novos Modelos Propostos

```prisma
// Nível 1: Classificação ATC (Anatômico)
model ATCClasse {
  id          String  @id
  code        String  @unique // Ex: "N" (Sistema Nervoso)
  name        String
  description String?
  grupos      ATCGrupo[]
}

// Nível 2: Grupo Terapêutico
model ATCGrupo {
  id          String     @id
  code        String     @unique // Ex: "N02" (Analgésicos)
  name        String
  classeId    String
  classe      ATCClasse  @relation(fields: [classeId], references: [id])
  subgrupos   ATCSubgrupo[]
}

// Nível 3: Subgrupo Farmacológico
model ATCSubgrupo {
  id                String     @id
  code              String     @unique // Ex: "N02B" (Outros analgésicos)
  name              String
  grupoId           String
  grupo             ATCGrupo   @relation(fields: [grupoId], references: [id])
  principiosAtivos  PrincipioAtivo[]
}

// Nível 4: Princípio Ativo (DCB)
model PrincipioAtivo {
  id           String        @id
  code         String?       // Código DCB
  name         String        // Ex: "Paracetamol"
  dcbName      String?       // Nome DCB oficial
  atcCode      String?       // Ex: "N02BE01"
  atcSubgrupoId String?
  atcSubgrupo  ATCSubgrupo?  @relation(fields: [atcSubgrupoId], references: [id])
  medicamentos Medication[]
}

// Nível 5: Medicamento (apresentação)
model Medication {
  id                  String   @id
  name                String   // Nome genérico ou comercial
  tradeName           String?  // Nome fantasia
  
  // NOVO: Princípio Ativo
  principioAtivoId    String?
  principioAtivo      PrincipioAtivo? @relation(fields: [principioAtivoId], references: [id])
  
  // NOVO: Classificação
  atcCode             String?  // Denormalizado para busca
  
  // NOVO: Registro ANVISA
  anvisaRegistry      String?  // Número de registro
  manufacturer        String?  // Fabricante
  registryValidUntil  DateTime?
  
  // NOVO: Rename SUS
  inRename            Boolean @default(false)
  renameComponent     String? // "Básico", "Estratégico", "Especializado"
  renameFinancing     String? // Tipo de financiamento
  
  // NOVO: Medicamento Controlado
  isControlled        Boolean @default(false)
  controlledList      String? // "A1", "B1", "C1", etc (Portaria 344/98)
  
  // NOVO: Classe Terapêutica
  therapeuticClass    String?
  
  // Campos existentes mantidos
  strength            String?
  form                String?
  route               String?
  prescriptionType    PrescriptionType
  basicPharmacy       Boolean
  // ... etc
}
```

---

### SIGTAP - Nova Estrutura

#### Hierarquia Proposta (5 níveis)

```
Grupo (2 dígitos)
  └─ Subgrupo (4 dígitos)
      └─ Forma de Organização (6 dígitos)
          └─ Procedimento (10 dígitos)
              └─ Detalhamento
```

#### Novos Modelos Propostos

```prisma
// Nível 1: Grupo
model SIGTAPGrupo {
  id          String  @id
  code        String  @unique // 2 dígitos: "03"
  name        String  // Ex: "Procedimentos clínicos"
  competencia String  // AAAAMM
  subgrupos   SIGTAPSubgrupo[]
}

// Nível 2: Subgrupo
model SIGTAPSubgrupo {
  id              String      @id
  code            String      @unique // 4 dígitos: "0301"
  name            String      // Ex: "Consultas / Atendimentos"
  grupoId         String
  grupo           SIGTAPGrupo @relation(fields: [grupoId], references: [id])
  formasOrg       SIGTAPFormaOrganizacao[]
}

// Nível 3: Forma de Organização
model SIGTAPFormaOrganizacao {
  id              String          @id
  code            String          @unique // 6 dígitos: "030101"
  name            String          // Ex: "Consulta médica"
  subgrupoId      String
  subgrupo        SIGTAPSubgrupo  @relation(fields: [subgrupoId], references: [id])
  procedimentos   Procedure[]
}

// Nível 4: Procedimento (já existe, melhorar)
model Procedure {
  id              String  @id
  code            String  @unique // 10 dígitos: "0301010039"
  name            String
  
  // NOVO: Hierarquia
  formaOrganizacaoId String?
  formaOrganizacao   SIGTAPFormaOrganizacao? @relation(fields: [formaOrganizacaoId], references: [id])
  
  // NOVO: Financiamento
  financiamentoId    String?
  financiamento      SIGTAPFinanciamento? @relation(fields: [financiamentoId], references: [id])
  
  // NOVO: Valores
  valorSH         Decimal? // Serviço Hospitalar
  valorSA         Decimal? // Serviço Ambulatorial
  valorSP         Decimal? // Serviço Profissional
  
  // NOVO: Rubrica
  rubricaId       String?
  rubrica         SIGTAPRubrica? @relation(fields: [rubricaId], references: [id])
  
  // NOVO: Modalidade
  modalidadeId    String?
  modalidade      SIGTAPModalidade? @relation(fields: [modalidadeId], references: [id])
  
  // NOVO: Compatibilidades
  compatibilidades SIGTAPCompatibilidade[]
  
  // Campos existentes
  complexity      Int?
  minAge          Int?
  maxAge          Int?
  sexRestriction  String?
  cboRequired     String?
  active          Boolean
  validFrom       DateTime?
}

// Tabelas Auxiliares
model SIGTAPFinanciamento {
  id            String      @id
  code          String      @unique // "01", "02", etc
  name          String      // Ex: "FAB - Atenção Básica"
  procedimentos Procedure[]
}

model SIGTAPRubrica {
  id            String      @id
  code          String      @unique // 6 dígitos
  name          String      // Classificação orçamentária
  procedimentos Procedure[]
}

model SIGTAPModalidade {
  id            String      @id
  code          String      @unique
  name          String      // Ex: "Ambulatorial", "Hospitalar"
  procedimentos Procedure[]
}

model SIGTAPCompatibilidade {
  id              String     @id
  procedimentoId  String
  procedimento    Procedure  @relation(fields: [procedimentoId], references: [id])
  
  // Compatível com CID
  cidCode         String?
  
  // Compatível com CBO
  cboCode         String?
  
  // Tipo de compatibilidade
  tipo            String     // "OBRIGATÓRIA", "SUGERIDA", "RESTRITA"
}
```

---

## 📊 Comparativo: Antes vs Depois

### MEDICAMENTOS

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Classificação | ❌ Nenhuma | ✅ ATC (3 níveis) |
| Princípio Ativo | ❌ Não tem | ✅ DCB estruturado |
| Rename SUS | ❌ Não tem | ✅ Componentes + financiamento |
| ANVISA | ❌ Não tem | ✅ Registro + fabricante |
| Controlados | ❌ Não tem | ✅ Portaria 344/98 |
| Busca | 🟡 Básica | ✅ Hierárquica |
| Total Campos | 30 | 45+ |

### SIGTAP

| Aspecto | Antes | Depois |
|---------|-------|--------|
| Hierarquia | 🟡 2 níveis (grupo/subgrupo) | ✅ 4 níveis completos |
| Financiamento | ❌ String simples | ✅ Tabela estruturada |
| Valores | ❌ Não tem | ✅ SH, SA, SP |
| Compatibilidades | ❌ Não tem | ✅ CID + CBO + regras |
| Rubrica | ❌ Não tem | ✅ Orçamentária |
| Modalidade | ❌ Não tem | ✅ Ambulatorial/Hospitalar |
| Total Tabelas | 1 | 8 |

---

## 🚀 Plano de Implementação

### Fase 1: Medicamentos
- [ ] Criar modelos ATC (3 níveis)
- [ ] Criar modelo PrincipioAtivo
- [ ] Expandir Medication com novos campos
- [ ] Migration compatível
- [ ] Importar DCB
- [ ] Importar Rename 2024
- [ ] Importar Controlados

### Fase 2: SIGTAP
- [ ] Criar hierarquia completa (4 níveis)
- [ ] Criar tabelas auxiliares (financiamento, rubrica, modalidade)
- [ ] Expandir Procedure
- [ ] Criar SIGTAPCompatibilidade
- [ ] Migration compatível
- [ ] Importar SQLs existentes

---

## ❓ Decisão Necessária

**Você quer que eu implemente:**

**A)** MEDICAMENTOS completo agora (ATC + DCB + Rename + Controlados)  
**B)** SIGTAP completo agora (hierarquia + compatibilidades)  
**C)** AMBOS (implementação completa)  
**D)** Revisar propostas antes de implementar

**Minha recomendação**: **D → C** (revisar juntos, depois implementar tudo de uma vez)

O que prefere?

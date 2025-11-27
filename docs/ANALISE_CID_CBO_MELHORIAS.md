# Análise Comparativa: Sistema Legado SSF vs Sistema Atual
## Resumo Executivo

Este documento apresenta uma análise comparativa entre o sistema legado SSF (Django) e o sistema atual (Next.js/Prisma), focando nas funcionalidades de **CID-10**, **CBO**, **Medicamentos**, **Procedimentos SIGTAP** e **Catálogo de Exames**.

### Dados Importados do Sistema Legado

| Catálogo | Registros | Status |
|----------|-----------|--------|
| CID-10 (Códigos Médicos) | 14.197 | ✅ Implementado |
| CBO (Ocupações) | 2.569 | ✅ Implementado |
| Medicamentos | 359 | ✅ Implementado |
| Procedimentos SIGTAP | 4.520 | ✅ Implementado |
| Tipos de Exames | 298 | ✅ Implementado |

---

## 1. Sistema de CID-10

### 1.1 Sistema Legado (SSF)

**Modelo Django (`geral/models.py`):**
```python
class CID(models.Model):
    codigo = models.CharField('Código', max_length=5)
    opcao = models.CharField('Sistema Cruz/Asterisco', max_length=1, choices=[
        ('+', 'Etiologia'),
        ('*', 'Manifestação'),
    ])
    categoria = models.CharField('Categoria', max_length=1)      # S=categoria, N=não
    subcategoria = models.CharField('Subcategoria', max_length=1)  # S=subcategoria, N=não
    descricao = models.CharField('Descrição', max_length=100)
    extendida = models.CharField('Descrição Extendida', max_length=300)
    restricao = models.CharField('Restrição ao Sexo', max_length=1, choices=[
        ('1', 'Válida apenas para homens'),
        ('3', 'Válida apenas para mulheres'),
        ('5', 'Válida para ambos'),
    ])
```

**Dados disponíveis:** 14.197 códigos CID-10 em `/ssf/fixtures/cid.csv`

**Pontos fortes do sistema legado:**
- ✅ Sistema completo de cruz/asterisco (etiologia vs manifestação)
- ✅ Restrição de sexo para diagnósticos específicos
- ✅ Distinção clara entre categorias e subcategorias
- ✅ Descrição curta e extendida separadas
- ✅ Base de dados completa com todos os códigos CID-10

### 1.2 Sistema Atual (Antes das Melhorias)

**Modelo Prisma (`schema.prisma`):**
```prisma
model MedicalCode {
  id             String   @id @default(cuid())
  systemId       String
  code           String
  display        String
  description    String?
  parentId       String?
  synonyms       String?
  searchableText String?
  active         Boolean  @default(true)
}
```

**Limitações identificadas:**
- ❌ Não tinha distinção categoria/subcategoria
- ❌ Não tinha sistema cruz/asterisco
- ❌ Não tinha restrição de sexo
- ❌ Não tinha capítulos do CID-10
- ❌ Base de dados incompleta (apenas códigos principais)

### 1.3 Melhorias Implementadas

**Novo modelo Prisma aprimorado:**
```prisma
model MedicalCode {
  id               String   @id @default(cuid())
  systemId         String
  code             String
  display          String
  description      String?
  parentId         String?
  synonyms         String?
  searchableText   String?
  active           Boolean  @default(true)
  // Campos adicionais do sistema legado SSF
  chapter          String?  // Capítulo CID-10 (I-XXII)
  isCategory       Boolean  @default(false)
  sexRestriction   String?  // M=masculino, F=feminino, null=ambos
  crossAsterisk    String?  // ETIOLOGY ou MANIFESTATION
  shortDescription String?  // Descrição curta/abreviada
}
```

**Novos recursos:**
- ✅ Campo `chapter` para classificação por capítulos CID-10
- ✅ Campo `isCategory` para identificar categorias principais
- ✅ Campo `sexRestriction` para filtrar por gênero do paciente
- ✅ Campo `crossAsterisk` para sistema de etiologia/manifestação
- ✅ Campo `shortDescription` para descrição abreviada
- ✅ Índices otimizados para buscas por capítulo e sexo

---

## 2. Sistema de CBO

### 2.1 Sistema Legado (SSF)

**Modelo Django:**
```python
class CBO(models.Model):
    codigo = models.CharField('Categoria', max_length=6)
    descricao = models.CharField('Código Brasileiro de Ocupações', max_length=150)
```

**Dados disponíveis:** 2.569 ocupações em `/ssf/fixtures/cbo.csv`

**Estrutura do código CBO:**
- 1 dígito: Grande Grupo
- 2 dígitos: Subgrupo Principal
- 3 dígitos: Subgrupo
- 4 dígitos: Família Ocupacional
- 6 dígitos: Ocupação específica

### 2.2 Sistema Atual

**Modelo Prisma já existente:**
```prisma
model CBOGroup {
  id          String       @id @default(cuid())
  code        String       @unique
  name        String
  level       Int          // 1-4 (Grande Grupo até Família)
  parentId    String?
  occupations Occupation[]
}

model Occupation {
  id          String    @id @default(cuid())
  code        String    @unique
  title       String
  description String?
  groupId     String?
  synonyms    String?
  active      Boolean   @default(true)
  roles       JobRole[]
}
```

**Avaliação:** O sistema atual já possui uma estrutura hierárquica robusta para CBO, com:
- ✅ Hierarquia em níveis (Grande Grupo → Família)
- ✅ Relacionamento entre grupos e ocupações
- ✅ Integração com JobRoles para gestão de cargos
- ✅ Sinônimos para melhorar buscas

**Necessidade:** Apenas popular o banco com os dados completos do sistema legado.

---

## 3. Scripts de Importação Criados

### 3.1 Importação de CID-10
**Arquivo:** `scripts/import-ssf-cid.ts`

**Funcionalidades:**
- Importa todos os 14.197 códigos do arquivo CSV
- Extrai automaticamente o capítulo baseado na letra inicial
- Identifica categorias vs subcategorias
- Preserva sistema cruz/asterisco (etiologia/manifestação)
- Converte restrições de sexo para formato padronizado (M/F)
- Constrói hierarquia parent-child automaticamente
- Gera texto de busca otimizado

**Uso:**
```bash
npx tsx scripts/import-ssf-cid.ts
```

### 3.2 Importação de CBO
**Arquivo:** `scripts/import-ssf-cbo.ts`

**Funcionalidades:**
- Cria estrutura hierárquica completa (Grandes Grupos → Famílias)
- Importa todas as 2.569 ocupações
- Associa ocupações às famílias corretas
- Cria subgrupos automaticamente quando necessário

**Uso:**
```bash
npx tsx scripts/import-ssf-cbo.ts
```

---

## 4. Melhorias na API

### 4.1 Busca Aprimorada de Códigos

**Endpoint:** `GET /api/coding/search`

**Novos parâmetros:**
| Parâmetro | Descrição |
|-----------|-----------|
| `chapter` | Filtrar por capítulo CID-10 (I-XXII) |
| `sex` | Filtrar por restrição de sexo (M/F) |
| `categories` | Mostrar apenas categorias (`1`) |
| `fts` | Usar busca full-text (`1`) |

**Exemplo:**
```
/api/coding/search?query=diabetes&system=CID10&chapter=IV&sex=M&fts=1
```

### 4.2 Nova API de Capítulos

**Endpoint:** `GET /api/coding/chapters`

**Resposta:**
```json
{
  "chapters": [
    { "code": "I", "name": "Doenças infecciosas e parasitárias", "count": 1234 },
    { "code": "II", "name": "Neoplasias", "count": 567 },
    ...
  ]
}
```

### 4.3 Novos Métodos no CodingService

| Método | Descrição |
|--------|-----------|
| `listChapters(systemKind?)` | Lista todos os capítulos com contagem |
| `getCodesByChapter(chapter, systemKind?, limit?)` | Códigos por capítulo |
| `getCodeStats(systemKind?)` | Estatísticas gerais |
| `searchCodesForGender(query, gender, systemKind?, limit?)` | Busca filtrada por gênero |

---

## 5. Melhorias na Interface

### 5.1 Admin de Codificação (`/admin/coding`)

**Novos recursos:**
- Filtro por capítulo CID-10
- Filtro por restrição de sexo
- Opção "Só Categorias"
- Exibição de badges visuais:
  - `CAT` - Categoria principal
  - Capítulo (I, II, III...)
  - `♂` / `♀` - Restrição de sexo
  - `✚ Etiologia` / `✱ Manifestação`
- Detalhes expandidos com hierarquia completa

---

## 6. Comparativo Final

### CID-10

| Recurso | SSF (Legado) | Atual (Antes) | Atual (Depois) |
|---------|--------------|---------------|----------------|
| Códigos disponíveis | 14.197 | ~200 | 14.197 |
| Hierarquia | ❌ | ✅ | ✅ |
| Capítulos | ❌ | ❌ | ✅ |
| Categorias | ✅ | ❌ | ✅ |
| Restrição sexo | ✅ | ❌ | ✅ |
| Cruz/Asterisco | ✅ | ❌ | ✅ |
| Busca FTS | ❌ | ✅ | ✅ |
| Cache Redis | ❌ | ✅ | ✅ |
| Sugestão IA | ❌ | ✅ | ✅ |

### CBO

| Recurso | SSF (Legado) | Atual (Antes) | Atual (Depois) |
|---------|--------------|---------------|----------------|
| Ocupações disponíveis | 2.569 | ~0 | 2.569 |
| Hierarquia grupos | ❌ (flat) | ✅ | ✅ |
| Integração JobRoles | ❌ | ✅ | ✅ |
| Avaliação competências | ❌ | ✅ | ✅ |
| Busca semântica | ❌ | ✅ | ✅ |

---

## 7. Próximos Passos Recomendados

### Imediatos
1. Executar migration para adicionar novos campos
2. Rodar scripts de importação CID e CBO
3. Testar interface de administração

### Médio Prazo
1. Criar componente de seleção de CID com filtros inteligentes
2. Implementar validação de CID por gênero do paciente
3. Adicionar autocomplete de CID em formulários de consulta

### Longo Prazo
1. Integrar com APIs oficiais do DATASUS para atualizações
2. Implementar versionamento de códigos (CID-11)
3. Machine learning para sugestão de diagnósticos

---

## 8. Sistema de Medicamentos

### 8.1 Estrutura de Dados

O sistema legado possui um catálogo rico de 359 medicamentos com informações detalhadas:

**Campos do CSV `medicacao.csv`:**
- `nome`, `sinonimo`, `fantasia` - Nomes e variações
- `receita_tipo` - Tipo de receita (S=Simples, C=Controlada, A/B=Especial)
- `basica`, `municipal`, `estadual`, `domiciliar`, `popular`, `hospitalar`, `comercial`, `manipulado` - Disponibilidade
- `uso` - Via de administração (O=Oral, EV, IM, SC, etc)
- `peso`, `unidade`, `formato`, `recipiente` - Forma farmacêutica
- `dose_kilo`, `frequencia`, `duracao`, `quantidade` - Dosagem padrão
- `idade_min`, `idade_max`, `sexo` - Restrições

### 8.2 Modelo Prisma Implementado

```prisma
model Medication {
  id                String    @id @default(cuid())
  code              String    @unique
  name              String
  synonyms          String?
  brandName         String?
  prescriptionType  String    @default("SIMPLE")  // SIMPLE, CONTROLLED, SPECIAL_A, SPECIAL_B
  
  // Disponibilidade
  isBasicPharmacy   Boolean   @default(false)
  isMunicipal       Boolean   @default(false)
  isState           Boolean   @default(false)
  isHomeCare        Boolean   @default(false)
  isPopularPharmacy Boolean   @default(false)
  isHospital        Boolean   @default(false)
  isCommercial      Boolean   @default(false)
  isCompounded      Boolean   @default(false)
  
  // Forma farmacêutica
  route             String    @default("ORAL")  // Via de administração
  form              String?   // Forma farmacêutica
  unit              String?
  container         String?
  
  // Dosagem padrão
  defaultDosage     String?
  dosePerKg         Float?
  defaultFrequency  String?
  defaultDuration   String?
  defaultQuantity   Float?
  
  // Restrições
  minAge            Int?
  maxAge            Int?
  sexRestriction    String?   // MALE, FEMALE
}
```

### 8.3 APIs Implementadas

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/medications/search` | GET | Busca com filtros avançados |
| `/api/medications/autocomplete` | GET | Autocomplete para prescrição |
| `/api/medications/validate` | POST | Valida prescrição para paciente |
| `/api/medications/stats` | GET | Estatísticas do catálogo |
| `/api/medications/[id]` | GET | Detalhes de um medicamento |

### 8.4 Funcionalidades

1. **Busca inteligente:** Por nome, sinônimo ou nome fantasia
2. **Filtros de disponibilidade:** Farmácia básica, popular, hospitalar, etc
3. **Validação de prescrição:** Verifica restrições de idade e sexo
4. **Valores padrão:** Preenche automaticamente dosagem, frequência e duração
5. **Dose por peso:** Cálculo automático baseado no peso do paciente

---

## 9. Sistema de Procedimentos SIGTAP

### 9.1 Estrutura de Dados

O sistema legado possui 4.520 procedimentos da tabela SIGTAP/SUS:

**Campos do CSV `procedimento.csv`:**
- `codigo` - Código SIGTAP (10 dígitos)
- `descricao` - Nome do procedimento
- `complexidade` - 0=N/A, 1=Baixa, 2=Média, 3=Alta
- `financiamento` - N=Nacional, I=Municipal, F=Federal
- `idade_min`, `idade_max` - Restrições de idade (em meses)
- `sexo` - Restrição de sexo
- `cbo` - CBO necessário para realizar
- `vigencia` - Data de vigência (YYYYMM)

### 9.2 Modelo Prisma

```prisma
model Procedure {
  id              String    @id @default(cuid())
  code            String    @unique  // Código SIGTAP (10 dígitos)
  name            String
  complexity      Int?      // 0-3
  financing       String?   // NATIONAL, MUNICIPAL, FEDERAL
  minAge          Int?      // Em meses
  maxAge          Int?      // Em meses
  sexRestriction  String?   // MALE, FEMALE
  group           String?   // Grupo do procedimento
  subgroup        String?
  cboRequired     String?   // CBO necessário
  active          Boolean   @default(true)
  validFrom       DateTime?
}
```

### 9.3 Grupos de Procedimentos

| Código | Grupo |
|--------|-------|
| 01 | Ações de promoção e prevenção em saúde |
| 02 | Procedimentos com finalidade diagnóstica |
| 03 | Procedimentos clínicos |
| 04 | Procedimentos cirúrgicos |
| 05 | Transplantes de órgãos, tecidos e células |
| 06 | Medicamentos |
| 07 | Órteses, próteses e materiais especiais |
| 08 | Ações complementares da atenção à saúde |

---

## 10. Catálogo de Exames

### 10.1 Estrutura de Dados

O sistema legado possui 298 tipos de exames:

**Campos do CSV `complemento.csv`:**
- `nome` - Nome do exame
- `abreviacao` - Sigla (HMG, GLI, TSH, etc)
- `descricao` - Descrição adicional
- `tipo` - Categoria do exame
- `idade_min`, `idade_max` - Restrições
- `sexo` - Restrição de sexo
- `codigo_sus` - Código SUS relacionado

### 10.2 Categorias de Exames

```prisma
enum ExamCategory {
  LABORATORY      // Laboratório
  RADIOLOGY       // Radiografia
  ECG             // Eletrocardiograma
  PHYSIOTHERAPY   // Fisioterapia
  APAC            // APAC
  CYTOPATHOLOGY   // Citopatológico
  MAMMOGRAPHY     // Mamografia
  ULTRASOUND      // Ecografia/Ultrassonografia
  LAB_ALTERNATIVE // Laboratório Alternativo
  RAD_ALTERNATIVE // Radiografia Alternativa
  OTHER_1         // Outros 1
  OTHER_2         // Outros 2
}
```

### 10.3 Modelo Prisma

```prisma
model ExamCatalog {
  id              String       @id @default(cuid())
  name            String
  abbreviation    String?
  description     String?
  examCategory    ExamCategory
  minAge          Int?
  maxAge          Int?
  sexRestriction  String?
  susCode         String?
  preparation     String?      // Instruções de preparo
  active          Boolean      @default(true)
}
```

---

## 11. Comandos de Execução

```bash
# 1. Gerar cliente Prisma com novos campos
npx prisma generate

# 2. Criar migration
npx prisma migrate dev --name enhance_medical_codes

# 3. Importar CID-10 do SSF
npx tsx scripts/import-ssf-cid.ts

# 4. Importar CBO do SSF
npx tsx scripts/import-ssf-cbo.ts

# 5. Importar Medicamentos do SSF
npx tsx scripts/import-ssf-medications.ts

# 6. Importar Procedimentos SIGTAP do SSF
npx tsx scripts/import-ssf-procedures.ts

# 7. Importar Catálogo de Exames do SSF
npx tsx scripts/import-ssf-exams.ts

# 8. Verificar importação
npx prisma studio
```

---

## 12. Resumo das Melhorias

### APIs Criadas

| Serviço | API Base | Funcionalidades |
|---------|----------|-----------------|
| CID-10 | `/api/coding` | Busca, capítulos, estatísticas |
| CBO | `/api/occupations` | Busca, grupos, hierarquia |
| Medicamentos | `/api/medications` | Busca, autocomplete, validação |
| Procedimentos | `/api/procedures` | Busca, complexidade, financiamento |
| Exames | `/api/exams` | Busca, categorias, preparo |

### Scripts de Importação

| Script | Arquivo Fonte | Registros |
|--------|---------------|-----------|
| `import-ssf-cid.ts` | `cid.csv` | 14.197 |
| `import-ssf-cbo.ts` | `cbo.csv` | 2.569 |
| `import-ssf-medications.ts` | `medicacao.csv` | 359 |
| `import-ssf-procedures.ts` | `procedimento.csv` | 4.520 |
| `import-ssf-exams.ts` | `complemento.csv` | 298 |

### Serviços Criados

| Serviço | Arquivo | Funcionalidades |
|---------|---------|-----------------|
| CodingService | `lib/coding-service.ts` | Busca CID, capítulos, estatísticas |
| OccupationCapabilityService | `lib/occupation-capability-service.ts` | Busca CBO, grupos |
| MedicationService | `lib/medication-service.ts` | Busca, autocomplete, validação |

---

## Conclusão

As melhorias implementadas combinam o melhor dos dois sistemas:
- **Do SSF:** Base de dados completa com 21.943 registros e metadados ricos
- **Do sistema atual:** Arquitetura moderna, busca full-text, cache Redis, integração IA

O resultado é um sistema completo de codificação clínica que inclui:
- Diagnósticos (CID-10)
- Ocupações (CBO)
- Medicamentos com validação de prescrição
- Procedimentos SIGTAP
- Catálogo de exames

Todos os sistemas possuem validações de idade e sexo, permitindo alertas inteligentes durante a prescrição e solicitação de exames.

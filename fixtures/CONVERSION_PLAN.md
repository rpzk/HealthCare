# 📦 Plano de Conversão de Fixtures - Implementação

## ✅ **INVENTÁRIO COMPLETO CONFIRMADO**

### 📊 **Dados Disponíveis**

| Categoria | Fonte | Localização | Status |
|-----------|-------|-------------|--------|
| **CBO** | Excel (hierárquico) | `/Fixtures/CBO/*.xlsx` | ✅ 20 arquivos |
| **CID-10** | Excel/CSV/JSON | `/Fixtures/CID10/` | ✅ Completo |
| **CIAP-2** | TBD | `/Fixtures/CID10/CIAP2/` | ⚠️ Validar |
| **Medicamentos - Rename** | PDF 2024 | `/Fixtures/Medicamentos/relacao_nacional_medicamentos_2024.pdf` | ✅ 2.5MB |
| **Medicamentos - DCB** | Excel | `/Fixtures/Denominação Comum Brasileira.xlsx` | ✅ Disponível |
| **Medicamentos - ANVISA** | Excel | `/Fixtures/Medicamentos/xls_conformidade_*.xlsx` | ✅ 2019-2023 |
| **SIGTAP Atualizado** | TXT (fev/2026) | `/Fixtures/sigtap/202602/*.txt` | ✅ **87 arquivos!** |
| **SIGTAP Legacy** | SQL (antigo) | `/Fixtures/sigtap/*.sql` | ✅ 27 arquivos |

---

## 🎯 **DECISÃO: SIGTAP Atualizado (Fev/2026)**

### Por que usar o novo SIGTAP?

✅ **Competência 202602** (Fevereiro 2026) - **ATUALÍSSIMO!**  
✅ **87 arquivos TXT** com layout documentado  
✅ **Formato padronizado** (fixed-width com descritor)  
✅ **Hierarquia completa** (Grupo → Subgrupo → Forma Org → Procedimento)  
✅ **Relacionamentos** (CID, CBO, Habilitação, Modalidade, etc)  
✅ **Valores atualizados** (SH, SA, SP)  
✅ **Excel com layout** incluso

### Estrutura SIGTAP 202602

```
📁 /Fixtures/sigtap/202602/
├── 📄 tb_procedimento.txt          (1.6MB) - Tabela principal
├── 📄 tb_grupo.txt                 (1KB) - Grupos
├── 📄 tb_sub_grupo.txt             (7.5KB) - Subgrupos
├── 📄 tb_forma_organizacao.txt     (47KB) - Formas de organização
├── 📄 tb_financiamento.txt         - Tipos de financiamento
├── 📄 tb_modalidade.txt            - Modalidades
├── 📄 tb_ocupacao.txt              (429KB) - CBOs compatíveis
├── 📄 tb_cid.txt                   (1.6MB) - CIDs compatíveis
├── 📄 rl_procedimento_cid.txt      (1.8MB) - Relação procedimento-CID
├── 📄 rl_procedimento_ocupacao.txt (4.5MB) - Relação procedimento-CBO
├── 📄 rl_procedimento_compativel.txt - Compatibilidades
└── ... (mais 76 arquivos)
```

---

## 🛠️ **PLANO DE CONVERSÃO - FASE POR FASE**

### **FASE 1: CBO (Prioridade ALTA)**

#### Arquivos de Entrada
```
/Fixtures/CBO/
├── Grande Grupo.xlsx           (8 KB)
├── SubGrupo Principal.xlsx     (6-9 KB)
├── SubGrupo.xlsx              (11-14 KB)
├── Familia.xlsx               (22-24 KB)
├── Ocupacao.xlsx              (64-67 KB)
└── Sinonimo.xlsx              (153-159 KB)
```

#### Saída Esperada
```json
{
  "grandeGrupos": [...],      // ~10 registros
  "subgruposPrincipais": [...], // ~48
  "subgrupos": [...],         // ~192
  "familias": [...],          // ~600
  "ocupacoes": [...],         // ~2.650
  "sinonimos": [...]          // Mapeamento
}
```

#### Script a Criar
```bash
npm run fixtures:convert:cbo
# → Gera: fixtures/01-master-data/cbo/cbo-complete.json
```

---

### **FASE 2: CID-10 (Prioridade ALTA)**

#### Arquivos de Entrada
```
/Fixtures/CID10/
├── CID10-CAPITULOS.CSV.xlsx
├── CID10-GRUPOS.CSV.xlsx
├── CID10-CATEGORIAS.CSV.xlsx
├── CID10-SUBCATEGORIAS.CSV.xlsx
└── CID10_SubCategoria.json (5MB) - Já pronto!
```

#### Saída Esperada
```json
{
  "capitulos": [...],      // 22 registros
  "grupos": [...],         // ~280
  "categorias": [...],     // ~2.000
  "subcategorias": [...]   // ~14.000
}
```

#### Script a Criar
```bash
npm run fixtures:convert:cid
# → Gera: fixtures/01-master-data/cid10/cid10-complete.json
```

---

### **FASE 3: MEDICAMENTOS (Prioridade ALTA)**

#### 3.1. Rename 2024

**Entrada:**
```
/Fixtures/Medicamentos/relacao_nacional_medicamentos_2024.pdf
```

**Desafio:** Extrair dados estruturados do PDF

**Opções:**
1. **OCR + Parsing** (complexo)
2. **Scraping do painel eletrônico** (http://ads.saude.gov.br/servlet/mstrWeb)
3. **Buscar JSON/CSV alternativo**

**Saída:**
```json
{
  "medicamentos": [
    {
      "nome": "Paracetamol",
      "concentracao": "500mg",
      "forma": "Comprimido",
      "componente": "Básico",
      "financiamento": "FAB"
    }
  ]
}
```

#### 3.2. DCB (Denominação Comum Brasileira)

**Entrada:**
```
/Fixtures/Denominação Comum Brasileira.xlsx
```

**Saída:**
```json
{
  "principiosAtivos": [
    {
      "codigo": "...",
      "nome": "Paracetamol",
      "dcbOficial": "..."
    }
  ]
}
```

#### 3.3. ANVISA

**Entrada:**
```
/Fixtures/Medicamentos/xls_conformidade_site_20230320_19585047.xlsx
```

**Saída:**
```json
{
  "registros": [
    {
      "numeroRegistro": "...",
      "nomeProduto": "...",
      "fabricante": "...",
      "principioAtivo": "..."
    }
  ]
}
```

#### Script a Criar
```bash
npm run fixtures:convert:medications
# → Gera múltiplos JSONs na pasta medications/
```

---

### **FASE 4: SIGTAP (Prioridade ALTA)**

#### Arquivos de Entrada
```
/Fixtures/sigtap/202602/*.txt (87 arquivos)
```

#### Parser Necessário

**Layout Fixed-Width:**
```typescript
interface FieldLayout {
  column: string
  size: number
  start: number
  end: number
  type: 'VARCHAR2' | 'NUMBER' | 'CHAR'
}

function parseFixedWidth(line: string, layout: FieldLayout[]): Record<string, any> {
  const result = {}
  for (const field of layout) {
    const value = line.substring(field.start - 1, field.end).trim()
    result[field.column] = field.type === 'NUMBER' ? parseFloat(value) || null : value
  }
  return result
}
```

#### Saída Esperada
```json
{
  "grupos": [...],
  "subgrupos": [...],
  "formasOrganizacao": [...],
  "procedimentos": [...],
  "financiamentos": [...],
  "modalidades": [...],
  "compatibilidadesCID": [...],
  "compatibilidadesCBO": [...]
}
```

#### Script a Criar
```bash
npm run fixtures:convert:sigtap
# → Gera: fixtures/01-master-data/sigtap/sigtap-202602-complete.json
```

---

## 📝 **SCRIPTS A IMPLEMENTAR**

### 1. `scripts/fixtures/convert-cbo.ts`

```typescript
import * as XLSX from 'xlsx'
import fs from 'fs'

interface GrandeGrupo {
  code: string
  name: string
  description?: string
}

async function convertCBO() {
  const fixturesPath = '/home/rafael/Desenvolvimento/Fixtures/CBO/'
  
  // Ler Grande Grupo
  const ggWorkbook = XLSX.readFile(fixturesPath + 'Grande Grupo.xlsx')
  const ggSheet = ggWorkbook.Sheets[ggWorkbook.SheetNames[0]]
  const grandeGrupos: GrandeGrupo[] = XLSX.utils.sheet_to_json(ggSheet)
  
  // ... processar demais níveis
  
  const result = {
    grandeGrupos,
    // ... outros
  }
  
  fs.writeFileSync(
    '/home/rafael/Desenvolvimento/HealthCare/fixtures/01-master-data/cbo/cbo-complete.json',
    JSON.stringify(result, null, 2)
  )
}
```

### 2. `scripts/fixtures/convert-sigtap.ts`

```typescript
import fs from 'fs'

interface SIGTAPLayout {
  [tableName: string]: Array<{
    column: string
    size: number
    start: number
    end: number
    type: string
  }>
}

function parseLayout(layoutFile: string): any[] {
  const content = fs.readFileSync(layoutFile, 'utf-8')
  const lines = content.split('\n').slice(1) // Skip header
  return lines.filter(l => l.trim()).map(line => {
    const [column, size, start, end, type] = line.split(',')
    return {
      column,
      size: parseInt(size),
      start: parseInt(start),
      end: parseInt(end),
      type
    }
  })
}

function parseDataFile(dataFile: string, layout: any[]): any[] {
  const content = fs.readFileSync(dataFile, 'utf-8')
  const lines = content.split('\n').filter(l => l.trim())
  
  return lines.map(line => {
    const record: any = {}
    for (const field of layout) {
      const value = line.substring(field.start - 1, field.end).trim()
      record[field.column] = field.type === 'NUMBER' 
        ? (parseFloat(value) || null) 
        : value
    }
    return record
  })
}

async function convertSIGTAP() {
  const basePath = '/home/rafael/Desenvolvimento/Fixtures/sigtap/202602/'
  
  // Processar cada tabela
  const procedimentosLayout = parseLayout(basePath + 'tb_procedimento_layout.txt')
  const procedimentos = parseDataFile(basePath + 'tb_procedimento.txt', procedimentosLayout)
  
  // ... processar demais tabelas
  
  const result = {
    competencia: '202602',
    procedimentos,
    // ... outros
  }
  
  fs.writeFileSync(
    '/home/rafael/Desenvolvimento/HealthCare/fixtures/01-master-data/sigtap/sigtap-202602.json',
    JSON.stringify(result, null, 2)
  )
}
```

---

## 🚀 **ORDEM DE EXECUÇÃO**

```bash
# 1. Converter todas as fixtures
npm run fixtures:convert:cbo
npm run fixtures:convert:cid
npm run fixtures:convert:sigtap
npm run fixtures:convert:medications  # Se conseguirmos extrair Rename

# 2. Validar JSONs gerados
npm run fixtures:validate

# 3. Aplicar migrations
npx prisma migrate deploy

# 4. Importar para o banco
npm run fixtures:import:all
```

---

## 📊 **ESTATÍSTICAS ESPERADAS**

| Entidade | Registros Esperados |
|----------|---------------------|
| CBO Grande Grupos | 10 |
| CBO Subgrupos Principais | 48 |
| CBO Subgrupos | 192 |
| CBO Famílias | 600 |
| CBO Ocupações | 2.650 |
| CID-10 Capítulos | 22 |
| CID-10 Grupos | 280 |
| CID-10 Categorias | 2.000 |
| CID-10 Subcategorias | 14.000 |
| SIGTAP Grupos | 10-15 |
| SIGTAP Procedimentos | 4.900+ |
| Medicamentos (Rename) | 1.000 |
| Medicamentos (ANVISA) | 30.000+ |

---

## ✅ **PRÓXIMO PASSO**

**Começar implementação dos scripts de conversão!**

Qual prefere começar primeiro?

**A)** CBO (mais simples, Excel direto)  
**B)** SIGTAP (maior impacto, dados atualizados)  
**C)** CID-10 (já tem JSON pronto!)  
**D)** Criar estrutura base dos scripts primeiro

**Minha recomendação**: **D → C → A → B** (estrutura, depois o mais fácil, escalar complexidade)

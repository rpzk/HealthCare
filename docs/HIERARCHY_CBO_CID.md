# 🏗️ Hierarquia Completa: CBO e CID-10

## 📊 Visão Geral

A estrutura de CBO (Classificação Brasileira de Ocupações) e CID-10 (Classificação Internacional de Doenças) foi **reestruturada** para refletir a hierarquia oficial completa, conforme o sistema legado SSF e as fixtures originais.

---

## 🔄 Mudanças Implementadas

### ✅ **Antes** (Estrutura Simplificada)
- **CBO**: 2 tabelas genéricas (`cbo_groups` + `occupations`)
- **CID**: 1 tabela auto-referenciada (`medical_codes`)
- **Problema**: Perda de semântica hierárquica

### ✅ **Depois** (Hierarquia Completa)
- **CBO**: 5 tabelas específicas (Grande Grupo → Ocupação)
- **CID**: 4 tabelas específicas (Capítulo → Subcategoria)
- **Benefício**: Estrutura fiel às classificações oficiais

---

## 📚 CBO - Classificação Brasileira de Ocupações

### Hierarquia (5 Níveis)

```
┌─────────────────────────────────────────────────────────┐
│ Nível 1: GRANDE GRUPO (10 grupos)                      │
│ Tabela: cbo_grande_grupos                              │
│ Ex: 0 - Membros das forças armadas                     │
│     2 - Profissionais das ciências e das artes         │
└───────────────────────┬─────────────────────────────────┘
                        │
        ┌───────────────▼──────────────────┐
        │ Nível 2: SUBGRUPO PRINCIPAL      │
        │ Tabela: cbo_subgrupos_principais │
        │ Ex: 22 - Prof. ciências exatas   │
        │     23 - Prof. ciências biológicas│
        └───────────────┬──────────────────┘
                        │
                ┌───────▼────────┐
                │ Nível 3: SUBGRUPO│
                │ Tabela: cbo_subgrupos│
                │ Ex: 223 - Prof. medicina│
                └───────┬────────┘
                        │
                ┌───────▼────────┐
                │ Nível 4: FAMÍLIA │
                │ Tabela: cbo_familias│
                │ Ex: 2231 - Médicos  │
                └───────┬────────┘
                        │
                ┌───────▼────────────┐
                │ Nível 5: OCUPAÇÃO  │
                │ Tabela: occupations│
                │ Ex: 223105 - Médico│
                │     clínico        │
                └────────────────────┘
```

### Modelos Prisma

```prisma
model CBOGrandeGrupo {
  id      String
  code    String  // Ex: "0", "2"
  name    String
  subgruposPrincipais CBOSubgrupoPrincipal[]
}

model CBOSubgrupoPrincipal {
  id             String
  code           String  // Ex: "22", "23"
  grandeGrupoId  String
  subgrupos      CBOSubgrupo[]
}

model CBOSubgrupo {
  id                  String
  code                String  // Ex: "223"
  subgrupoPrincipalId String
  familias            CBOFamilia[]
}

model CBOFamilia {
  id         String
  code       String  // Ex: "2231"
  subgrupoId String
  ocupacoes  Occupation[]
}

model Occupation {
  id          String
  code        String  // Ex: "223105"
  title       String
  familiaId   String?
  // Campos legacy mantidos
  groupId     String? // DEPRECATED
}
```

### Estatísticas

| Nível | Tabela | Quantidade Esperada |
|-------|--------|---------------------|
| 1 | Grande Grupo | 10 |
| 2 | Subgrupo Principal | ~48 |
| 3 | Subgrupo | ~192 |
| 4 | Família | ~600 |
| 5 | Ocupação | ~2.650 |

---

## 🏥 CID-10 - Classificação Internacional de Doenças

### Hierarquia (4 Níveis)

```
┌──────────────────────────────────────────────────────┐
│ Nível 1: CAPÍTULO (22 capítulos: I-XXII)            │
│ Tabela: cid10_capitulos                             │
│ Ex: I   - Doenças infecciosas (A00-B99)             │
│     II  - Neoplasias (C00-D48)                      │
│     XIX - Lesões/envenenamento (S00-T98)            │
└───────────────────┬──────────────────────────────────┘
                    │
        ┌───────────▼────────────┐
        │ Nível 2: GRUPO         │
        │ Tabela: cid10_grupos   │
        │ Ex: A00-A09 - Doenças  │
        │     infecciosas intestinais│
        └───────────┬────────────┘
                    │
            ┌───────▼────────┐
            │ Nível 3: CATEGORIA│
            │ Tabela: cid10_categorias│
            │ Ex: A00 - Cólera     │
            │     (3 caracteres)   │
            └───────┬────────┘
                    │
            ┌───────▼──────────┐
            │ Nível 4: SUBCATEGORIA│
            │ Tabela: medical_codes│
            │ Ex: A00.0 - Cólera  │
            │     por V.cholerae  │
            │     (4+ caracteres) │
            └─────────────────────┘
```

### Modelos Prisma

```prisma
model CID10Capitulo {
  id            String
  code          String  // Ex: "I", "II", "XIX"
  codeRange     String  // Ex: "A00-B99"
  name          String
  grupos        CID10Grupo[]
  subcategorias MedicalCode[]
}

model CID10Grupo {
  id            String
  code          String  // Ex: "A00-A09"
  capituloId    String
  categorias    CID10Categoria[]
  subcategorias MedicalCode[]
}

model CID10Categoria {
  id             String
  code           String  // Ex: "A00" (3 char)
  grupoId        String
  subcategorias  MedicalCode[]
}

model MedicalCode {
  id          String
  code        String  // Ex: "A00.0" (4+ char)
  display     String
  // Hierarquia específica
  capituloId  String?
  grupoId     String?
  categoriaId String?
  // Legacy mantido
  chapter     String? // DEPRECATED
  parentId    String? // DEPRECATED
}
```

### Estatísticas

| Nível | Tabela | Quantidade Esperada |
|-------|--------|---------------------|
| 1 | Capítulo | 22 |
| 2 | Grupo | ~280 |
| 3 | Categoria | ~2.000 |
| 4 | Subcategoria | ~14.000 |

---

## 🔧 Compatibilidade com Código Legado

### ✅ Mantido para Retrocompatibilidade

**CBO:**
- Tabela `cbo_groups` **mantida** como DEPRECATED
- Campo `Occupation.groupId` **mantido**
- View `cbo_groups_compat` criada para queries antigas

**CID:**
- Campo `MedicalCode.chapter` **mantido** como string
- Campo `MedicalCode.parentId` **mantido** para auto-referência
- Índices antigos **preservados**

### ⚠️ Campos Denormalizados (Performance)

Para evitar JOINs em buscas frequentes:

**CBO:**
```prisma
model Occupation {
  familiaId       String?  // FK hierárquica
  grandeGrupoCode String?  // Denormalizado
  familiaCode     String?  // Denormalizado
}
```

**CID:**
```prisma
model MedicalCode {
  capituloId   String?  // FK hierárquica
  grupoId      String?  // FK hierárquica
  categoriaId  String?  // FK hierárquica
  capituloCode String?  // Denormalizado
  grupoCode    String?  // Denormalizado
}
```

---

## 📥 Scripts de Import

### Importar CBO Completo

```bash
# Converter Excel → JSON hierárquico
npm run fixtures:convert:cbo

# Importar no banco
npm run fixtures:import:cbo

# Validar hierarquia
npm run fixtures:validate:cbo
```

### Importar CID-10 Completo

```bash
# Converter Excel → JSON hierárquico
npm run fixtures:convert:cid

# Importar no banco
npm run fixtures:import:cid

# Validar hierarquia
npm run fixtures:validate:cid
```

---

## 🔍 Exemplos de Uso

### Buscar Ocupação com Hierarquia Completa

```typescript
const ocupacao = await prisma.occupation.findUnique({
  where: { code: '223105' },
  include: {
    familia: {
      include: {
        subgrupo: {
          include: {
            subgrupoPrincipal: {
              include: {
                grandeGrupo: true
              }
            }
          }
        }
      }
    }
  }
})

// Retorna:
// 223105 - Médico clínico
//   └ 2231 - Médicos (Família)
//     └ 223 - Profissionais da medicina (Subgrupo)
//       └ 22 - Prof. ciências exatas/engenharia (Subgrupo Principal)
//         └ 2 - Prof. ciências e artes (Grande Grupo)
```

### Buscar CID com Hierarquia Completa

```typescript
const codigo = await prisma.medicalCode.findUnique({
  where: { systemId_code: { systemId: 'xxx', code: 'A00.0' } },
  include: {
    categoria: {
      include: {
        grupo: {
          include: {
            capitulo: true
          }
        }
      }
    }
  }
})

// Retorna:
// A00.0 - Cólera devida a Vibrio cholerae
//   └ A00 - Cólera (Categoria)
//     └ A00-A09 - Doenças infecciosas intestinais (Grupo)
//       └ I - Algumas doenças infecciosas (A00-B99) (Capítulo)
```

### Buscar Todas Ocupações de uma Família

```typescript
const medicos = await prisma.cBOFamilia.findUnique({
  where: { code: '2231' },
  include: {
    ocupacoes: {
      where: { active: true },
      orderBy: { title: 'asc' }
    }
  }
})
```

### Listar Grupos de um Capítulo CID

```typescript
const capitulo = await prisma.cID10Capitulo.findUnique({
  where: { code: 'I' },
  include: {
    grupos: {
      include: {
        categorias: {
          include: {
            _count: {
              select: { subcategorias: true }
            }
          }
        }
      }
    }
  }
})
```

---

## 🎯 Benefícios da Nova Estrutura

### 1. **Semântica Clara**
- Cada nível tem nome e propósito específico
- Facilita compreensão do domínio

### 2. **Queries Eficientes**
- Campos denormalizados evitam JOINs
- Índices específicos por nível

### 3. **Navegação Hierárquica**
- Drill-down/Roll-up natural
- Breadcrumbs automáticos

### 4. **Reutilização**
- Estrutura CBO pode ser usada em outros sistemas
- Taxonomias compartilháveis

### 5. **Validação de Dados**
- Constraints garantem integridade
- Impossível criar códigos órfãos

---

## 📊 Próximos Passos

- [ ] Converter fixtures Excel → JSON estruturado
- [ ] Popular banco dev com hierarquia completa
- [ ] Criar APIs de navegação hierárquica
- [ ] Atualizar UIs de busca com drill-down
- [ ] Documentar exemplos de queries complexas

---

**Data**: 2026-03-01  
**Status**: ✅ Schema atualizado, aguardando import de dados  
**Compatibilidade**: ✅ 100% retrocompatível com código legado

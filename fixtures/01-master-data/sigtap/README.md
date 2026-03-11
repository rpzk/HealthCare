# 🏥 SIGTAP - Sistema de Gerenciamento da Tabela de Procedimentos do SUS

## 📊 Situação Atual

**Status**: ⚠️ **PRECISA ATUALIZAÇÃO**

**Arquivos disponíveis localmente**:
- `/home/rafael/Desenvolvimento/Fixtures/sigtap/` - 27 arquivos SQL (tabelas antigas)

**Problema**: 
- ❌ Serviço oficial de download INDISPONÍVEL
- ⚠️ Arquivos locais podem estar desatualizados
- ⚠️ Formato SQL precisa ser convertido para JSON

---

## 🎯 O que é o SIGTAP?

Sistema oficial do Ministério da Saúde que contém:
- **4.900+ procedimentos** realizados pelo SUS
- Códigos de procedimentos
- Valores de remuneração
- Regras de utilização
- Níveis de complexidade
- Compatibilidades (CID, CBO, faixa etária, sexo)

---

## 📥 Fontes de Dados

### 1. 🌐 Portal Oficial (INDISPONÍVEL)

**URL**: http://sigtap.datasus.gov.br/tabela-unificada/app/download.jsp

**Status**: ❌ **"Serviço de downloads encontra-se indisponível"**

**O que deveria ter**:
- Tabela unificada completa
- Formato: ZIP com arquivos DBF
- Atualização: Mensal (competência)

---

### 2. 🐙 GitHub - Alternativas Comunitárias

#### Opção A: sigtap-gen
**Repositório**: https://github.com/julianlfs/sigtap-gen

**Descrição**: Monitora e converte tabelas SIGTAP em JSON

**Vantagens**:
- ✅ Conversão automática DBF → JSON
- ✅ Mantém estrutura original
- ✅ Script de atualização

**Limitação**: Depende do download oficial funcionar

---

#### Opção B: importSIGTAPTables
**Repositório**: https://github.com/ricmed/importSIGTAPTables

**Descrição**: Scripts PHP para importar tabelas SIGTAP

**Vantagens**:
- ✅ Scripts prontos de import
- ✅ Tratamento de relacionamentos
- ✅ Compatibilidades

---

#### Opção C: datazoom.saude (R package)
**Repositório**: https://github.com/datazoompuc/datazoom.saude

**Descrição**: Pacote R para acesso a dados de saúde brasileiros

**Vantagens**:
- ✅ Acesso programático
- ✅ Dados limpos e estruturados

---

### 3. 📁 Arquivos Locais Disponíveis

Temos 27 arquivos SQL em `/home/rafael/Desenvolvimento/Fixtures/sigtap/`:

| Arquivo | Descrição |
|---------|-----------|
| `sigtap_procedimento.sql` | **Tabela principal** de procedimentos |
| `sigtap_grupo.sql` | Grupos de procedimentos |
| `sigtap_subgrupo.sql` | Subgrupos |
| `sigtap_financiamento.sql` | Tipos de financiamento |
| `sigtap_cid.sql` | Compatibilidade com CID |
| `sigtap_ocupacao.sql` | Compatibilidade com CBO |
| `sigtap_compatibilidade.sql` | Regras de compatibilidade |
| ... | 20 outras tabelas auxiliares |

**Ação necessária**: Verificar se estão atualizados e converter para JSON

---

## 🛠️ Plano de Ação

### Opção 1: Usar Arquivos Locais (RÁPIDO)
✅ **Recomendado para começar**

```bash
# 1. Analisar arquivos SQL locais
head -100 /home/rafael/Desenvolvimento/Fixtures/sigtap/*.sql

# 2. Converter SQL → JSON
npm run fixtures:convert:sigtap

# 3. Importar para banco
npm run fixtures:import:sigtap
```

**Vantagens**: Rápido, disponível agora  
**Desvantagens**: Pode estar desatualizado

---

### Opção 2: Aguardar DATASUS Voltar (LENTO)
❌ **Não recomendado**

Aguardar o serviço oficial voltar online.

**Desvantagens**: Não sabemos quando voltará

---

### Opção 3: Buscar Dump Alternativo (MÉDIO)
⚠️ **Possível**

1. Procurar em repositórios de dados abertos
2. Contatar comunidade de saúde digital brasileira
3. Buscar em projetos de código aberto similares

---

## 📋 Estrutura das Tabelas SIGTAP

### Tabela Principal: `procedimento`
```sql
CREATE TABLE sigtap_procedimento (
  co_procedimento VARCHAR(10) PRIMARY KEY,  -- Código do procedimento
  no_procedimento VARCHAR(250),             -- Nome
  tp_complexidade CHAR(1),                  -- 1=Baixa, 2=Média, 3=Alta
  tp_financiamento VARCHAR(2),              -- Tipo de financiamento
  qt_maxima_execucao INT,                   -- Máximo por competência
  vl_idade_minima INT,                      -- Idade mínima
  vl_idade_maxima INT,                      -- Idade máxima
  tp_sexo CHAR(1),                          -- M/F/A (ambos)
  dt_competencia VARCHAR(6)                 -- AAAAMM
);
```

### Relacionamentos Importantes
```
procedimento
  ├── grupo (hierarquia)
  ├── subgrupo
  ├── financiamento (FAB, FPE, etc)
  ├── cid (quais CIDs são compatíveis)
  ├── ocupacao (quais profissionais podem executar)
  └── compatibilidade (regras complexas)
```

---

## 🎯 Schema JSON Proposto

```typescript
interface SigtapProcedure {
  // Identificação
  code: string                    // Ex: "0301010039"
  name: string                    // Nome do procedimento
  
  // Hierarquia
  group: {
    code: string
    name: string
  }
  subgroup: {
    code: string
    name: string
  }
  
  // Características
  complexity: 'BAIXA' | 'MEDIA' | 'ALTA'
  financing: string               // Ex: "FAB" (Atenção Básica)
  
  // Restrições
  minAge?: number
  maxAge?: number
  sex?: 'M' | 'F' | 'A'
  maxPerMonth?: number
  
  // Compatibilidades
  compatibleCids?: string[]       // Códigos CID compatíveis
  cboRequired?: string[]          // CBOs que podem executar
  
  // Valores
  value?: number                  // Valor de remuneração
  
  // Metadados
  validFrom: string               // AAAAMM
  active: boolean
  createdAt: Date
  updatedAt: Date
}
```

---

## 🔧 Scripts de Conversão

### Converter SQL Local → JSON

```bash
# Listar procedimentos disponíveis
wc -l /home/rafael/Desenvolvimento/Fixtures/sigtap/sigtap_procedimento.sql

# Converter para JSON
npm run fixtures:convert -- \
  --input=/home/rafael/Desenvolvimento/Fixtures/sigtap/sigtap_procedimento.sql \
  --output=fixtures/01-master-data/sigtap/procedures.json \
  --type=sigtap
```

---

## 📊 Métricas Esperadas

- ✅ **~4.900 procedimentos** cadastrados
- ✅ **100% com grupos/subgrupos**
- ✅ **>90% com compatibilidades CID**
- ✅ **>80% com CBO requerido**
- ✅ **Busca por código < 50ms**
- ✅ **Busca por nome < 100ms**

---

## ⚠️ Atenção

**Dados sensíveis**: Não. SIGTAP é público.  
**Licença**: Domínio público (governo brasileiro)  
**Atualização**: Mensal (quando disponível)  
**Uso**: Interno do sistema, sem redistribuição comercial

---

**Status**: ⚠️ **AGUARDANDO VALIDAÇÃO DOS ARQUIVOS LOCAIS**  
**Próximo passo**: Analisar conteúdo dos SQL e converter  
**Responsável**: Sistema HealthCare  
**Última atualização**: 2026-03-01

# 💊 Base de Medicamentos - Plano de Ampliação

## 📊 Situação Atual

**Status**: ❌ **CRÍTICO** - Base muito limitada (~50 medicamentos)

**Arquivos disponíveis localmente**:
- `/home/rafael/Desenvolvimento/Fixtures/Medicamentos/medicacao.xlsx` - Lista básica
- `/home/rafael/Desenvolvimento/Fixtures/Denominação Comum Brasileira.xlsx` - DCB
- `/home/rafael/Desenvolvimento/Fixtures/Medicamentos/xls_conformidade_*.xlsx` - ANVISA (2019-2023)

## 🎯 Meta: Base Completa e Atualizada

### Objetivo
Criar base com **~30.000 medicamentos** cobrindo:
- ✅ Rename 2024 (~1.000 essenciais do SUS)
- ✅ ANVISA Registro Completo (~30.000 registros)
- ✅ DCB - Denominação Comum Brasileira
- ✅ Classificação ATC
- ✅ Medicamentos de Alto Custo
- ✅ Medicamentos Controlados

---

## 📥 Fontes de Dados a Baixar

### 1. 🏥 Rename 2024 - Medicamentos Essenciais do SUS

**Prioridade**: 🔴 ALTA

**O que é**: Lista oficial dos medicamentos disponíveis no SUS (Atenção Básica, Estratégica, Especializada e Hospitalar)

**Dados**:
- **Total**: ~1.000 medicamentos
- **Classificação**: AWaRe (OMS) para antimicrobianos
- **Informações**: Nome, forma farmacêutica, concentração, financiamento

**Fontes**:
1. **PDF Oficial**: https://bvsms.saude.gov.br/bvs/publicacoes/relacao_nacional_medicamentos_2024.pdf
2. **Painel Eletrônico**: http://ads.saude.gov.br/servlet/mstrWeb (consulta em tempo real)
3. **Portal**: https://www.gov.br/saude/pt-br/composicao/sectics/rename

**Formato desejado**: JSON estruturado
```json
{
  "name": "Paracetamol",
  "strength": "500mg",
  "form": "Comprimido",
  "financing": "Componente Básico",
  "atc_code": "N02BE01",
  "aware_class": "Access"
}
```

**Ação**: Precisa **scraping do PDF** ou **API do painel eletrônico**

---

### 2. 💊 ANVISA - Base Completa de Medicamentos Registrados

**Prioridade**: 🔴 ALTA

**O que é**: Todos os medicamentos com registro ativo na ANVISA

**Dados**:
- **Total**: ~30.000 registros
- **Atualização**: Diária (D-1)
- **Informações**: Nome comercial, princípio ativo, fabricante, registro, validade

**Fontes**:
1. **Portal Dados Abertos**: https://dados.gov.br/dados/conjuntos-dados/medicamentos-registrados-no-brasil
2. **Consulta Online**: https://consultas.anvisa.gov.br/#/medicamentos/
3. **API**: Verificar se existe endpoint REST

**Formato disponível**: CSV / Excel / JSON (via API?)

**Ação**: **Baixar CSV** do portal de dados abertos

---

### 3. 🧪 DCB - Denominação Comum Brasileira

**Prioridade**: 🟡 MÉDIA (já temos Excel local)

**O que é**: Nomes padronizados de fármacos e substâncias ativas

**Status**: ✅ **Disponível localmente**
- Arquivo: `/home/rafael/Desenvolvimento/Fixtures/Denominação Comum Brasileira.xlsx`

**Ação**: **Converter para JSON** e integrar com outras bases

---

### 4. 🏷️ Classificação ATC - Anatômico Terapêutico Químico

**Prioridade**: 🟡 MÉDIA

**O que é**: Sistema internacional de classificação de medicamentos (OMS)

**Fonte**: 
- WHO ATC Index: https://www.whocc.no/atc_ddd_index/
- Base brasileira: ANVISA / DATASUS

**Formato**: Hierárquico (5 níveis)
```
N - Sistema Nervoso
  N02 - Analgésicos
    N02B - Outros analgésicos e antipiréticos
      N02BE - Anilidas
        N02BE01 - Paracetamol
```

**Ação**: **Buscar base completa** em CSV/JSON

---

### 5. 💰 Medicamentos de Alto Custo (CEAF)

**Prioridade**: 🟢 BAIXA

**O que é**: Componente Especializado da Assistência Farmacêutica

**Fonte**: Ministério da Saúde / DATASUS

**Ação**: **Extrair da Rename 2024** (já incluído)

---

### 6. 🔒 Medicamentos Controlados (Portaria 344/98)

**Prioridade**: 🟡 MÉDIA

**O que é**: Lista de substâncias/medicamentos sujeitos a controle especial

**Listas**:
- A1/A2/A3: Entorpecentes
- B1/B2: Psicotrópicos
- C1/C2/C3: Outras substâncias
- D1/D2: Precursores
- E: Plantas proibidas
- F1/F2/F3: Insumos químicos

**Fonte**: ANVISA - Portaria SVS/MS nº 344/1998 (atualizada)

**Ação**: **Buscar lista atualizada** no site da ANVISA

---

## 🛠️ Plano de Implementação

### Fase 1: Download e Organização (Esta semana)
- [x] Criar estrutura de fixtures
- [ ] Baixar Rename 2024 (PDF → scraping)
- [ ] Baixar base ANVISA (CSV)
- [ ] Converter DCB Excel → JSON
- [ ] Baixar ATC WHO (se disponível)
- [ ] Baixar lista de controlados

### Fase 2: Processamento e Integração (Próxima semana)
- [ ] Criar schema unificado de medicamento
- [ ] Integrar múltiplas fontes (merge por princípio ativo)
- [ ] Adicionar classificações (ATC, controlados, SUS)
- [ ] Validar e limpar duplicatas
- [ ] Gerar JSON final estruturado

### Fase 3: Import para Banco (Depois de testar)
- [ ] Script de import otimizado (bulk insert)
- [ ] Índices de busca (nome, princípio ativo, ATC)
- [ ] Testes de performance
- [ ] Documentação de uso

---

## 📋 Schema Unificado Proposto

```typescript
interface Medication {
  // Identificação
  id: string
  name: string                    // Nome comercial ou genérico
  activeIngredient: string        // Princípio ativo (DCB)
  tradeName?: string              // Nome fantasia
  
  // Apresentação
  strength: string                // Ex: "500mg"
  form: string                    // Ex: "Comprimido"
  packaging?: string              // Ex: "Caixa com 20 comprimidos"
  
  // Registro
  anvisaRegistry?: string         // Número de registro ANVISA
  manufacturer?: string           // Fabricante
  registryValidUntil?: Date
  
  // Classificação
  atcCode?: string                // Ex: "N02BE01"
  atcDescription?: string
  therapeuticClass?: string
  
  // SUS
  inRename: boolean               // Está na Rename?
  renameFinancing?: string        // Ex: "Componente Básico"
  susCode?: string
  
  // Controle
  isControlled: boolean
  controlledList?: string         // Ex: "Portaria 344/98 - Lista B1"
  prescriptionType: 'SIMPLES' | 'ESPECIAL' | 'CONTROLE_ESPECIAL' | 'NOTIFICACAO_RECEITA'
  
  // Farmácia
  basicPharmacy: boolean          // Disponível na farmácia básica?
  popularPharmacy: boolean        // Farmácia popular?
  highCost: boolean               // Alto custo (CEAF)?
  
  // Uso
  route?: string                  // Via de administração
  defaultFrequency?: string
  defaultDuration?: string
  instructions?: string
  warnings?: string
  
  // Metadados
  active: boolean
  createdAt: Date
  updatedAt: Date
}
```

---

## 🔗 Scripts Úteis

```bash
# Baixar todas as fontes
npm run fixtures:download:medications

# Processar e integrar
npm run fixtures:process:medications

# Importar para o banco
npm run fixtures:import:medications

# Validar integridade
npm run fixtures:validate:medications
```

---

## 📊 Métricas de Sucesso

- ✅ **>25.000 medicamentos** cadastrados
- ✅ **100% Rename 2024** importada
- ✅ **>90% com classificação ATC**
- ✅ **>80% com registro ANVISA**
- ✅ **100% medicamentos controlados** identificados
- ✅ **Busca por nome < 100ms**

---

**Status**: 🔄 **EM ANDAMENTO**  
**Responsável**: Sistema HealthCare  
**Última atualização**: 2026-03-01

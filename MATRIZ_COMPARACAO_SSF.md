# 📊 Matriz de Comparação: SSF Legado vs Sistema Atual

**Atualizado em:** 15/12/2025

---

## 🎯 Visão Geral

| Métrica | Valor |
|---------|-------|
| **Total de Funcionalidades Analisadas** | 14 |
| **Completamente Assimiladas (100%)** | 6 (43%) |
| **Parcialmente Assimiladas (40-90%)** | 4 (29%) |
| **Não Assimiladas (0-20%)** | 4 (29%) |
| **Percentual Global de Assimilação** | **73%** |

---

## 📋 Tabela Comparativa Detalhada

| # | Funcionalidade | SSF Legado | Sistema Atual | Status | % | Impacto | Esforço | Prioridade |
|---|---------------|------------|---------------|--------|---|---------|---------|------------|
| 1 | **Hierarquia Geográfica** | 9 níveis (País→Microárea) | 9 modelos Prisma completos | ✅ Completa | 100% | 🔴 Crítico | - | - |
| 2 | **Gestão de ACS** | Atribuição + histórico | User + ACSHistory completo | ✅ Completa | 100% | 🔴 Crítico | - | - |
| 3 | **Domicílios/Famílias** | 15 campos sociodemográficos | Household + 13 campos | ✅ Completa | 95% | 🔴 Crítico | 5h | 🟢 Baixa |
| 4 | **Endereçamento** | 9 níveis + lat/long | Address com hierarquia completa | ✅ Completa | 100% | 🔴 Crítico | - | - |
| 5 | **Consultas Estruturadas** | 35 flags (demanda, DCNT, condutas) | 32 flags implementados | ✅ Completa | 90% | 🔴 Crítico | 10h | 🟡 Média |
| 6 | **Relatórios SIAB** | 7 tipos (AD, PM, PE, SS, AG, AC, EPI) | 7 modelos completos | ✅ Completa | 100% | 🔴 Crítico | - | - |
| 7 | **Pré-Natal** | Consultas + testes + vacinação | Pregnancy básico + relatórios | ⚠️ Parcial | 60% | 🔴 Crítico | 35h | 🔴 Alta |
| 8 | **Prescrições** | Classificação (comum/controlada/azul/amarela) | Prescription genérico | ⚠️ Parcial | 50% | 🟡 Alto | 25h | 🔴 Alta |
| 9 | **Encaminhamentos** | Unidade destino + agendamento | Referral básico | ⚠️ Parcial | 40% | 🟡 Médio | 15h | 🟢 Média |
| 10 | **Exames Estruturados** | 8 tipos + flags | ExamRequest + flags | ⚠️ Parcial | 50% | 🟡 Médio | 15h | 🟢 Média |
| 11 | **Calendário Vacinal** | Vacina + Vacinação + Calendário | Nenhum | ❌ Ausente | 0% | 🔴 Crítico | 40h | 🔴 Crítica |
| 12 | **Atestados Médicos** | 11 tipos estruturados | MedicalCertificate (2 tipos) | ❌ Ausente | 20% | 🟡 Médio | 20h | 🟡 Média |
| 13 | **História Ginecológica** | Timeline de eventos | Nenhum | ❌ Ausente | 0% | 🟡 Médio | 15h | 🟢 Média |
| 14 | **Medidas Antropométricas** | Peso, altura, perímetros, IMC | VitalSigns (sem antropometria) | ❌ Ausente | 0% | 🟡 Médio | 20h | 🔴 Alta |

---

## 🎨 Mapa de Calor

### Por Status de Assimilação

```
✅ COMPLETAS (100%)      ████████████████████████ 43%
⚠️ PARCIAIS (40-90%)     ████████████████         29%
❌ AUSENTES (0-20%)      ████████████████         29%
```

### Por Impacto

```
🔴 CRÍTICO               ███████████████████████████████ 64%
🟡 ALTO/MÉDIO            ████████████████                36%
🟢 BAIXO                 ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  0%
```

### Por Prioridade de Implementação

```
🔴 CRÍTICA/ALTA          ████████████████████████ 57%
🟡 MÉDIA                 ████████████             29%
🟢 BAIXA                 ██                        7%
✓ NÃO NECESSÁRIA         █                         7%
```

---

## 📊 Análise de Gaps por Categoria

### 🏥 Dados Clínicos

| Funcionalidade | SSF | Atual | Gap |
|---------------|-----|-------|-----|
| Consultas básicas | ✅ | ✅ | - |
| Tipos de demanda | ✅ | ✅ | - |
| DCNT (diabetes, hipertensão) | ✅ | ✅ | - |
| Saúde mental | ✅ | ✅ | - |
| Pré-natal estruturado | ✅ | ⚠️ | 40% |
| Antropometria | ✅ | ❌ | 100% |
| História ginecológica | ✅ | ❌ | 100% |

**Gap Médio:** 34%

### 📍 Geografia e Cobertura

| Funcionalidade | SSF | Atual | Gap |
|---------------|-----|-------|-----|
| Hierarquia geográfica | ✅ | ✅ | - |
| Endereços | ✅ | ✅ | - |
| Microáreas | ✅ | ✅ | - |
| ACS | ✅ | ✅ | - |
| Domicílios | ✅ | ✅ | 5% |

**Gap Médio:** 1%

### 💊 Medicamentos e Prescrições

| Funcionalidade | SSF | Atual | Gap |
|---------------|-----|-------|-----|
| Prescrição básica | ✅ | ✅ | - |
| Classificação de receitas | ✅ | ❌ | 100% |
| Receitas controladas | ✅ | ❌ | 100% |
| Fitoterápicos | ✅ | ❌ | 100% |

**Gap Médio:** 75%

### 📋 Relatórios e Indicadores

| Funcionalidade | SSF | Atual | Gap |
|---------------|-----|-------|-----|
| Relatórios SIAB | ✅ | ✅ | - |
| Indicadores epidemiológicos | ✅ | ✅ | - |
| Cobertura vacinal | ✅ | ❌ | 100% |
| Produção diária/mensal | ✅ | ✅ | - |

**Gap Médio:** 25%

### 🔄 Fluxos Assistenciais

| Funcionalidade | SSF | Atual | Gap |
|---------------|-----|-------|-----|
| Encaminhamentos | ✅ | ⚠️ | 60% |
| Contra-referência | ✅ | ❌ | 100% |
| Exames solicitados | ✅ | ⚠️ | 50% |
| Atestados | ✅ | ⚠️ | 80% |

**Gap Médio:** 72%

---

## 🎯 Priorização por MoSCoW

### 🔴 Must Have (Deve Ter) - Bloqueadores

| # | Funcionalidade | Razão | Esforço | Prazo |
|---|---------------|-------|---------|-------|
| 1 | Calendário Vacinal | Indicador PNI obrigatório | 40h | Sem 1-2 |
| 2 | Pré-Natal Completo | Indicador materno-infantil crítico | 35h | Sem 2-3 |
| 3 | Medidas Antropométricas | Base para avaliação nutricional | 20h | Sem 3 |

**Total:** 95h (2-3 semanas com 2 devs)

### 🟡 Should Have (Deveria Ter) - Importantes

| # | Funcionalidade | Razão | Esforço | Prazo |
|---|---------------|-------|---------|-------|
| 4 | Prescrições Classificadas | Vigilância sanitária | 25h | Sem 4 |
| 5 | Atestados Completos | Variedade de tipos necessários | 20h | Sem 5 |
| 6 | Encaminhamentos Completos | Rastreabilidade de referências | 15h | Sem 5-6 |

**Total:** 60h (1.5 semanas com 2 devs)

### 🟢 Could Have (Poderia Ter) - Desejáveis

| # | Funcionalidade | Razão | Esforço | Prazo |
|---|---------------|-------|---------|-------|
| 7 | História Ginecológica | Timeline reprodutiva | 15h | Sem 6 |
| 8 | Exames Estruturados Completos | Catálogo detalhado | 15h | Sem 6 |
| 9 | Domicílios Completos | 2 campos faltantes | 5h | Sem 6 |

**Total:** 35h (1 semana com 1 dev)

### ⚪ Won't Have (Não Terá Agora) - Adiados

- Nenhum (todas as funcionalidades são relevantes)

---

## 📈 Roadmap de Assimilação

### Fase 7: Essencial (4 semanas)

```
Semana 1: Calendário Vacinal (40h)
├─ Dia 1-2: Modelos Prisma (Vaccine, Vaccination, VaccineScheduleEntry)
├─ Dia 3: Popular PNI (Programa Nacional de Imunização)
├─ Dia 4-5: APIs (registro, consulta, alertas)
└─ Dia 6-7: UI (formulário, timeline, relatórios)

Semana 2: Pré-Natal Completo (35h)
├─ Dia 1: Modelo PreNatalConsultation
├─ Dia 2-3: Integração com Pregnancy + Consultation
├─ Dia 4-5: Formulários e testes
├─ Dia 6: Classificação de risco
└─ Dia 7: Calendário vacinal gestante

Semana 3: Antropometria (20h)
├─ Dia 1: Expandir VitalSigns
├─ Dia 2: Cálculos (IMC, percentis OMS)
├─ Dia 3-4: UI e gráficos
└─ Dia 5: Alertas nutricionais

Semana 4: Prescrições Classificadas (25h)
├─ Dia 1: Modelo Medication
├─ Dia 2-3: Classificação e validação
├─ Dia 4-5: Receitas especiais (azul/amarela)
└─ Dia 6: Integração vigilância sanitária
```

**Resultado:** 73% → 90%

### Fase 8: Complementar (2 semanas)

```
Semana 5: Atestados + Encaminhamentos (35h)
├─ Dia 1-3: Expandir MedicalCertificate (11 tipos)
├─ Dia 4: Templates PDF
├─ Dia 5-7: Encaminhamentos completos

Semana 6: Finalizações (30h)
├─ Dia 1-3: História Ginecológica
├─ Dia 4-5: Exames Estruturados
├─ Dia 6: Domicílios (campos faltantes)
└─ Dia 7: Testes e documentação
```

**Resultado:** 90% → 100%

---

## 💰 Custo de Implementação

### Recursos Humanos

| Perfil | Horas | Quantidade | Total |
|--------|-------|------------|-------|
| Desenvolvedor Full Stack Sênior | 120h | 1 | 120h |
| Desenvolvedor Full Stack Pleno | 100h | 1 | 100h |
| **Total** | - | - | **220h** |

### Cronograma

- **6 semanas** (com 2 desenvolvedores)
- **4 semanas** (com 3 desenvolvedores)
- **3 semanas** (com 4 desenvolvedores - não recomendado por overhead)

**Recomendação:** 2 desenvolvedores por 6 semanas

---

## ✅ Checklist de Validação

### Fase 7 - Essencial

- [ ] **Calendário Vacinal**
  - [ ] Modelos criados e migrados
  - [ ] PNI completo populado
  - [ ] API de registro funcionando
  - [ ] Alertas de doses pendentes
  - [ ] Relatório de cobertura
  - [ ] Testes unitários (>80% coverage)

- [ ] **Pré-Natal Completo**
  - [ ] PreNatalConsultation integrado
  - [ ] Testes estruturados
  - [ ] Classificação de risco
  - [ ] Calendário vacinal gestante
  - [ ] Relatórios individuais e agregados
  - [ ] Validações clínicas

- [ ] **Antropometria**
  - [ ] VitalSigns expandido
  - [ ] Cálculo automático de IMC
  - [ ] Percentis OMS (pediatria)
  - [ ] Gráficos de crescimento
  - [ ] Alertas nutricionais
  - [ ] Histórico temporal

- [ ] **Prescrições Classificadas**
  - [ ] Modelo Medication catalogado
  - [ ] Classificação de receitas
  - [ ] Validação de controlados
  - [ ] PDFs diferenciados (azul/amarela)
  - [ ] Integração vigilância
  - [ ] Auditoria de prescrições

### Fase 8 - Complementar

- [ ] **Atestados Completos**
  - [ ] 11 tipos implementados
  - [ ] Templates PDF por tipo
  - [ ] Assinatura digital
  - [ ] Integração órgãos públicos
  - [ ] Rastreamento de emissão

- [ ] **Encaminhamentos Completos**
  - [ ] Link com Consultation
  - [ ] Unidade destino
  - [ ] Agendamento rastreado
  - [ ] Contra-referência
  - [ ] Status de retorno

- [ ] **História Ginecológica**
  - [ ] Modelo criado
  - [ ] Timeline de eventos
  - [ ] Integração com consultas
  - [ ] Relatórios específicos

- [ ] **Exames e Domicílios**
  - [ ] Catálogo de exames
  - [ ] Valores de referência
  - [ ] 2 campos de domicílio adicionados
  - [ ] Validações completas

---

## 🎓 Lições Aprendidas

### Sucessos da Integração SSF

1. ✅ **Hierarquia Geográfica**
   - Migração completa e eficiente
   - Performance otimizada com índices
   - Escalabilidade para todo o Brasil

2. ✅ **Relatórios SIAB**
   - Conformidade 100% com padrões SUS
   - Agregação automática
   - Modelos bem estruturados

3. ✅ **Gestão de ACS**
   - Histórico completo com audit trail
   - Integração perfeita com geografia

### Desafios Identificados

1. ⚠️ **Pré-Natal**
   - Complexidade subestimada inicialmente
   - Necessita integração profunda com múltiplos módulos
   - Requisitos clínicos específicos

2. ⚠️ **Prescrições**
   - Regulamentação de medicamentos controlados
   - Integração com vigilância sanitária
   - Geração de PDFs específicos

3. ⚠️ **Calendário Vacinal**
   - PNI em constante atualização
   - Múltiplas faixas etárias
   - Esquemas vacinais complexos

---

## 📚 Documentos Relacionados

- [SSF_INTEGRATION_COMPLETE.md](SSF_INTEGRATION_COMPLETE.md) - Status da integração
- [SSF_FEATURES_ANALYSIS.md](SSF_FEATURES_ANALYSIS.md) - Análise detalhada de features
- [SSF_EXECUTIVE_SUMMARY.md](SSF_EXECUTIVE_SUMMARY.md) - Resumo executivo
- [SUS_REPORTS_IMPLEMENTATION.md](SUS_REPORTS_IMPLEMENTATION.md) - Relatórios SIAB
- [COMPARACAO_SSF_SISTEMA_ATUAL.md](COMPARACAO_SSF_SISTEMA_ATUAL.md) - Comparação detalhada

---

**Última Atualização:** 15/12/2025  
**Próxima Revisão:** Após conclusão da Fase 7

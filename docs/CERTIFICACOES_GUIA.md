# Guia de Certificações para Software de Saúde no Brasil

## HealthCare - Sistema de Prontuário Eletrônico

**Data:** Novembro 2025  
**Versão:** 1.0

---

## 1. Visão Geral

Este documento apresenta as principais certificações aplicáveis a software de saúde no Brasil, com foco no sistema HealthCare.

---

## 2. ANVISA - Registro de Dispositivo Médico

A Agência Nacional de Vigilância Sanitária (ANVISA) classifica software de saúde como dispositivo médico, regulamentado pela RDC 185/2001 e IN 77/2020.

### 2.1. Classificação por Risco

| Classe | Nível de Risco | Exemplos | Tipo de Registro |
|--------|----------------|----------|------------------|
| **Classe I** | Baixo | Agendamento, prontuário básico, gestão administrativa | Notificação simplificada |
| **Classe II** | Médio | Apoio diagnóstico, alertas clínicos, cálculo de doses | Registro obrigatório |
| **Classe III** | Alto | Diagnóstico autônomo, planejamento cirúrgico | Registro + documentação técnica extensa |
| **Classe IV** | Muito Alto | Suporte à vida, monitoramento crítico | Registro + ensaios clínicos |

### 2.2. Enquadramento do HealthCare

O sistema HealthCare provavelmente se enquadra em:

- **Classe I** (notificação simples): Se a IA é utilizada apenas como ferramenta de apoio e todas as decisões clínicas são tomadas exclusivamente pelo profissional de saúde.

- **Classe II** (registro obrigatório): Se a IA faz sugestões diagnósticas que podem influenciar a conduta médica.

### 2.3. Custos e Prazos

| Item | Classe I | Classe II |
|------|----------|-----------|
| Taxa ANVISA | R$ 800 - R$ 2.000 | R$ 3.000 - R$ 8.000 |
| Consultoria | R$ 5.000 - R$ 15.000 | R$ 20.000 - R$ 50.000 |
| Prazo médio | 3-6 meses | 6-12 meses |

### 2.4. Documentação Necessária

- Dossiê técnico do produto
- Manual de instruções
- Análise de riscos (ISO 14971)
- Validação de software (IEC 62304)
- Biocompatibilidade (se aplicável)

---

## 3. SBIS/CFM - Certificação S-RES

A Sociedade Brasileira de Informática em Saúde (SBIS), em parceria com o Conselho Federal de Medicina (CFM), certifica Sistemas de Registro Eletrônico de Saúde (S-RES).

### 3.1. Níveis de Certificação

| Nível | Requisitos | Benefício Principal |
|-------|------------|---------------------|
| **NGS1** | Segurança básica, controle de acesso, auditoria, backup | Reconhecimento oficial do CFM |
| **NGS2** | NGS1 + Assinatura digital com certificado ICP-Brasil | Prontuário 100% digital (eliminação do papel) |

### 3.2. Requisitos NGS1 (Atendidos pelo HealthCare)

- ✅ Controle de acesso baseado em perfis (RBAC)
- ✅ Autenticação de usuários
- ✅ Registro de auditoria de todas as ações
- ✅ Backup automático de dados
- ✅ Criptografia de dados sensíveis
- ✅ Integridade dos registros

### 3.3. Requisitos Adicionais para NGS2

- ⏳ Assinatura digital com certificado ICP-Brasil
- ⏳ Carimbo do tempo
- ⏳ Integração com autoridade certificadora

### 3.4. Custos e Prazos

| Item | Valor Estimado |
|------|----------------|
| Taxa de certificação | R$ 8.000 - R$ 15.000 |
| Consultoria preparatória | R$ 10.000 - R$ 25.000 |
| Prazo de obtenção | 3-6 meses |
| Validade | 2 anos (renovação) |

---

## 4. ISO 27001 - Segurança da Informação

Certificação internacional que atesta a implementação de um Sistema de Gestão de Segurança da Informação (SGSI).

### 4.1. O que Certifica

- Políticas de segurança documentadas
- Gestão de riscos de segurança
- Controles técnicos e organizacionais
- Melhoria contínua

### 4.2. Quando é Necessária

- Licitações públicas (frequentemente exigida)
- Clientes enterprise (hospitais, redes de saúde)
- Diferencial competitivo no mercado

### 4.3. Custos e Prazos

| Item | Valor Estimado |
|------|----------------|
| Consultoria de implementação | R$ 30.000 - R$ 80.000 |
| Auditoria de certificação | R$ 15.000 - R$ 40.000 |
| Manutenção anual | R$ 10.000 - R$ 25.000 |
| Prazo de implementação | 6-18 meses |
| Validade | 3 anos (auditorias anuais) |

### 4.4. Controles Já Implementados no HealthCare

- ✅ Política de senhas
- ✅ Controle de acesso
- ✅ Criptografia em trânsito e repouso
- ✅ Registro de auditoria
- ✅ Backup e recuperação
- ✅ Gestão de vulnerabilidades (rate limiting, sanitização)

---

## 5. ISO 13485 - Dispositivos Médicos

Certificação de Sistema de Gestão de Qualidade específica para fabricantes de dispositivos médicos.

### 5.1. Aplicabilidade

Obrigatória para:
- Exportação para União Europeia
- Alguns clientes internacionais
- Complemento ao registro ANVISA

### 5.2. Custos e Prazos

| Item | Valor Estimado |
|------|----------------|
| Consultoria | R$ 50.000 - R$ 120.000 |
| Certificação | R$ 30.000 - R$ 60.000 |
| Prazo | 12-24 meses |

### 5.3. Prioridade

**Baixa** para o momento atual. Recomendada apenas se houver planos de internacionalização.

---

## 6. Matriz de Priorização

### 6.1. Recomendação por Fase

| Fase | Certificação | Prioridade | Investimento | Prazo |
|------|--------------|------------|--------------|-------|
| **Fase 1** (MVP) | SBIS/CFM NGS1 | Alta | R$ 20-40k | 3-6 meses |
| **Fase 1** (MVP) | ANVISA Classe I | Alta | R$ 10-20k | 3-6 meses |
| **Fase 2** (Crescimento) | ISO 27001 | Média | R$ 50-100k | 6-12 meses |
| **Fase 2** (Crescimento) | SBIS/CFM NGS2 | Média | R$ 30-50k | 3-6 meses |
| **Fase 3** (Enterprise) | ISO 13485 | Baixa | R$ 80-180k | 12-24 meses |

### 6.2. Investimento Total Estimado

| Cenário | Certificações | Investimento Total |
|---------|---------------|-------------------|
| **Mínimo** | ANVISA I + SBIS NGS1 | R$ 30.000 - R$ 60.000 |
| **Recomendado** | Mínimo + ISO 27001 | R$ 80.000 - R$ 160.000 |
| **Completo** | Recomendado + ISO 13485 | R$ 160.000 - R$ 340.000 |

---

## 7. Próximos Passos

### 7.1. Ações Imediatas

1. **Consultar especialista em regulatório** para confirmar classificação ANVISA
2. **Preencher autoavaliação SBIS** disponível em sbis.org.br
3. **Documentar processos internos** de desenvolvimento e qualidade

### 7.2. Preparação para SBIS/CFM

- [ ] Revisar controles de acesso
- [ ] Documentar política de backup
- [ ] Gerar relatório de auditoria
- [ ] Preparar manual do usuário
- [ ] Treinar equipe nos requisitos

### 7.3. Preparação para ANVISA

- [ ] Elaborar dossiê técnico
- [ ] Realizar análise de riscos (ISO 14971)
- [ ] Documentar ciclo de vida do software (IEC 62304)
- [ ] Preparar instruções de uso
- [ ] Validar requisitos de segurança

---

## 8. Contatos Úteis

| Órgão | Contato | Site |
|-------|---------|------|
| ANVISA | 0800 642 9782 | anvisa.gov.br |
| SBIS | contato@sbis.org.br | sbis.org.br |
| CFM | cfm@cfm.org.br | cfm.org.br |
| INMETRO | 0800 285 1818 | inmetro.gov.br |

---

## 9. Referências Normativas

- RDC ANVISA nº 185/2001 - Registro de produtos para saúde
- IN ANVISA nº 77/2020 - Software como dispositivo médico
- Resolução CFM nº 1.821/2007 - Prontuário eletrônico
- Resolução CFM nº 2.218/2018 - Telemedicina
- Manual SBIS de Certificação S-RES v5.2
- ABNT NBR ISO 27001:2022 - Segurança da informação
- ABNT NBR ISO 13485:2016 - Dispositivos médicos
- IEC 62304 - Ciclo de vida de software médico
- ISO 14971 - Gestão de riscos para dispositivos médicos

---

*Documento elaborado para fins de planejamento estratégico.*

*HealthCare - Sistema de Prontuário Eletrônico*

*Novembro 2025*

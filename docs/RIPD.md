# Relatório de Impacto à Proteção de Dados Pessoais (RIPD)

## HealthCare - Sistema de Prontuário Eletrônico

**Versão:** 1.0  
**Data:** Novembro 2025  
**Status:** Em vigor

---

## 1. IDENTIFICAÇÃO

### 1.1. Controlador

| Campo | Informação |
|-------|------------|
| Razão Social | [A ser preenchido pela instituição] |
| CNPJ | [A ser preenchido] |
| Endereço | [A ser preenchido] |
| CNES | [A ser preenchido] |

### 1.2. Encarregado (DPO)

| Campo | Informação |
|-------|------------|
| Nome | [A ser definido] |
| Email | dpo@healthcare.com.br |
| Telefone | [A ser definido] |

### 1.3. Operador (Sistema)

| Campo | Informação |
|-------|------------|
| Sistema | HealthCare - Prontuário Eletrônico |
| Versão | 1.0.0 |
| Desenvolvedor | [Nome/Empresa] |

---

## 2. DESCRIÇÃO DO TRATAMENTO

### 2.1. Natureza do Tratamento

O HealthCare é um sistema de prontuário eletrônico que realiza o tratamento de dados pessoais e dados pessoais sensíveis de pacientes para fins de assistência à saúde.

### 2.2. Escopo

| Aspecto | Descrição |
|---------|-----------|
| Volume de dados | Estimativa: [X] pacientes ativos |
| Área geográfica | [Municipal/Estadual/Nacional] |
| Período de retenção | Mínimo 20 anos (prontuário) |
| Categorias de titulares | Pacientes, profissionais de saúde, funcionários |

### 2.3. Contexto

O sistema foi desenvolvido para:

- Digitalizar prontuários médicos
- Facilitar o acesso ao histórico de saúde
- Apoiar a tomada de decisão clínica
- Garantir a continuidade do cuidado

---

## 3. DADOS PESSOAIS TRATADOS

### 3.1. Dados de Pacientes

| Categoria | Dados | Sensível | Finalidade |
|-----------|-------|----------|------------|
| Identificação | Nome, CPF, RG, data nascimento | Não | Identificação única |
| Contato | Telefone, email, endereço | Não | Comunicação |
| Demográficos | Gênero, raça/cor, escolaridade | Sim | Epidemiologia |
| Saúde | Diagnósticos, medicamentos, alergias | Sim | Assistência |
| Biométricos | Peso, altura, sinais vitais | Sim | Avaliação clínica |
| Imagens | Fotos de lesões, exames | Sim | Documentação clínica |

### 3.2. Dados de Profissionais

| Categoria | Dados | Sensível | Finalidade |
|-----------|-------|----------|------------|
| Identificação | Nome, CPF, registro profissional | Não | Identificação/Auditoria |
| Contato | Email, telefone | Não | Comunicação |
| Profissional | Especialidade, assinatura | Não | Validação de atos |

---

## 4. BASES LEGAIS

### 4.1. Fundamentos

| Base Legal | Aplicação |
|------------|-----------|
| Art. 7º, II - Cumprimento de obrigação legal | Manutenção de prontuário (CFM) |
| Art. 7º, V - Execução de contrato | Prestação de serviços de saúde |
| Art. 11, II, "e" - Proteção da vida | Emergências médicas |
| Art. 11, II, "f" - Tutela da saúde | Atendimento médico geral |
| Art. 7º, I - Consentimento | Comunicações de marketing |

### 4.2. Legislação Aplicável

- Lei nº 13.709/2018 (LGPD)
- Lei nº 13.787/2018 (Prontuário Eletrônico)
- Resolução CFM nº 1.821/2007
- Resolução CFM nº 2.217/2018 (Código de Ética Médica)
- Lei nº 12.965/2014 (Marco Civil da Internet)

---

## 5. ANÁLISE DE NECESSIDADE E PROPORCIONALIDADE

### 5.1. Necessidade

| Dado | Justificativa | Pode ser minimizado? |
|------|---------------|---------------------|
| Nome completo | Identificação do paciente | Não |
| CPF | Identificação única, faturamento SUS | Não |
| Data nascimento | Cálculo de idade, dosagens | Não |
| Telefone | Comunicação emergencial | Não |
| Histórico médico | Continuidade do cuidado | Não |
| Raça/cor | Epidemiologia (opcional) | Sim |

### 5.2. Proporcionalidade

Os dados coletados são estritamente necessários para:

1. **Identificação segura** do paciente
2. **Continuidade do cuidado** de saúde
3. **Cumprimento legal** (CFM, ANVISA, SUS)
4. **Segurança do paciente** (alergias, interações)

---

## 6. RISCOS IDENTIFICADOS

### 6.1. Matriz de Riscos

| Risco | Probabilidade | Impacto | Nível |
|-------|--------------|---------|-------|
| Acesso não autorizado | Média | Alto | **Alto** |
| Vazamento de dados | Baixa | Muito Alto | **Alto** |
| Indisponibilidade do sistema | Média | Alto | **Alto** |
| Erro de registro | Média | Médio | **Médio** |
| Uso indevido por funcionário | Baixa | Alto | **Médio** |
| Perda de dados | Muito Baixa | Muito Alto | **Médio** |
| Ataque ransomware | Baixa | Muito Alto | **Alto** |

### 6.2. Descrição dos Riscos

#### R1 - Acesso não autorizado

- **Descrição:** Pessoas sem autorização acessam dados de pacientes
- **Causa:** Credenciais comprometidas, falha de autenticação
- **Impacto:** Violação de privacidade, danos morais, sanções

#### R2 - Vazamento de dados

- **Descrição:** Dados são expostos publicamente ou a terceiros
- **Causa:** Falha de segurança, erro humano, ataque
- **Impacto:** Danos aos titulares, multas ANPD, reputação

#### R3 - Indisponibilidade

- **Descrição:** Sistema fora do ar por período prolongado
- **Causa:** Falha de infraestrutura, ataque DDoS
- **Impacto:** Interrupção do atendimento, risco à saúde

---

## 7. MEDIDAS DE MITIGAÇÃO

### 7.1. Medidas Técnicas

| Risco | Medida | Status |
|-------|--------|--------|
| R1 | Autenticação forte (senha + 2FA) | ✅ Implementado |
| R1 | Controle de acesso por perfil (RBAC) | ✅ Implementado |
| R1 | Registro de auditoria completo | ✅ Implementado |
| R2 | Criptografia em trânsito (TLS 1.3) | ✅ Implementado |
| R2 | Criptografia em repouso (AES-256) | ✅ Implementado |
| R2 | Rate limiting (300 req/min) | ✅ Implementado |
| R2 | Sanitização de entrada (XSS/SQLi) | ✅ Implementado |
| R3 | Backup automático diário | ✅ Implementado |
| R3 | Redundância de infraestrutura | ⏳ Planejado |
| R3 | Plano de disaster recovery | ⏳ Planejado |

### 7.2. Medidas Organizacionais

| Medida | Status |
|--------|--------|
| Política de segurança da informação | ✅ Documentada |
| Termo de confidencialidade | ✅ Assinado por usuários |
| Treinamento LGPD para equipe | ⏳ Planejado |
| Procedimento de resposta a incidentes | ✅ Documentado |
| Revisão periódica de acessos | ⏳ Trimestral |

---

## 8. DIREITOS DOS TITULARES

### 8.1. Canais de Atendimento

| Canal | Contato |
|-------|---------|
| Email DPO | dpo@healthcare.com.br |
| Sistema | Menu "Meus Dados" |
| Presencial | Recepção da unidade |

### 8.2. Procedimentos

| Direito | Prazo | Responsável |
|---------|-------|-------------|
| Confirmação de tratamento | 15 dias | DPO |
| Acesso aos dados | 15 dias | DPO |
| Correção | 15 dias | Operador |
| Portabilidade | 15 dias | TI + DPO |
| Eliminação* | 15 dias | DPO + TI |

*Exceto dados de prontuário (retenção legal de 20 anos)

---

## 9. COMPARTILHAMENTO DE DADOS

### 9.1. Destinatários

| Destinatário | Finalidade | Base Legal | Salvaguardas |
|--------------|------------|------------|--------------|
| Outros profissionais de saúde | Continuidade do cuidado | Tutela da saúde | RBAC, auditoria |
| Laboratórios | Realização de exames | Contrato | Acordo de proteção |
| Operadoras de saúde | Faturamento | Contrato | Criptografia |
| Secretarias de Saúde | Notificações compulsórias | Obrigação legal | Canais oficiais |
| Provedor de infraestrutura | Hospedagem | Contrato | DPA assinado |

### 9.2. Transferência Internacional

- **Situação atual:** Dados armazenados no Brasil
- **Eventualidade:** Se necessário, será garantido nível adequado de proteção

---

## 10. CONCLUSÃO

### 10.1. Parecer

Com base na análise realizada:

1. O tratamento de dados é **necessário e proporcional** às finalidades declaradas
2. As **bases legais** são adequadas para cada categoria de dado
3. As **medidas de segurança** implementadas são compatíveis com os riscos identificados
4. Existem **procedimentos** para garantir os direitos dos titulares
5. **Riscos residuais** estão em nível aceitável

### 10.2. Recomendações

| Prioridade | Recomendação | Prazo |
|------------|--------------|-------|
| Alta | Implementar 2FA para todos os usuários | 90 dias |
| Alta | Contratar seguro cyber | 60 dias |
| Média | Treinamento LGPD para equipe | 120 dias |
| Média | Teste de invasão (pentest) | 180 dias |
| Baixa | Certificação ISO 27001 | 12 meses |

---

## 11. APROVAÇÃO

| Papel | Nome | Assinatura | Data |
|-------|------|------------|------|
| DPO | ______________ | ______________ | ___/___/___ |
| Diretor Clínico | ______________ | ______________ | ___/___/___ |
| TI | ______________ | ______________ | ___/___/___ |
| Jurídico | ______________ | ______________ | ___/___/___ |

---

## 12. REVISÕES

| Versão | Data | Alteração | Responsável |
|--------|------|-----------|-------------|
| 1.0 | Nov/2025 | Versão inicial | [Nome] |

**Próxima revisão:** Novembro 2026 (ou quando houver alteração significativa)

---

*Documento elaborado em conformidade com o Art. 38 da Lei nº 13.709/2018 (LGPD)*

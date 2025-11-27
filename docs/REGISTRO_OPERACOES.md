# Registro de Operações de Tratamento de Dados Pessoais (ROT)

## HealthCare - Sistema de Prontuário Eletrônico

**Versão:** 1.0  
**Data:** Novembro 2025  
**Controlador:** [Nome da Instituição]  
**CNPJ:** [A ser preenchido]

---

## 1. OPERAÇÃO: Cadastro de Pacientes

| Campo | Descrição |
|-------|-----------|
| **ID** | OT-001 |
| **Nome** | Cadastro de Pacientes |
| **Descrição** | Registro de novos pacientes no sistema |
| **Base Legal** | Art. 7º, V (contrato) + Art. 11, II, "f" (tutela da saúde) |
| **Categoria de Titulares** | Pacientes |
| **Dados Tratados** | Nome, CPF, RG, data nascimento, gênero, endereço, telefone, email |
| **Dados Sensíveis** | Não |
| **Fonte dos Dados** | Titular (diretamente) |
| **Finalidade** | Identificação do paciente para prestação de serviços de saúde |
| **Compartilhamento** | Interno (profissionais de saúde) |
| **Transferência Internacional** | Não |
| **Prazo de Retenção** | 20 anos após último atendimento |
| **Medidas de Segurança** | Criptografia, RBAC, auditoria |

---

## 2. OPERAÇÃO: Registro de Consultas

| Campo | Descrição |
|-------|-----------|
| **ID** | OT-002 |
| **Nome** | Registro de Consultas Médicas |
| **Descrição** | Documentação de atendimentos clínicos |
| **Base Legal** | Art. 11, II, "f" (tutela da saúde) + Obrigação legal (CFM) |
| **Categoria de Titulares** | Pacientes |
| **Dados Tratados** | Anamnese, exame físico, diagnóstico, conduta |
| **Dados Sensíveis** | Sim - dados de saúde |
| **Fonte dos Dados** | Titular + Profissional de saúde |
| **Finalidade** | Documentação clínica, continuidade do cuidado |
| **Compartilhamento** | Outros profissionais de saúde (quando necessário) |
| **Transferência Internacional** | Não |
| **Prazo de Retenção** | 20 anos (Res. CFM 1.821/2007) |
| **Medidas de Segurança** | Criptografia, RBAC, assinatura digital, auditoria |

---

## 3. OPERAÇÃO: Prescrição de Medicamentos

| Campo | Descrição |
|-------|-----------|
| **ID** | OT-003 |
| **Nome** | Prescrição Médica Eletrônica |
| **Descrição** | Emissão de receitas médicas |
| **Base Legal** | Art. 11, II, "f" (tutela da saúde) + Obrigação legal |
| **Categoria de Titulares** | Pacientes |
| **Dados Tratados** | Medicamentos, dosagem, posologia, alergias |
| **Dados Sensíveis** | Sim - dados de saúde |
| **Fonte dos Dados** | Profissional de saúde |
| **Finalidade** | Tratamento farmacológico |
| **Compartilhamento** | Farmácias (mediante receita), operadoras de saúde |
| **Transferência Internacional** | Não |
| **Prazo de Retenção** | 20 anos |
| **Medidas de Segurança** | Assinatura digital, verificação de interações |

---

## 4. OPERAÇÃO: Solicitação de Exames

| Campo | Descrição |
|-------|-----------|
| **ID** | OT-004 |
| **Nome** | Solicitação e Resultados de Exames |
| **Descrição** | Pedidos de exames e registro de resultados |
| **Base Legal** | Art. 11, II, "f" (tutela da saúde) |
| **Categoria de Titulares** | Pacientes |
| **Dados Tratados** | Tipo de exame, indicação clínica, resultados |
| **Dados Sensíveis** | Sim - dados de saúde |
| **Fonte dos Dados** | Profissional + Laboratórios |
| **Finalidade** | Diagnóstico e acompanhamento |
| **Compartilhamento** | Laboratórios parceiros |
| **Transferência Internacional** | Não |
| **Prazo de Retenção** | 20 anos |
| **Medidas de Segurança** | Criptografia, controle de acesso |

---

## 5. OPERAÇÃO: Agendamento

| Campo | Descrição |
|-------|-----------|
| **ID** | OT-005 |
| **Nome** | Agendamento de Consultas |
| **Descrição** | Marcação e gestão de horários |
| **Base Legal** | Art. 7º, V (execução de contrato) |
| **Categoria de Titulares** | Pacientes |
| **Dados Tratados** | Nome, telefone, data/hora, profissional |
| **Dados Sensíveis** | Não |
| **Fonte dos Dados** | Titular / Recepção |
| **Finalidade** | Organização da agenda |
| **Compartilhamento** | Interno |
| **Transferência Internacional** | Não |
| **Prazo de Retenção** | 5 anos |
| **Medidas de Segurança** | Controle de acesso |

---

## 6. OPERAÇÃO: Notificações ao Paciente

| Campo | Descrição |
|-------|-----------|
| **ID** | OT-006 |
| **Nome** | Comunicação com Pacientes |
| **Descrição** | Envio de lembretes, resultados, orientações |
| **Base Legal** | Art. 7º, I (consentimento) |
| **Categoria de Titulares** | Pacientes |
| **Dados Tratados** | Nome, telefone, email |
| **Dados Sensíveis** | Não (conteúdo genérico) |
| **Fonte dos Dados** | Cadastro do paciente |
| **Finalidade** | Lembrete de consultas, resultados |
| **Compartilhamento** | Provedores de SMS/Email |
| **Transferência Internacional** | Possível (serviços de email) |
| **Prazo de Retenção** | 6 meses |
| **Medidas de Segurança** | Consentimento prévio |

---

## 7. OPERAÇÃO: Faturamento

| Campo | Descrição |
|-------|-----------|
| **ID** | OT-007 |
| **Nome** | Faturamento e Cobrança |
| **Descrição** | Gestão financeira de procedimentos |
| **Base Legal** | Art. 7º, V (contrato) + Art. 7º, II (obrigação legal) |
| **Categoria de Titulares** | Pacientes |
| **Dados Tratados** | Nome, CPF, procedimentos, valores |
| **Dados Sensíveis** | Indiretamente (procedimentos revelam saúde) |
| **Fonte dos Dados** | Atendimento |
| **Finalidade** | Cobrança, faturamento SUS/convênios |
| **Compartilhamento** | Operadoras de saúde, SUS |
| **Transferência Internacional** | Não |
| **Prazo de Retenção** | 5 anos (fiscal) |
| **Medidas de Segurança** | Criptografia, controle de acesso |

---

## 8. OPERAÇÃO: Auditoria e Logs

| Campo | Descrição |
|-------|-----------|
| **ID** | OT-008 |
| **Nome** | Registro de Auditoria |
| **Descrição** | Log de ações realizadas no sistema |
| **Base Legal** | Art. 7º, II (obrigação legal - CFM) |
| **Categoria de Titulares** | Usuários do sistema |
| **Dados Tratados** | Usuário, ação, IP, timestamp |
| **Dados Sensíveis** | Não |
| **Fonte dos Dados** | Sistema |
| **Finalidade** | Segurança, rastreabilidade, conformidade |
| **Compartilhamento** | Interno (TI, compliance) |
| **Transferência Internacional** | Não |
| **Prazo de Retenção** | 6 meses (Marco Civil) |
| **Medidas de Segurança** | Imutabilidade, backup |

---

## 9. OPERAÇÃO: Análise de IA

| Campo | Descrição |
|-------|-----------|
| **ID** | OT-009 |
| **Nome** | Processamento por Inteligência Artificial |
| **Descrição** | Análise de dados para apoio diagnóstico |
| **Base Legal** | Art. 11, II, "f" (tutela da saúde) + Consentimento |
| **Categoria de Titulares** | Pacientes |
| **Dados Tratados** | Sintomas, histórico, texto de anamnese |
| **Dados Sensíveis** | Sim - dados de saúde |
| **Fonte dos Dados** | Consulta médica |
| **Finalidade** | Sugestão de diagnóstico, verificação de interações |
| **Compartilhamento** | Não (processamento local) |
| **Transferência Internacional** | Não (Ollama local) |
| **Prazo de Retenção** | Processamento em memória (não persiste) |
| **Medidas de Segurança** | Processamento local, anonimização |

---

## 10. OPERAÇÃO: Backup

| Campo | Descrição |
|-------|-----------|
| **ID** | OT-010 |
| **Nome** | Backup de Dados |
| **Descrição** | Cópia de segurança do banco de dados |
| **Base Legal** | Art. 46 LGPD (segurança) + Obrigação legal |
| **Categoria de Titulares** | Todos |
| **Dados Tratados** | Todos os dados do sistema |
| **Dados Sensíveis** | Sim |
| **Fonte dos Dados** | Banco de dados |
| **Finalidade** | Recuperação de desastres |
| **Compartilhamento** | Provedor de backup (se externo) |
| **Transferência Internacional** | Depende do provedor |
| **Prazo de Retenção** | 30 dias (rotação) |
| **Medidas de Segurança** | Criptografia AES-256, acesso restrito |

---

## RESUMO POR CATEGORIA DE DADOS

| Categoria | Operações | Base Legal Principal |
|-----------|-----------|---------------------|
| Identificação | OT-001, OT-005, OT-007 | Contrato |
| Saúde | OT-002, OT-003, OT-004, OT-009 | Tutela da saúde |
| Contato | OT-006 | Consentimento |
| Logs | OT-008 | Obrigação legal |
| Todos | OT-010 | Segurança |

---

## HISTÓRICO DE REVISÕES

| Versão | Data | Alteração | Responsável |
|--------|------|-----------|-------------|
| 1.0 | Nov/2025 | Versão inicial | [Nome] |

---

*Documento elaborado em conformidade com o Art. 37 da Lei nº 13.709/2018 (LGPD)*

*Próxima revisão: Novembro 2026*

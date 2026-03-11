# Foco: Clínicas Particulares e Atendimento Médico Individual

O sistema está voltado para **clínicas particulares** e **atendimento médico individual**.

## Funcionalidades SUS — Desativadas do menu

As seguintes integrações com sistemas do Ministério da Saúde foram **removidas do menu** e substituídas por páginas placeholder:

- **e-SUS AB** — Fichas CDS, exportação para PEC e-SUS
- **RNDS** — Rede Nacional de Dados em Saúde

O código (libs, APIs, schema) permanece no projeto para **reativação futura**, caso haja demanda para:
- Unidades Básicas de Saúde (UBS)
- Atenção Primária
- Interoperabilidade com a rede pública

## O que permanece ativo

- Consultas, prescrições, exames
- Prontuário eletrônico
- Agenda e agendamento
- Portal do paciente (Minha Saúde)
- Medicamentos (RENAME/Medication)
- CID, CBO, SIGTAP (referenciais)
- Assinaturas digitais (PAdES)
- LGPD, termos, backup

## Dados de referência (SUS)

Campos como `susCode` em medicamentos e exames **permanecem** como informação de referência (não são integrações ativas). Podem ser úteis para clínicas que participam de programas públicos ou para futura reativação.

# Análise RBAC, Recepção e Vínculo Paciente–Equipe

## 1. RBAC e Dados do Paciente

### Problema Identificado
O admin tinha acesso aos dados completos (nome real, CPF, telefone, etc.) ao visualizar o detalhe de um paciente, enquanto na lista os dados já eram pseudonimizados — inconsistência de conformidade LGPD.

### Correção Aplicada
- **GET /api/patients/[id]**: Admin e Manager passam a receber dados **pseudonimizados** (nome como J***, CPF mascarado, etc.).
- **PUT /api/patients/[id]** (resposta): Mesmo critério aplicado na resposta após atualização.
- Médicos, enfermeiros e outros clínicos continuam com acesso completo quando fazem parte da equipe do paciente.

### Onde os Dados Devem Ficar Ocultos para o Admin

| Tipo de Dado | Admin (Lista) | Admin (Detalhe) | Comentário |
|--------------|---------------|-----------------|------------|
| Nome         | Pseudonimizado (J***) | Pseudonimizado | LGPD Art. 46 |
| CPF          | Mascarado     | Mascarado       | Dado sensível |
| Telefone     | Mascarado     | Mascarado       | Contato |
| Email        | Parcial       | Parcial         | Contato |
| Endereço     | Oculto        | Oculto          | Endereço sensível |
| Dados clínicos | Ocultos     | Ocultos         | Admin não precisa para gestão |

O admin mantém visibilidade de IDs, status e metadados operacionais necessários para suporte e gestão.

---

## 2. Recepcionista / Secretária

### Termo LGPD e Papel
Não há termo específico para “recepcionista” na LGPD. Eles se enquadram como:

- **Operadores** ou **pessoas autorizadas** que tratam dados em nome do controlador.
- Acesso baseado em **finalidade legítima** (Art. 7º) e ** necessidade para a prestação do serviço**.

### Dados Necessários para Recepção
- **Nome completo** – Identificação e agendamento.
- **Telefone** – Contato e confirmação.
- **CPF (parcial ou mascarado)** – Identificação em check-in, quando exigido.
- **Email (parcial)** – Comunicação e lembretes.

### Onde Definir o Acesso
O acesso da recepcionista deve constar em:

1. **Política de Privacidade** – Menção a que profissionais de recepção têm acesso a dados mínimos para agendamento e atendimento.
2. **Termo de Compromisso de Confidencialidade** – Assinado por todos com acesso a dados de saúde.
3. **Matriz de Acesso (RBAC)** – Papel `RECEPTIONIST` com permissões explícitas.

### Implementação Atual
- O papel `RECEPTIONIST` está em `HEALTHCARE_ROLES` em `lib/patient-access.ts`.
- Para ver pacientes, a recepcionista precisa estar na **equipe de atendimento** de cada paciente.
- Em cenários de clínica grande, pode ser necessário um modo “recepção global” para ver pacientes agendados mesmo fora da equipe. Isso é uma decisão de produto futura.

---

## 3. Infraestrutura de Recepção

### O que Existe
- **Rota**: `/reception` – Dashboard de recepção.
- **Conteúdo**:
  - Agenda do dia
  - Check-in de pacientes
  - Fila de espera
  - Aprovações pendentes
  - Acesso rápido a pacientes
  - Novo agendamento
- **APIs usadas**: `/api/appointments`, `/api/reception/stats`, `/api/notifications`, `/api/appointments/pending`, `/api/patients`, `/api/users`.

### Correção Aplicada
- Redirect de `/login` para `/auth/signin` na página de recepção.

### Como Acessar
- Usuário com role `RECEPTIONIST` → homePath configurado como `/reception` no role-switcher.
- Após login, pode escolher o perfil Recepcionista para ir ao dashboard.

---

## 4. Vínculo Paciente ↔ Equipe de Saúde

### Dois Fluxos Distintos

| Fluxo | Onde | Finalidade |
|-------|------|------------|
| **Vincular Usuário ao Paciente** | Admin → Usuários → [Usuário] → Vincular Paciente | Associar conta de usuário ao cadastro de paciente para acesso ao portal “Minha Saúde”. |
| **Adicionar à Equipe de Atendimento** | Pacientes → [Paciente] → Aba Equipe | Incluir profissionais (médicos, enfermeiros, etc.) na equipe que atende o paciente. |

### Melhorias de UX Aplicadas
1. **LinkPatientDialog**:
   - Título alterado para “Vincular Usuário ao Portal do Paciente”.
   - Texto explicando a diferença em relação à “Equipe de Atendimento”.
   - Opções: “Criar Novo Cadastro” vs “Vincular Existente” com descrições mais claras.

2. **PatientCareTeam**:
   - Instrução de 2 passos: buscar profissional → definir nível de acesso.
   - Dica sobre onde vincular usuário ao portal: Admin → Usuários → Vincular Paciente.

### Fluxo Resumido para Adicionar um Médico ao Paciente
1. Ir em **Pacientes**.
2. Abrir o paciente desejado.
3. Clicar na aba **Equipe**.
4. Clicar em **Adicionar**.
5. Buscar o profissional e escolher o nível de acesso (Consulta, Total, Limitado, etc.).
6. Confirmar.

### Fluxo para Vincular Usuário ao Portal do Paciente
1. Ir em **Admin** → **Usuários**.
2. Abrir o usuário (ex.: convidado como paciente).
3. Clicar em **Vincular Paciente**.
4. Escolher “Criar Novo” ou “Vincular Existente” e preencher/buscar conforme o caso.
5. Confirmar.

---

## 5. Próximos Passos Sugeridos

1. **Recepção global**: Avaliar modo em que a recepcionista vê todos os agendamentos do dia, independentemente da equipe.
2. **Termo de confidencialidade**: Implementar aceite e registro para recepcionistas e demais papéis com acesso a dados sensíveis.
3. **Auditoria**: Garantir logs de acesso da recepcionista para fins de auditoria LGPD.
4. **Documentação de papéis**: Atualizar o manual de usuários com descrições claras de cada papel e nível de acesso.

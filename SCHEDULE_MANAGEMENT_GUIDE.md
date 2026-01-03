# 📅 Sistema de Gerenciamento de Agendas - Guia Completo

## 🎯 Visão Geral

Sistema de 3 camadas com **workflow de aprovação** para gerenciamento completo de agendas da clínica e profissionais.

### Arquitetura em Camadas

```
┌─────────────────────────────────────────────┐
│  CAMADA 1: Horários da Clínica              │
│  └─ Admin/Secretária define quando          │
│     a clínica está aberta                   │
│  └─ Flexível para diferentes culturas       │
│     (Israel: Dom-Qui, Brasil: Seg-Sex)      │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  CAMADA 2: Horários do Profissional         │
│  └─ Profissional SOLICITA mudanças          │
│  └─ Admin/Secretária APROVA                 │
│  └─ Presencial, Remoto ou Ambos             │
└─────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────┐
│  CAMADA 3: Bloqueios (Plantões/Exceções)    │
│  └─ Profissional SOLICITA bloqueios         │
│  └─ Admin/Secretária APROVA                 │
│  └─ Bloqueia horários específicos           │
└─────────────────────────────────────────────┘
```

---

## 👥 Fluxos por Perfil

### 🔧 **ADMIN / SECRETÁRIA**

#### 1️⃣ Configurar Horários da Clínica

**Onde:** Configurações → Agendamento → "Horários de Funcionamento da Clínica"

**O que faz:**
- Define quando a clínica está aberta (por dia da semana)
- Configura horário de abertura e fechamento
- Marca dias fechados (ex: domingo em países ocidentais)

**Exemplo (Brasil):**
```
Segunda-Sexta: 08:00 - 18:00 ✓ Aberto
Sábado:        08:00 - 12:00 ✓ Aberto
Domingo:       -------------- ✗ Fechado
```

**Exemplo (Israel):**
```
Domingo-Quinta: 08:00 - 20:00 ✓ Aberto
Sexta:          08:00 - 15:00 ✓ Aberto
Sábado:         -------------- ✗ Fechado
```

**Atalho:** Clique "Aplicar Seg-Sex" para copiar horários da segunda para todos os dias úteis.

---

#### 2️⃣ Aprovar/Rejeitar Solicitações

**Onde:** Configurações → Agendamento → "Gerenciar Solicitações de Agenda"

**Tipos de Solicitações:**
- ➕ **Adicionar Horários** - Profissional quer atender em novo dia/horário
- 🚫 **Bloquear Datas** - Profissional tem plantão em outro lugar
- ✏️ **Modificar Horários** - Mudança de horário existente
- 🗑️ **Remover Horários** - Não quer mais atender em certo dia

**Fluxo de Aprovação:**

```
1. Ver solicitação pendente
   ├─ Nome do profissional
   ├─ Tipo de solicitação
   ├─ Detalhes (dias, horários, datas)
   └─ Motivo fornecido

2. Revisar detalhes
   └─ Clique "Ver Detalhes"

3. Decidir
   ├─ ✅ APROVAR → Mudança aplicada automaticamente
   │  └─ Opcional: adicionar observação
   └─ ❌ REJEITAR → Profissional é notificado
      └─ Opcional: explicar motivo

4. Profissional é notificado da decisão
```

**Exemplo de Solicitação:**
```
Dr. João Silva
Tipo: Bloquear Datas (Plantão/Férias)
Datas: 25 datas selecionadas
Horário: 07:00 - 19:00
Motivo: "Plantão no Hospital X"

[Ver Detalhes] [✅ Aprovar] [❌ Rejeitar]
```

---

### 👨‍⚕️ **PROFISSIONAIS (Médicos, Enfermeiros, etc.)**

#### 1️⃣ Solicitar Adição de Horários

**Onde:** Configurações → Agendamento → "Solicitar Mudança de Agenda"

**Passo a Passo:**

```
1. Clique "Solicitar Mudança de Agenda"

2. Escolha: "Adicionar Horários de Atendimento"

3. Preencha:
   ├─ Dia da Semana: Segunda-feira
   ├─ Tipo: Presencial / Remoto / Ambos
   └─ Turno: Clique no template (ex: "9-17")

4. Motivo (opcional):
   "Gostaria de atender remotamente às segundas à noite"

5. Clique "Enviar Solicitação"

6. Aguarde aprovação do admin
```

**Exemplo Visual:**
```
┌─────────────────────────────────────────┐
│ Solicitar Mudança de Agenda             │
├─────────────────────────────────────────┤
│ Tipo: [Adicionar Horários ▼]            │
│                                         │
│ Dia: [Segunda-feira ▼]                  │
│ Tipo: [Ambos (Presencial/Remoto) ▼]    │
│                                         │
│ Turno:                                  │
│ [7-19] [19-7] [8-16] [13-19] ...       │
│   ✓                                     │
│                                         │
│ Motivo: Gostaria de atender...         │
│                                         │
│ [Cancelar] [Enviar Solicitação]        │
└─────────────────────────────────────────┘
```

---

#### 2️⃣ Solicitar Bloqueio de Datas (Plantões)

**Cenário:** Você trabalha plantão em outro hospital e não pode atender na clínica nesses dias.

**Passo a Passo:**

```
1. Clique "Solicitar Mudança de Agenda"

2. Escolha: "Bloquear Datas (Plantão/Férias)"

3. Selecione Datas:
   ├─ Opção A: Calendário Visual
   │  └─ Clique nos dias ou use atalhos
   │     (Dias Úteis, Fins de Semana, Mês Inteiro)
   │
   └─ Opção B: Importar de Excel
      └─ Cole lista de datas copiadas

4. Escolha Turno:
   └─ Ex: "7-19 (Manhã/Tarde)"
   └─ Sistema bloqueará 7h-19h nesses dias

5. Motivo (opcional):
   "Plantão no Hospital Municipal"

6. Enviar Solicitação
```

**Exemplo Prático:**
```
Você trabalha plantão 7-19 nos dias:
- 05/01/2026, 12/01/2026, 19/01/2026, 26/01/2026

Sistema bloqueia:
└─ 05/01 das 07:00 às 19:00 ✗ Não disponível
└─ 05/01 das 19:00 às 24:00 ✓ Pode atender remoto
└─ 12/01 das 07:00 às 19:00 ✗ Não disponível
... etc
```

---

## 🔄 Fluxo Completo: Caso de Uso Real

### Cenário: Dr. João quer adicionar atendimento remoto às noites

```
┌─────────────────────────────────────────┐
│ 1. Dr. João (Profissional)              │
├─────────────────────────────────────────┤
│ Solicita:                               │
│ ├─ Tipo: Adicionar Horários             │
│ ├─ Dia: Segunda-feira                   │
│ ├─ Turno: 19:00 - 22:00                 │
│ ├─ Tipo: Remoto (Teleconsulta)          │
│ └─ Motivo: "Atender de casa à noite"    │
│                                         │
│ [Enviar Solicitação] ✓                  │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 2. Sistema                              │
├─────────────────────────────────────────┤
│ ✓ Solicitação criada                    │
│ ✓ Status: PENDENTE                      │
│ ✓ Notificação enviada ao admin          │
│ ✓ Dr. João vê: "Aguardando aprovação"   │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 3. Maria (Secretária/Admin)             │
├─────────────────────────────────────────┤
│ Vê em "Solicitações Pendentes":        │
│                                         │
│ ┌─────────────────────────────────┐    │
│ │ Dr. João Silva                  │    │
│ │ Adicionar Horários              │    │
│ │ Segunda: 19:00-22:00 (Remoto)   │    │
│ │ Motivo: "Atender de casa..."    │    │
│ │                                 │    │
│ │ [Aprovar] [Rejeitar]            │    │
│ └─────────────────────────────────┘    │
│                                         │
│ Clica [Aprovar] ✓                       │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ 4. Sistema                              │
├─────────────────────────────────────────┤
│ ✓ Horário adicionado automaticamente    │
│ ✓ Status: APROVADO                      │
│ ✓ Dr. João notificado                   │
│ ✓ Pacientes já podem agendar            │
│   segunda 19-22h (remoto)               │
└─────────────────────────────────────────┘
```

---

## 🌍 Suporte Multi-Cultural

### Configuração para Israel

```
Domingo a Quinta: Dias úteis
Sexta: Meio expediente
Sábado (Shabat): Fechado

Exemplo:
Dom: 08:00 - 20:00 ✓
Seg: 08:00 - 20:00 ✓
Ter: 08:00 - 20:00 ✓
Qua: 08:00 - 20:00 ✓
Qui: 08:00 - 20:00 ✓
Sex: 08:00 - 14:00 ✓
Sáb: ------------- ✗
```

### Configuração para Brasil

```
Segunda a Sexta: Dias úteis
Sábado: Meio período
Domingo: Fechado

Exemplo:
Dom: ------------- ✗
Seg: 08:00 - 18:00 ✓
Ter: 08:00 - 18:00 ✓
Qua: 08:00 - 18:00 ✓
Qui: 08:00 - 18:00 ✓
Sex: 08:00 - 18:00 ✓
Sáb: 08:00 - 12:00 ✓
```

---

## 💡 Casos de Uso Avançados

### 1. Profissional com Horários Variados

**Cenário:** Dra. Ana atende:
- Segunda/Quarta: Presencial 9-17h
- Terça/Quinta: Remoto 14-22h
- Sexta: Presencial 9-13h

**Solução:**
```
Cria 5 solicitações separadas:
1. Segunda: 9-17h Presencial
2. Terça: 14-22h Remoto
3. Quarta: 9-17h Presencial
4. Quinta: 14-22h Remoto
5. Sexta: 9-13h Presencial

Todas aprovadas → agenda configurada!
```

---

### 2. Plantões Rotativos

**Cenário:** Dr. Carlos tem plantões rotativos todo mês.

**Solução:**
```
Mês de Janeiro:
1. Exporta escala do hospital para Excel
2. Copia coluna de datas
3. Importa no sistema (aba "Importar")
4. Seleciona turno "7-19"
5. Envia solicitação única com 12 datas
6. Admin aprova tudo de uma vez
```

---

### 3. Férias

**Cenário:** Dra. Maria vai tirar 15 dias de férias.

**Solução:**
```
1. Solicita "Bloquear Datas"
2. Calendário → Seleciona período (1-15/Fev)
3. Não precisa escolher turno (bloqueia dia inteiro)
4. Motivo: "Férias"
5. Admin aprova
6. Sistema bloqueia TODAS as 15 datas
```

---

## 🔐 Permissões e Segurança

### Matriz de Permissões

| Ação | Admin | Secretária | Profissional | Paciente |
|------|-------|------------|--------------|----------|
| Ver horários da clínica | ✅ | ✅ | ✅ | ❌ |
| Configurar horários da clínica | ✅ | ✅ | ❌ | ❌ |
| Solicitar mudança de agenda | ✅ | ✅ | ✅ | ❌ |
| Aprovar solicitações | ✅ | ✅ | ❌ | ❌ |
| Ver próprias solicitações | ✅ | ✅ | ✅ | ❌ |
| Ver solicitações de outros | ✅ | ✅ | ❌ | ❌ |

### Regras de Negócio

1. **Horários do profissional** devem estar **dentro** dos horários da clínica
2. **Bloqueios** têm prioridade sobre horários normais
3. **Aprovação obrigatória** para qualquer mudança de profissional
4. **Admin pode criar/aprovar** suas próprias mudanças imediatamente
5. **Secretária tem mesmos poderes** que admin para agendas

---

## 🚀 Próximos Passos

### Após Implementação

```bash
# 1. Rodar migração do banco
npx prisma migrate dev --name schedule_management_system

# 2. Gerar cliente Prisma
npx prisma generate

# 3. Reiniciar aplicação
npm run dev

# 4. Testar na interface
# → Configurações → Agendamento
```

### Checklist de Configuração Inicial

- [ ] **Admin:** Configurar horários da clínica
- [ ] **Admin:** Criar templates de turnos globais
- [ ] **Profissionais:** Solicitar horários de atendimento
- [ ] **Admin:** Aprovar solicitações iniciais
- [ ] **Teste:** Verificar se pacientes conseguem agendar

---

## 📊 Estatísticas e Monitoramento

### Métricas Disponíveis

- Total de solicitações por profissional
- Taxa de aprovação/rejeição
- Tempo médio de aprovação
- Horários mais solicitados
- Dias com mais bloqueios

### Relatórios (Futuro)

- Dashboard de utilização da agenda
- Comparativo presencial vs remoto
- Horas disponíveis por profissional
- Gaps na cobertura

---

## ❓ FAQ

**P: Profissional pode alterar diretamente sua agenda?**
R: Não. Toda mudança precisa aprovação do admin/secretária para garantir coordenação.

**P: Admin pode alterar agenda de qualquer profissional?**
R: Sim. Admin tem controle total e pode criar/aprovar mudanças imediatamente.

**P: O que acontece se a clínica mudar horários?**
R: Horários dos profissionais que ficarem fora do novo range precisam ser ajustados.

**P: Posso bloquear só parte de um dia?**
R: Sim! Ao bloquear datas, escolha um turno (ex: 7-13) e só esse período fica bloqueado.

**P: Como funciona atendimento remoto?**
R: Marca-se "Remoto" ou "Ambos" ao configurar horários. Sistema permite agendar teleconsulta.

**P: Posso ter horários presenciais E remotos no mesmo dia?**
R: Sim! Crie dois horários: um presencial (9-13h) e outro remoto (19-22h).

---

**Última atualização:** Janeiro 2026
**Status:** ✅ Pronto para produção
**Suporte:** Documentação completa em `/docs/SCHEDULING_GUIDE.md`

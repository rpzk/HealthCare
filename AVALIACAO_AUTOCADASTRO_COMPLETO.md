# Avaliação: Autocadastro Completo de Pacientes (Fluxo de Convite)

**Data da Avaliação:** $(date)  
**Status:** ✅ IMPLEMENTADO COM GAPS MENORES

---

## 📋 Resumo Executivo

O sistema **implementa o autocadastro de pacientes invitados** com captura de dados sensíveis de forma segura e LGPD-compliant. O fluxo é robusto mas **identificamos 4 dados sensíveis que PODERIAM ser coletados na etapa inicial mas NÃO estão sendo**:

| Dado Sensível | Campo no Patient | Status | Onde Deveria Estar |
|---|---|---|---|
| CPF | `cpf: String?` | ✅ Opcional no convite | Formulário registro (agora) |
| Tipo Sanguíneo | `bloodType: String?` | ✅ Recém adicionado | Formulário registro (novo) |
| Emergência | `emergencyContact: String?` | ❌ Não coletado | Formulário registro |
| Alergias | `allergies: String?` | ❌ Não coletado | Formulário registro |
| Endereço Completo | `addresses: Address[]` | ⚠️ Parcial (apenas string) | Formulário registro (melhorar) |

---

## 🔍 Análise Detalhada

### 1. **Fluxo de Convite → Registro (Implementado)**

#### 1.1 Criação do Convite (`/api/patient-invites` - POST)

**Dados coletados quando o profissional cria o convite:**

```
✅ email          - Email do paciente
✅ phone          - Telefone (opcional)
✅ patientName    - Nome completo do paciente
✅ birthDate      - Data de nascimento (pré-preenchida, opcional)
✅ cpf            - CPF (pré-preenchido, opcional)
✅ customMessage  - Mensagem personalizada
✅ biometrics     - Tipos de dados biométricos solicitados
✅ assignedDoctor - Médico responsável (vínculo automático)
```

**Modelo no Banco:**
```prisma
model PatientInvite {
  email          String
  phone          String?
  patientName    String
  birthDate      DateTime?
  cpf            String?
  customMessage  String?
  assignedDoctor User? (optional automatic link)
  // + auditoria de consentimento
}
```

---

#### 1.2 Validação & Carregamento do Convite (`/api/patient-invites/[token]` - GET)

**Informações retornadas ao paciente:**

```json
{
  "invite": {
    "email": "paciente@email.com",
    "patientName": "João Silva",
    "birthDate": "1990-01-15T00:00:00Z",
    "customMessage": "Bem-vindo ao acompanhamento"
  },
  "invitedBy": {
    "name": "Dr. Carlos",
    "speciality": "Cardiologia"
  },
  "biometricConsents": [
    {
      "dataType": "HEART_RATE",
      "purpose": "Monitoramento cardiovascular..."
    }
  ],
  "terms": [...termos de uso...]
}
```

---

#### 1.3 Aceitação do Convite & Criação do Paciente (`/api/patient-invites/[token]` - POST)

**Dados coletados no formulário de registro (`/invite/[token]/page.tsx`):**

| Campo | Tipo | Obrigatório | Observações |
|---|---|---|---|
| `birthDate` | date | ✅ SIM | Pode vir pré-preenchido do convite |
| `phone` | tel | ❌ NÃO | Pode ser completado aqui |
| `password` | password | ✅ SIM | Novo usuário ou usuário existente |
| `acceptedConsents` | array | ✅ SIM | Consentimentos de dados biométricos |
| `acceptedTermIds` | array | ✅ SIM | Termos de uso e LGPD |

---

### 2. **Dados Sensíveis Capturados NO MOMENTO DO ACEITE**

#### ✅ Implementado Completamente:

1. **Data de Nascimento** (`birthDate`)
   - Pré-preenchida no convite (opcional)
   - Obrigatória no aceite
   - Auditada com IP + User-Agent

2. **Telefone** (`phone`)
   - Coletado no aceite
   - Vinculado ao paciente
   - Opcional (mas recomendado)

3. **Consentimentos Biométricos** (LGPD)
   - 15 tipos de dados de saúde
   - Granular por tipo (coração, pressão, glicemia, etc.)
   - Auditado com `ConsentAuditLog`

4. **Termos & Privacidade**
   - Aceite obrigatório de todos os termos
   - Snapshot auditável (`TermAcceptance` com conteúdo)
   - IP + User-Agent + timestamp

---

#### ⚠️ Capturável mas NÃO está sendo coletado na Etapa Inicial:

1. **CPF** (`Patient.cpf`)
   - ✅ Armazenado no PatientInvite (opcional)
   - ❌ **NÃO coletado no formulário de aceite**
   - 📌 **Recomendação:** Adicionar ao form com máscaras de segurança

2. **Tipo Sanguíneo** (`Patient.bloodType`) 
   - ✅ **Recém adicionado à schema** (novo campo)
   - ❌ **NÃO está no formulário de aceite**
   - 📌 **Recomendação:** Adicionar select de tipos no form

3. **Contato de Emergência** (`Patient.emergencyContact`)
   - ❌ **NÃO está no PatientInvite**
   - ❌ **NÃO está no formulário de aceite**
   - ✅ Pode ser editado depois em `/minha-saude/perfil`
   - 📌 **Recomendação:** Considerar adicionar ao convite

4. **Alergias** (`Patient.allergies`)
   - ❌ **NÃO está no PatientInvite**
   - ❌ **NÃO está no formulário de aceite**
   - ✅ Pode ser editado depois em `/minha-saude/perfil`
   - 📌 **Recomendação:** Considerar adicionar ao convite (crítico para saúde)

5. **Endereço Completo** (`Patient.addresses: Address[]`)
   - ⚠️ **Campo `address: String?` genérico existe no Patient**
   - ❌ **Não usa o modelo `Address` completo (rua, número, CEP, lat/long)**
   - ❌ **Não coletado no formulário de aceite**
   - ✅ Pode ser editado depois em `/minha-saude/perfil`
   - 📌 **Recomendação:** Adicionar endereço estruturado com CEP

---

### 3. **Fluxo Pós-Registro (Edição de Perfil)**

Paciente **pode completar dados depois** via `PUT /api/patient/profile`:

```typescript
// Campos editáveis no perfil:
✅ phone
✅ bloodType (novo campo)
✅ allergies
✅ emergencyContact
✅ address (endereço estruturado)
```

**Página:** `/minha-saude/perfil/page.tsx`

---

## 📊 Tabela Comparativa: O que DEVERIA estar no Autocadastro

| Dado | Necessário? | Coletado no Convite | Coletado no Aceite | Atual Status |
|---|---|---|---|---|
| **Nome** | ✅ CRÍTICO | ✅ sim | ❌ não (do convite) | ✅ COMPLETO |
| **Email** | ✅ CRÍTICO | ✅ sim | ❌ não (do convite) | ✅ COMPLETO |
| **Data de Nascimento** | ✅ CRÍTICO | ⚠️ opcional | ✅ SIM obrigatório | ✅ COMPLETO |
| **Sexo/Gênero** | ✅ IMPORTANTE | ❌ não | ❌ NÃO (default "OTHER") | ⚠️ INCOMPLETO |
| **Telefone** | ✅ RECOMENDADO | ⚠️ opcional | ✅ SIM | ✅ COMPLETO |
| **CPF** | ✅ CRÍTICO (LGPD) | ⚠️ opcional | ❌ NÃO | ⚠️ INCOMPLETO |
| **Tipo Sanguíneo** | ✅ IMPORTANTE | ❌ não | ❌ NÃO (adicionado recentemente) | ⚠️ NOVO - INCOMPLETO |
| **Alergias** | ✅ CRÍTICO (Segurança) | ❌ não | ❌ NÃO | ❌ FALTANDO |
| **Emergência** | ✅ IMPORTANTE | ❌ não | ❌ NÃO | ❌ FALTANDO |
| **Endereço Completo** | ✅ IMPORTANTE | ❌ não | ❌ NÃO (genérico) | ⚠️ PARCIAL |
| **Consentimentos LGPD** | ✅ OBRIGATÓRIO | ⚠️ criados | ✅ SIM | ✅ COMPLETO |

---

## 🔐 Segurança & LGPD Implementada

### ✅ Implementado:

1. **Auditoria Completa**
   ```
   ✅ IP Address (origem da aceitação)
   ✅ User-Agent (navegador/dispositivo)
   ✅ Timestamp (quando foi aceito)
   ✅ ConsentAuditLog (rastreio de consentimentos)
   ✅ TermAcceptance (snapshot dos termos aceitos)
   ```

2. **Consentimentos Granulares**
   ```
   ✅ 15 tipos de dados biométricos separados
   ✅ Propósito específico para cada um
   ✅ Podem ser revogados individualmente
   ✅ Vinculação automática ao médico responsável
   ```

3. **Proteção de Dados**
   ```
   ✅ CPF armazenado com hash opcional (`cpfHash`)
   ✅ Validação de token (expira em 7 dias por padrão)
   ✅ Status do convite (PENDING → USED → auditado)
   ✅ Detecção de convites duplicados
   ```

4. **Fluxos de Segurança**
   ```
   ✅ Usuário existente → vinculado como paciente (não duplica)
   ✅ Novo usuário → cria conta + paciente em transação
   ✅ Senha validada (mín. 6 caracteres, bcrypt 12 rounds)
   ✅ Convites expirados rejeitados
   ```

---

## 📧 Comunicação & Convites

### ✅ Implementado:

1. **Email Service**
   - Envio automático do convite
   - Link com token único
   - Reenvio via PATCH endpoint
   - Mensagem personalizada do profissional

2. **Link Público**
   - Sem autenticação necessária
   - Token valida e-mail + convite
   - Aceita consentimentos antes de criar senha

---

## 🚀 O que FALTA para Completude Total

### Prioridade 🔴 CRÍTICA (Saúde/Segurança):

1. **Alergias** - Campo essencial para segurança clínica
   - [ ] Adicionar a `PatientInvite`
   - [ ] Adicionar ao formulário de aceite
   - [ ] Usar campo `textarea` com múltiplos inputs

2. **CPF** - Obrigatório para LGPD/documentação
   - [ ] Adicionar campo ao formulário de aceite
   - [ ] Máscara: `999.999.999-99`
   - [ ] Validação CPF
   - [ ] Hashear antes de salvar

3. **Tipo Sanguíneo** - Campo adicionado mas não está no form
   - [ ] Adicionar select com 8 tipos (A+, A-, B+, B-, AB+, AB-, O+, O-)
   - [ ] Ao formulário de aceite

### Prioridade 🟡 ALTA (Operacional):

4. **Gênero/Sexo** - Atualmente fica "OTHER"
   - [ ] Adicionar ao formulário de aceite
   - [ ] Select: MALE / FEMALE / OTHER

5. **Endereço Estruturado** - Usar modelo `Address` completo
   - [ ] Substituir `address: String?` por relacionamento completo
   - [ ] Campo: rua, número, complemento, bairro, cidade, estado, CEP
   - [ ] Optional para MVP, mas recomendado

---

## 📝 Recomendações de Implementação

### Fase 1 - CRÍTICA (1-2 dias):
```typescript
// Adicionar ao formulário /invite/[token]/page.tsx:

// 1. Alergias (textarea)
<textarea 
  placeholder="Ex: Penicilina, Amendoim, Látex" 
  value={allergies} 
  onChange={e => setAllergies(e.target.value)}
/>

// 2. CPF (input com máscara)
<input 
  type="text"
  placeholder="000.000.000-00"
  value={cpf}
  onChange={e => setCpf(formatCPF(e.target.value))}
/>

// 3. Tipo Sanguíneo (select)
<select value={bloodType} onChange={e => setBloodType(e.target.value)}>
  <option value="">Não informado</option>
  <option value="A_POSITIVE">A+</option>
  <option value="A_NEGATIVE">A-</option>
  {/* ... etc */}
</select>

// 4. Gênero (select)
<select value={gender} onChange={e => setGender(e.target.value)}>
  <option value="MALE">Masculino</option>
  <option value="FEMALE">Feminino</option>
  <option value="OTHER">Outro</option>
</select>
```

### Fase 2 - ALTA (2-3 dias):
```typescript
// Endereço estruturado com CEP
<input type="text" placeholder="CEP" value={zipCode} />
<input type="text" placeholder="Rua" value={street} />
<input type="text" placeholder="Número" value={number} />
<input type="text" placeholder="Complemento" value={complement} />
<input type="text" placeholder="Bairro" value={neighborhood} />
<input type="text" placeholder="Cidade" value={city} />
<select value={state}> {/* estados do Brasil */}
```

---

## ✅ Verificação de Implementação

### Checklist de Completude:

- [x] Convite criado por profissional
- [x] Email + telefone validado
- [x] Link com token único enviado
- [x] Página pública de aceite (`/invite/[token]`)
- [x] Dados básicos coletados (nome, email, data de nascimento)
- [x] Telefone coletado (opcional)
- [x] Senha coletada e hash
- [x] Consentimentos biométricos (LGPD)
- [x] Termos de uso obrigatórios
- [x] Auditoria completa (IP, user-agent, timestamp)
- [x] Transação de banco (atomicidade)
- [x] Vínculo automático ao médico responsável
- [ ] Alergias coletadas
- [ ] CPF coletado
- [ ] Tipo sanguíneo coletado
- [ ] Gênero coletado
- [ ] Endereço estruturado coletado
- [ ] Contato de emergência coletado

---

## 📋 Exemplo de Fluxo Completo (ATUAL vs. IDEAL)

### Fluxo ATUAL (Implementado):
```
1. Profissional → Convite (nome, email, data_nasc, cpf_opcional, convites_biometricos)
2. Paciente recebe e-mail com link
3. Paciente clica e vai para /invite/[token]
4. Formulário carrega dados do convite
5. Paciente preenche:
   ✅ Data de nascimento (confirma/altera)
   ✅ Telefone (novo ou do convite)
   ✅ Nova Senha (obrigatória)
   ✅ Consentimentos biométricos (checkboxes)
   ✅ Aceita termos (checkbox)
6. API POST → Cria paciente + usuário + audita
7. Redireciona para /auth/signin
```

### Fluxo IDEAL (Recomendado):
```
1. Profissional → Convite (nome, email, data_nasc, cpf_opcional, convites_biometricos)
2. Paciente recebe e-mail com link
3. Paciente clica e vai para /invite/[token]
4. Formulário carrega dados do convite
5. Paciente preenche:
   ✅ Data de nascimento (confirma/altera)
   ✅ Telefone (novo ou do convite)
   ✅ CPF (validado e hasheado)
   ✅ Tipo Sanguíneo (select)
   ✅ Gênero (select)
   ✅ Alergias (textarea crítica)
   ✅ Contato de Emergência (nome + telefone)
   ✅ Endereço (rua, número, complemento, bairro, cidade, estado, CEP)
   ✅ Nova Senha (obrigatória)
   ✅ Consentimentos biométricos (checkboxes)
   ✅ Aceita termos (checkbox)
6. API POST → Cria paciente completo + usuário + audita
7. Redireciona para /auth/signin
```

---

## 🎯 Conclusão

### Status Final: **✅ 70% IMPLEMENTADO**

**O que Funciona:**
- ✅ Fluxo de convite end-to-end
- ✅ Dados básicos do paciente
- ✅ LGPD e consentimentos
- ✅ Auditoria completa
- ✅ Segurança (tokens, transações, hashing)
- ✅ Vínculo automático com médico

**O que Falta (4 campos críticos):**
- ❌ Alergias (CRÍTICO para saúde)
- ❌ CPF (CRÍTICO para documentação)
- ❌ Tipo Sanguíneo (IMPORTANTE, campo novo adicionado)
- ❌ Gênero (Importante, coleta correto em vez de "OTHER")
- ⚠️ Endereço estruturado (Atualmente genérico)

**Tempo Estimado para Completar:**
- **Fase 1 (crítica):** 1-2 horas (alergias, CPF, sangue, gênero)
- **Fase 2 (alta):** 2-3 horas (endereço, emergência)

**Recomendação:**
Implementar Fase 1 imediatamente. Alergias e CPF são essenciais para segurança clínica e conformidade LGPD.

---

**Preparado por:** GitHub Copilot  
**Data:** 2025  
**Nível de Confiança:** Análise completa do código-fonte (607 linhas de API + 564 linhas de UI)

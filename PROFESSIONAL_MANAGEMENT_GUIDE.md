# 📋 Guia de Gerenciamento de Profissionais

## 🎯 Visão Geral

O sistema de gerenciamento de profissionais foi criado para garantir que **novos profissionais sejam criados com as roles corretas** e sem risco de erros que corrompam a estrutura de acesso.

## 🔧 Como Funciona o Sistema de Roles

O Healthcare tem um **sistema dual de roles**:

### 1. **Primary Role** (`users.role`)
- Definido ao criar o usuário
- Determina qual é a profissão principal
- Exemplos: DOCTOR, NURSE, ADMIN
- Usada pelo NextAuth para autenticação

### 2. **Assigned Roles** (`user_assigned_roles`)
- Permite que profissionais tenham múltiplos roles
- Um deles é marcado como `isPrimary = true`
- Permite role-switching seguro via cookie
- Não persiste dados, apenas na sessão

## 📖 Usando a Interface Web

### Acessar o Painel
1. Faça login como **ADMIN**
2. Navegue para `/admin/professionals`
3. Clique em **"Novo Profissional"**

### Criar Novo Profissional

```
Nome Completo: Dr. João Silva Santos
Email: joao.silva@hospital.com
Profissão: DOCTOR
Número de Registro: CRM/SP 123456
```

**O que acontece automaticamente:**

✅ Cria usuário no banco de dados
✅ Define PRIMARY ROLE = DOCTOR
✅ Adiciona PATIENT role (pode ver seu próprio prontuário)
✅ Email é verificado automaticamente
✅ Conta ativada e pronta para uso
✅ Profissional pode fazer login com email/senha

## 🖥️ Usando o Script CLI

### Instalação

O script já está disponível em:
```bash
./scripts/create-professional.sh
```

### Uso Interativo

```bash
cd /home/umbrel/HealthCare
./scripts/create-professional.sh
```

### Exemplo de Execução

```
╔════════════════════════════════════════════════════════╗
║     Criador de Profissionais - Healthcare System       ║
╚════════════════════════════════════════════════════════╝

Informações do Profissional:

Nome completo: Dra. Maria de Oliveira
Email: maria.oliveira@hospital.com

Profissões disponíveis:
  1. DOCTOR (Médico)
  2. NURSE (Enfermeiro)
  ...
Escolha (1-10): 1

Número de Registro (ex: CRM/PR 12345) [opcional]: CRM/SP 789456

Resumo:
  Nome: Dra. Maria de Oliveira
  Email: maria.oliveira@hospital.com
  Profissão: DOCTOR
  Registro: CRM/SP 789456

Confirmar? (s/n): s

Criando profissional...
✅ Profissional criado com sucesso!
   ID: user_a1b2c3d4e5f6g7h8
   Nome: Dra. Maria de Oliveira
   Email: maria.oliveira@hospital.com
   Profissão: DOCTOR
   Roles: DOCTOR (primária), PATIENT
```

## 🔐 Segurança e Boas Práticas

### ✅ O que o Sistema Faz

- **Validação de Email:** Impede duplicatas
- **ID Único:** Cada profissional tem ID aleatório
- **Roles Corretas:** PRIMARY + PATIENT atribuídas automaticamente
- **Auditoria:** Mudanças futuras podem ser logadas
- **Ativação:** Conta ativada imediatamente

### ⚠️ O que Não Fazer

```javascript
// ❌ NÃO FAZER: Modificação direta no banco
UPDATE users SET role = 'DOCTOR' WHERE id = '...';

// ❌ RAZÃO: Desacopla users.role de user_assigned_roles
// Causa inconsistências e confusão de acesso
```

### ✅ Sempre Fazer

```javascript
// ✅ FAZER: Use o script ou a interface
// Garantido que ambas as tabelas estejam sincronizadas
```

## 🔄 Alterando Roles de Profissional Existente

Se você precisa mudar a profissão primária de um profissional:

```sql
-- 1. Atualizar primary role
UPDATE users 
SET role = 'NURSE' 
WHERE id = 'user_xyz123';

-- 2. Atualizar assigned roles (remover old, adicionar new)
UPDATE user_assigned_roles 
SET isPrimary = false 
WHERE "userId" = 'user_xyz123' AND role = 'DOCTOR';

INSERT INTO user_assigned_roles (id, "userId", role, "isPrimary", "assignedAt")
VALUES (gen_random_uuid(), 'user_xyz123', 'NURSE', true, now());
```

**Melhor ainda:** Use a API para garantir atomicidade.

## 📱 Alternando Entre Roles

Profissionais podem alternar entre seus roles **durante uma sessão**:

1. Clique no **Avatar/Nome** (canto superior direito)
2. Selecione "Mudar Role"
3. Escolha uma de suas roles
4. Sistema redirecionará para dashboard apropriado

**Importante:** 
- Isso **NÃO muda** o banco de dados
- É apenas para a sessão atual (cookie)
- Ao fazer logout/login, volta ao role primário

## 🛠️ API Endpoints

### GET /api/admin/professionals
Lista todos os profissionais cadastrados

```bash
curl -H "Authorization: Bearer TOKEN" \
  https://healthcare.rafaelpiazenski.com:3000/api/admin/professionals
```

### POST /api/admin/professionals
Cria novo profissional

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Dr. João Silva",
    "email": "joao@hospital.com",
    "role": "DOCTOR",
    "crmNumber": "CRM/SP 123456"
  }' \
  https://healthcare.rafaelpiazenski.com:3000/api/admin/professionals
```

### PUT /api/admin/professionals
Atualiza dados do profissional

```bash
curl -X PUT \
  -H "Content-Type: application/json" \
  -d '{
    "id": "user_xyz123",
    "name": "Dr. João Silva Santos",
    "crmNumber": "CRM/SP 654321",
    "isActive": true
  }' \
  https://healthcare.rafaelpiazenski.com:3000/api/admin/professionals
```

## 📊 Verificar Roles de um Profissional

```sql
-- Ver roles atribuídos
SELECT * FROM user_assigned_roles 
WHERE "userId" = 'user_xyz123';

-- Ver role primário
SELECT id, name, role, email 
FROM users 
WHERE id = 'user_xyz123';
```

## ✅ Checklist para Onboarding de Novo Profissional

- [ ] Criar profissional via interface ou script
- [ ] Confirmar que ambos users.role e user_assigned_roles foram preenchidos
- [ ] Profissional recebe credenciais por email
- [ ] Profissional faz primeiro login
- [ ] Profissional configura sua senha
- [ ] Profissional completa seu perfil (CRM, especialidade, etc)
- [ ] Profissional configura sua agenda de atendimento
- [ ] Profissional faz teste de consulta (com paciente)
- [ ] Documentar no registro administrativo

## 🔗 Estrutura das Tabelas

### users
```sql
id (PK)
name VARCHAR
email VARCHAR UNIQUE
role VARCHAR (DOCTOR, NURSE, ADMIN, etc)
crmNumber VARCHAR (opcional)
isActive BOOLEAN
emailVerified TIMESTAMP
createdAt TIMESTAMP
```

### user_assigned_roles
```sql
id (PK)
userId (FK) → users.id
role VARCHAR
isPrimary BOOLEAN
assignedBy (FK) → users.id
assignedAt TIMESTAMP
```

## 🚀 Próximas Melhorias

- [ ] Enviar email automático com credenciais temporárias
- [ ] Validar CRM/COREN com base de registros externos
- [ ] Permitir importação em lote (CSV)
- [ ] Histórico completo de mudanças de role
- [ ] Confirmação de 2FA para criação de admin
- [ ] Template de email customizável

## ❓ FAQ

**P: O que é o role PATIENT?**
R: Permite que profissionais vejam seu próprio prontuário quando acessam como PATIENT.

**P: Posso ter múltiplos roles primários?**
R: Não. Apenas um pode ter `isPrimary = true`. Os outros são secundários.

**P: O role-switcher salva no banco de dados?**
R: Não. Usa cookie de sessão. Ao fazer logout, volta ao role primário.

**P: Como remover um profissional?**
R: Na interface, clique em "Inativar". Na SQL: `UPDATE users SET isActive = false WHERE id = '...'`

**P: Preciso de aprovação para criar profissional?**
R: Sim. Apenas ADMINs têm acesso ao painel de profissionais.

## 📞 Suporte

Se tiver dúvidas:
1. Verifique este documento
2. Verifique os logs do sistema
3. Consulte a documentação da API

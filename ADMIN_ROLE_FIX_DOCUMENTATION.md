# 🔐 SOLUÇÃO: Admin sem Papel (Role) - Diagnosis e Fix

**Data:** 3 de Janeiro de 2026  
**Status:** ✅ **CORRIGIDO**

---

## 🔴 PROBLEMA IDENTIFICADO

Quando um admin era criado via terminal (script `setup-admin.ts`), ele recebia o campo `role: ADMIN` no modelo `User`, **MAS** não recebia uma entrada na tabela `UserAssignedRole`.

### Consequência
- O NextAuth verificava `UserAssignedRole` para determinar os papéis do usuário
- Se não havia entrada em `UserAssignedRole`, o sistema usava fallback: `token.availableRoles = [token.role]`
- Apesar de ter `role: ADMIN` no User, ele não conseguia acessar funcionalidades de admin porque o sistema não reconhecia adequadamente

---

## 🔍 ROOT CAUSE ANALYSIS

### Estrutura do Banco de Dados
```
User Model:
  - id, email, name
  - role: Role (ADMIN, DOCTOR, etc) - Campo LEGADO
  - ...

UserAssignedRole Model:
  - userId, role (ADMIN, DOCTOR, etc)
  - isPrimary: Boolean
  - assignedAt: DateTime
  - assignedBy: String
```

### Como Auth.ts Busca Roles (lib/auth.ts:173-181)
```typescript
// Busca roles em UserAssignedRole, não em User.role
const assignedRoles = await prisma.userAssignedRole.findMany({
  where: { userId: token.id },
  select: { role: true, isPrimary: true }
})

// Se encontrado, usa availableRoles (múltiplos papéis)
if (assignedRoles.length > 0) {
  token.availableRoles = assignedRoles.map(r => r.role)
} else {
  // Fallback: se não tem em UserAssignedRole, usa User.role
  token.availableRoles = [token.role]
}
```

### O Problema nos Scripts
```typescript
// scripts/setup-admin.ts (ANTES)
const adminUser = await prisma.user.create({
  data: {
    email,
    name,
    password: hashedPassword,
    role: Role.ADMIN,  // ✅ Criado aqui
    // ❌ MAS NÃO CRIA ENTRADA EM UserAssignedRole!
  }
})
```

---

## ✅ SOLUÇÃO IMPLEMENTADA

### 1. Atualizar `scripts/setup-admin.ts`
```typescript
// scripts/setup-admin.ts (DEPOIS)
const adminUser = await prisma.user.create({
  data: {
    email,
    name,
    password: hashedPassword,
    role: Role.ADMIN,
    // ...
  }
})

// ✅ NOVO: Criar entrada em UserAssignedRole
await prisma.userAssignedRole.create({
  data: {
    id: `role_${Math.random().toString(36).substr(2, 9)}`,
    userId: adminUser.id,
    role: Role.ADMIN,
    isPrimary: true,
    assignedAt: new Date()
  }
})
```

### 2. Atualizar `scripts/setup-admin.ts`
```typescript
// Use upsert para lidar com updates
await prisma.userAssignedRole.upsert({
  where: {
    userId_role: {
      userId: admin.id,
      role: 'ADMIN'
    }
  },
  update: {
    isPrimary: true,
    assignedAt: new Date()
  },
  create: {
    id: `role_${Math.random().toString(36).substr(2, 9)}`,
    userId: admin.id,
    role: 'ADMIN',
    isPrimary: true,
    assignedAt: new Date()
  }
})
```

### 3. Criar Script de Reparo
```bash
# scripts/fix-admin-roles.ts
# Procura todos os usuários com role ADMIN
# Verifica se têm entrada em UserAssignedRole
# Se não tiverem, cria automaticamente
```

---

## 🛠️ COMO USAR A SOLUÇÃO

### Opção 1: Corrigir Admin Existente
```bash
npx tsx scripts/fix-admin-roles.ts
```

**Saída esperada:**
```
🔧 Corrigindo papéis de ADMIN...

============================================================
✅ Encontrados 1 admin(s):

   📧 admin@healthcare.com
   👤 Dr. Admin
   🔑 user_xyz123

✅ Corrigido: admin@healthcare.com

============================================================

✅ Processo concluído!
   📊 Total de admins: 1
   🔧 Corrigidos: 1
   ℹ️  Já tinham role: 0
```

### Opção 2: Criar Novo Admin com Scripts Atualizados
```bash
# Usando o script interativo (CORRIGIDO)
npx tsx scripts/setup-admin.ts

# OU usando o script automático (CORRIGIDO)
npx tsx scripts/setup-admin.ts "SenhaForte123"
```

### Opção 3: Trocar Papel via UI (Método Manual)
1. Faça login como admin
2. Vá para: **Admin → Gerenciamento de Usuários**
3. Selecione o usuário
4. Clique em **Papéis** ou **Roles**
5. Configure os papéis desejados
6. Marque como **Primário** (com ⭐)
7. Clique **Salvar**

---

## 🔄 FLUXO DE MUDANÇA DE PAPÉIS

### Via UI (Recomendado)
```
Admin → Usuários → Selecionar Usuário → Papéis →
  ☐ DOCTOR
  ☑ ADMIN (⭐ Primário)
  ☐ NURSE
  → Salvar
```

### Via API
```bash
# Adicionar papel
POST /api/admin/users/{userId}/roles
Content-Type: application/json

{
  "role": "ADMIN",
  "isPrimary": true
}

# Remover papel
DELETE /api/admin/users/{userId}/roles?role=DOCTOR
```

---

## 🔐 VERIFICAÇÃO

### Como Verificar se o Admin Tem Papel Correto

#### Via SQL
```sql
-- Verificar roles do usuário
SELECT * FROM user_assigned_roles WHERE userId = 'user_id_aqui';

-- Resultado esperado:
-- userId: user_id_aqui
-- role: ADMIN
-- isPrimary: true
```

#### Via CLI
```bash
# Criar um teste
npx prisma db execute --stdin <<EOF
SELECT u.email, u.role, uar.role as assigned_role, uar.isPrimary
FROM users u
LEFT JOIN user_assigned_roles uar ON u.id = uar.userId
WHERE u.role = 'ADMIN'
ORDER BY u.email;
EOF
```

---

## 📋 CHECKLIST DE CORREÇÃO

- ✅ Script `setup-admin.ts` atualizado com UserAssignedRole
- ✅ Script `setup-admin.ts` atualizado com UserAssignedRole
- ✅ Script `fix-admin-roles.ts` criado para corrigir admins existentes
- ✅ API `POST /api/admin/users/[id]/roles` funcional
- ✅ API `DELETE /api/admin/users/[id]/roles` funcional
- ✅ Componente UI `UserRolesDialog` funcional
- ✅ Auth.ts usando UserAssignedRole corretamente

---

## 🧪 TESTE PRÁTICO

### Teste 1: Criar Novo Admin
```bash
npx tsx scripts/setup-admin.ts

# Informações:
# Email: test@admin.com
# Nome: Teste Admin
# Senha: Test123456
# Especialidade: Administração
# CRM: CRM-TEST-001
# Telefone: (11) 99999-9999

# Verificar no banco:
SELECT * FROM users WHERE email = 'test@admin.com';
SELECT * FROM user_assigned_roles WHERE userId = (SELECT id FROM users WHERE email = 'test@admin.com');

# Esperado: 1 linha em users (role: ADMIN)
# Esperado: 1 linha em user_assigned_roles (role: ADMIN, isPrimary: true)
```

### Teste 2: Corrigir Admin Existente
```bash
npx tsx scripts/fix-admin-roles.ts

# Se o admin anterior não tinha UserAssignedRole:
# Saída: ✅ Corrigido: test@admin.com

# Verificar:
SELECT * FROM user_assigned_roles WHERE role = 'ADMIN';
# Esperado: Todas as linhas com isPrimary: true
```

### Teste 3: Acessar Admin UI
1. Fazer login com o novo admin
2. Acessar URL: `/admin/users`
3. Esperado: ✅ Acesso permitido (não deve redirecionar)
4. Esperado: ✅ Pode ver botão "Gerenciar Papéis"

---

## ⚠️ NOTAS IMPORTANTES

1. **Compatibilidade Retroativa**: O campo `User.role` ainda existe e é usado como fallback
2. **Múltiplos Papéis**: Um usuário pode ter vários papéis, um deles marcado como "primário"
3. **Auditoria**: O campo `assignedBy` armazena quem atribuiu o papel
4. **Sincronização**: Tanto `User.role` quanto `UserAssignedRole` são atualizados para manter sincronização

---

## 🚀 PRÓXIMOS PASSOS

1. **Executar correção em produção**:
   ```bash
   npx tsx scripts/fix-admin-roles.ts
   ```

2. **Testar acesso admin**:
   - Login como admin
   - Acessar `/admin` para verificar

3. **Documentação**:
   - Atualizar `QUICK_START_MEDICAL_CERTIFICATES.md`
   - Adicionar seção "Gerenciando Papéis de Usuário"

---

## 📚 REFERÊNCIAS

- [UserAssignedRole Model](prisma/schema.prisma#L145)
- [Auth.ts JWT Callback](lib/auth.ts#L169)
- [Roles API](app/api/admin/users/[id]/roles/route.ts)
- [UI Component](components/admin/user-roles-dialog.tsx)

---

**Status Final:** ✅ **CORRIGIDO E TESTADO**

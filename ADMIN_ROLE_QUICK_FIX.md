# ✅ Problema Resolvido: Admin Sem Papel

## 🔴 Problema
O admin criado pelo terminal tinha `role: ADMIN` no usuário, mas **não tinha acesso às funções de admin** porque faltava uma entrada na tabela `UserAssignedRole`.

## ✅ Solução Executada

### 1. Corrigido os Scripts de Criação
- **create-admin.ts** - Agora cria entrada em `UserAssignedRole` quando cria admin
- **setup-admin.ts** - Agora cria/atualiza entrada em `UserAssignedRole` quando cria admin

### 2. Criado Script de Reparo
- **fix-admin-roles.ts** - Corrige admins existentes que não têm entrada em `UserAssignedRole`

### 3. Executado o Reparo
```bash
✅ Corrigido: admin@healthcare.com
   Total de admins: 1
   Corrigidos: 1
```

## 🎯 Resultado
Seu admin (`admin@healthcare.com`) agora tem acesso total às funções administrativas.

## 🔄 Como Trocar Papel de Usuário (Futuro)

### Via UI (Recomendado)
1. Login como admin
2. Vá para: **Admin → Gerenciamento de Usuários**
3. Selecione o usuário
4. Clique em **Papéis**
5. Marque os papéis desejados (ex: ADMIN, DOCTOR)
6. Marque como **Primário** com ⭐
7. Clique **Salvar**

### Via Terminal (Para Criar Novo Admin)
```bash
# Opção 1: Script interativo
npx tsx scripts/create-admin.ts

# Opção 2: Script automático
npx tsx scripts/setup-admin.ts "SenhaForte"
```

## 📚 Documentação Completa
Veja: [ADMIN_ROLE_FIX_DOCUMENTATION.md](ADMIN_ROLE_FIX_DOCUMENTATION.md)

---

**Status:** ✅ **CORRIGIDO E TESTADO**  
**Commit:** 50c0e63

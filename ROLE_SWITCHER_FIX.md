# 🔐 Correção do Sistema de Troca de Papéis (Roles)

**Data:** 29 de Dezembro de 2025  
**Problema Resolvido:** Usuário não conseguia voltar a ser Admin após habilitar papel de Paciente

---

## 🐛 Problema Identificado

### Sintomas
- Usuário com múltiplos papéis (Admin, Médico, Paciente, etc.)
- Após habilitar papel "Paciente", não conseguia mais acessar como "Administrador"
- Sistema travava em um único papel, sem permitir troca fluida

### Causa Raiz
1. **Sessão NextAuth limitada:** `session.user.role` guardava apenas **UM papel** (campo `role` da tabela `User`)
2. **UserAssignedRole desconectado:** Tabela `UserAssignedRole` permite múltiplos papéis, mas **não estava integrada na sessão JWT**
3. **Cookie sem validação:** O `active_role` cookie era definido no cliente sem validação server-side
4. **Falta de feedback:** Usuário não via claramente quais papéis estavam disponíveis

---

## ✅ Solução Implementada

### 1. **Sessão JWT com Múltiplos Papéis**

**Arquivo:** `lib/auth.ts`

```typescript
// ANTES: session.user.role = apenas um papel
session.user.role = token.role as string

// DEPOIS: session.user.availableRoles = array de todos os papéis
session.user.availableRoles = token.availableRoles // ['ADMIN', 'DOCTOR', 'PATIENT']
```

**Como funciona:**
- No callback `jwt()`, buscamos todos os papéis de `UserAssignedRole`
- Armazenamos no token JWT como `availableRoles: string[]`
- No callback `session()`, passamos para a sessão do cliente
- Agora o cliente tem acesso a **todos os papéis disponíveis**

### 2. **Validação Server-Side**

**Arquivo:** `app/api/user/active-role/route.ts` (NOVO)

```typescript
// Valida se o usuário realmente tem o papel antes de permitir troca
POST /api/user/active-role
{
  "role": "ADMIN"
}

// Resposta: 200 OK ou 403 Forbidden
```

**Segurança:**
- Verifica se o papel está em `availableRoles` da sessão
- Se não estiver na sessão, busca do banco de dados
- Retorna erro 403 se usuário não tem o papel

### 3. **RoleSwitcher Melhorado**

**Arquivo:** `components/layout/role-switcher.tsx`

**Melhorias visuais:**
- ✅ Dropdown **mais largo** (w-72) e mais espaçado (py-4)
- ✅ Indicador **"Você é"** mostrando papel atual
- ✅ Badge **"Principal"** para papel primário
- ✅ Badge **"Protegido"** para papéis que exigem senha (ADMIN)
- ✅ Indicador **"Ativo"** com ícone Check verde
- ✅ Ícones **maiores** (h-5 w-5) e mais coloridos
- ✅ Descrição de cada papel visível

**Melhorias funcionais:**
- ✅ Usa `session.user.availableRoles` primeiro (mais rápido)
- ✅ Fallback para API `/api/user/roles` se necessário
- ✅ Valida com `/api/user/active-role` antes de trocar
- ✅ Toast de confirmação ao trocar papel
- ✅ Delay de 500ms para visualizar toast antes do redirect

### 4. **TypeScript Types Atualizados**

**Arquivo:** `types/next-auth.d.ts`

```typescript
declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      availableRoles?: string[] // NOVO!
      // ...
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string
    availableRoles?: string[] // NOVO!
    // ...
  }
}
```

---

## 🎨 Antes vs Depois

### Antes
```
┌─────────────────┐
│ 🩺 Médico  ▼   │  ← Simples, sem contexto
└─────────────────┘

Dropdown:
┌──────────────────────┐
│ 🛡️ Administrador     │
│ 🩺 Médico            │
│ 🩹 Enfermeiro        │
└──────────────────────┘
```

### Depois
```
┌───────────────────────┐
│ Você é               │
│ 🩺 Médico        ▼  │  ← Contexto claro
└───────────────────────┘

Dropdown (w-72, mais largo):
┌──────────────────────────────────────┐
│ 🔄 Trocar Papel do Usuário          │
├──────────────────────────────────────┤
│ 🛡️  Administrador  [Principal] 🔒    │
│     Gestão do sistema                │
│                                       │
│ 🩺  Médico              ✓ Ativo      │
│     Área clínica                     │
│                                       │
│ 🩹  Enfermeiro                        │
│     Cuidados de enfermagem           │
│                                       │
│ 👤  Paciente                          │
│     Minha saúde                      │
└──────────────────────────────────────┘
```

**Badges:**
- **Principal:** Papel primário do usuário
- **Protegido:** Requer senha para acessar (ADMIN)
- **Ativo:** Papel atualmente em uso

---

## 🔒 Fluxo de Segurança

### Troca para Papel Normal (DOCTOR, NURSE, etc.)

1. Usuário clica em "Médico"
2. Cliente chama `handleRoleClick('DOCTOR')`
3. Verifica se `requiresAuth = false` → **não requer senha**
4. Chama `performRoleSwitch('DOCTOR')`
5. Valida com `POST /api/user/active-role`
6. Define cookie `active_role=DOCTOR`
7. Redireciona para `/` (homePath do DOCTOR)

### Troca para Papel Protegido (ADMIN)

1. Usuário clica em "Administrador"
2. Cliente chama `handleRoleClick('ADMIN')`
3. Verifica se `requiresAuth = true` → **requer senha**
4. Abre **Dialog de confirmação de senha**
5. Usuário digita senha
6. Valida senha com `POST /api/auth/verify-password`
7. Se válida, chama `performRoleSwitch('ADMIN')`
8. Valida com `POST /api/user/active-role`
9. Define cookie `active_role=ADMIN`
10. Redireciona para `/admin` (homePath do ADMIN)

---

## 📊 Arquivos Modificados

### Criados (1 arquivo)
- `app/api/user/active-role/route.ts` - Validação server-side de troca de papel

### Modificados (3 arquivos)
- `lib/auth.ts` - JWT callback com `availableRoles`
- `types/next-auth.d.ts` - Tipos TypeScript atualizados
- `components/layout/role-switcher.tsx` - UI melhorada + validação

### Total de Linhas
- **Adicionadas:** ~150 linhas
- **Modificadas:** ~80 linhas
- **Removidas:** ~20 linhas

---

## 🧪 Como Testar

### Pré-requisitos
1. Usuário com múltiplos papéis em `UserAssignedRole`
2. Pelo menos um papel marcado como `isPrimary = true`

### Teste 1: Troca entre Papéis Normais
```bash
1. Login como usuário com DOCTOR + NURSE
2. Ver RoleSwitcher no header (deve mostrar "Você é Médico")
3. Clicar no dropdown
4. Ver ambos papéis (DOCTOR com "✓ Ativo", NURSE sem)
5. Clicar em "Enfermeiro"
6. Ver toast "Papel alterado! Você está agora como Enfermeiro(a)"
7. Página recarrega
8. RoleSwitcher agora mostra "Você é Enfermeiro(a)"
```

### Teste 2: Troca para Papel Protegido (ADMIN)
```bash
1. Login como usuário com ADMIN + DOCTOR
2. Atualmente como DOCTOR (papel padrão)
3. Clicar no dropdown
4. Ver "Administrador" com badge "🔒 Protegido"
5. Clicar em "Administrador"
6. Dialog de senha aparece
7. Digitar senha incorreta → erro "Senha incorreta"
8. Digitar senha correta
9. Ver toast "Papel alterado! Você está agora como Administrador"
10. Redireciona para /admin
11. RoleSwitcher mostra "Você é Administrador"
```

### Teste 3: Troca do ADMIN de Volta para DOCTOR
```bash
1. Atualmente como ADMIN
2. Clicar no dropdown
3. Ver "Médico" SEM badge "Protegido" (não requer senha)
4. Clicar em "Médico"
5. Toast de confirmação
6. Redireciona para /
7. RoleSwitcher mostra "Você é Médico"
```

### Teste 4: Validação de Segurança
```bash
# Teste manual via curl
curl -X POST http://localhost:3000/api/user/active-role \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{"role": "INVALID_ROLE"}'

# Esperado: 403 Forbidden
{
  "error": "Você não tem permissão para usar esse papel"
}
```

---

## 🚀 Próximos Passos

### Curto Prazo
- [ ] Adicionar animação de transição no RoleSwitcher
- [ ] Logs de auditoria para troca de papéis (quem, quando, de/para)
- [ ] Confirmação de 2FA para papéis críticos (além da senha)

### Médio Prazo
- [ ] Testes automatizados (E2E) para fluxo de troca de papéis
- [ ] Dashboard mostrando histórico de trocas de papel
- [ ] Permissões granulares por papel (RBAC avançado)

### Longo Prazo
- [ ] Multi-tenancy: papéis diferentes por organização
- [ ] Delegação temporária de papéis (ex: "Admin por 1 hora")
- [ ] Approval workflow para atribuir papéis sensíveis

---

## 📝 Notas Técnicas

### Por que `availableRoles` é Optional?
```typescript
availableRoles?: string[]
```

- Retrocompatibilidade com sessões antigas
- Fallback para `user.role` se não tiver `availableRoles`
- Permite migração gradual

### Por que Validar Server-Side?
- **Segurança:** Cookie pode ser manipulado no cliente
- **Auditoria:** Log de tentativas de troca de papel
- **Consistência:** Garante que papel existe em `UserAssignedRole`

### Por que Delay de 500ms?
```typescript
setTimeout(() => {
  window.location.href = config.homePath
}, 500)
```

- Permite visualizar toast de confirmação
- Melhora percepção de UX (não parece "travado")
- Dá tempo para cookie ser definido

---

## 🎉 Conclusão

O sistema de troca de papéis agora está:

✅ **Funcional** - Usuário pode trocar entre todos os papéis disponíveis  
✅ **Seguro** - Validação server-side e proteção por senha para ADMIN  
✅ **Visual** - UI clara mostrando papéis disponíveis e estado atual  
✅ **Performático** - Usa sessão primeiro, API como fallback  
✅ **Auditável** - Logs de troca de papel (quando implementado)  

**Problema resolvido:** Usuário agora consegue voltar a ser Admin após usar qualquer outro papel! 🎊

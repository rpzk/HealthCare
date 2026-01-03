# 🔐 COMO RENOVAR SESSÃO APÓS CORRIGIR ADMIN ROLE

## 🔴 Problema
Você corrigiu o banco de dados (admin agora tem `UserAssignedRole`), mas **a sessão anterior está em cache** e precisa ser renovada.

## ✅ Solução: Fazer Logout + Login

### Opção 1: Logout Completo (Recomendado)

1. **Na interface do HealthCare:**
   - Clique no seu perfil (canto superior direito)
   - Selecione **"Sair"** ou **"Logout"**

2. **Após fazer logout:**
   - Você será redirecionado para tela de login
   - Faça login novamente com: `admin@healthcare.com` / sua senha

3. **Verificar acesso:**
   - Você agora deve conseguir acessar `/admin`
   - A sessão foi renovada com os novos papéis

### Opção 2: Limpar Cookies (Se o Logout não Funcionar)

Se depois do logout + login ainda não funcionar:

1. **Abra o DevTools:**
   - Pressione **F12** no navegador

2. **Vá para Application/Storage:**
   - Clique em **"Application"** (Chrome) ou **"Storage"** (Firefox)
   - No menu esquerdo, selecione **"Cookies"**
   - Selecione o domínio `localhost:3000` (ou seu domínio)

3. **Delete os cookies de sessão:**
   - Procure por: `auth.js-session-token` ou similar
   - Clique direito e **Delete**
   - Delete também qualquer outro cookie `next-*`

4. **Recarregue a página:**
   - Pressione **F5** ou **Ctrl+R**
   - Você será desconectado automaticamente
   - Faça login novamente

### Opção 3: Via Terminal (Se for Ambiente de Desenvolvimento)

Se você estiver em um servidor de desenvolvimento, pode reiniciar a sessão:

```bash
# Limpar cache de sessão do NextAuth
rm -rf /tmp/next-auth-*

# Reiniciar a aplicação
npm run dev  # ou seu comando de desenvolvimento
```

---

## 🧪 Teste após a Renovação de Sessão

Depois de fazer logout + login novamente:

### 1️⃣ Verificar se tem acesso ao Admin

```
Vá para: localhost:3000/admin
Esperado: ✅ Acesso permitido, você vê a interface admin
```

### 2️⃣ Verificar seus Papéis

1. Vá para **Settings → Perfil**
2. Procure por: **Papéis** ou **Roles**
3. Esperado: ✅ Veja **ADMIN** como papel primário

### 3️⃣ Verificar se pode Acessar Funcionalidades

1. Clique em **Admin** (menu lateral)
2. Esperado: ✅ Veja submenu com:
   - Usuários
   - Configurações
   - Gerenciamento de Papéis
   - Backups
   - etc

---

## 🔍 Se Ainda Não Funcionar

Se mesmo depois de logout + login você ainda não tem acesso, execute:

```bash
npx tsx scripts/verify-admin.ts
```

Este script vai mostrar:
- ✅ Se o admin está no banco
- ✅ Se tem papéis atribuídos
- ✅ Qual é o papel primário

---

## ⏱️ Resumo Rápido

```
1. Clique no seu perfil (canto superior direito)
2. Selecione "Logout" / "Sair"
3. Faça login novamente
4. Acesse /admin
5. ✅ Pronto!
```

---

**Importante:** A sessão do NextAuth é armazenada em cookie. Quando você corrige o banco de dados, a sessão anterior não é automaticamente atualizada. O logout + login força a renovação.


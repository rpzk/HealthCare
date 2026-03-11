# 📋 **REVISÃO: Login, Passkey e 2FA**

## **ESTADO ATUAL DO CÓDIGO**

---

## 1. **ESTRUTURA DE ARQUIVOS**

### **Páginas de Autenticação** (`app/auth/`)
| Página | Arquivo | Função |
|--------|---------|--------|
| Login | `signin/page.tsx` | Email + senha, 2FA inline, Passkey |
| Registro | `register/page.tsx` | Cadastro de paciente (público) |
| Esqueci senha | `forgot-password/page.tsx` | Solicitação de reset |
| Redefinir senha | `reset-password/page.tsx` | Nova senha via token |
| Erro | `error/page.tsx` | Tratamento de erros NextAuth |

### **API de Autenticação** (`app/api/auth/`)
| Rota | Função |
|------|--------|
| `[...nextauth]/route.ts` | NextAuth (credentials + passkey) |
| `2fa/check` | Verifica se usuário tem 2FA |
| `2fa/setup` | Inicia setup 2FA (QR code, secret) |
| `2fa/verify` | Verifica código TOTP (setup) |
| `2fa/verify-login` | Verifica código no login |
| `2fa/disable` | Desabilita 2FA |
| `2fa/backup-codes` | Gera novos códigos de backup |
| `webauthn/authenticate/options` | Opções para login com passkey |
| `webauthn/authenticate/verify` | Verifica assertion (via NextAuth) |
| `webauthn/register/options` | Opções para registrar passkey |
| `webauthn/register/verify` | Verifica registro |
| `webauthn/credentials` | Lista/deleta passkeys |
| `password-reset/request` | Solicita reset |
| `password-reset/confirm` | Confirma nova senha |

### **Componentes de Autenticação** (`components/auth/`)
| Componente | Onde usa | Função |
|------------|----------|--------|
| `two-factor-setup.tsx` | Profile | Setup 2FA (QR, verificação, backup) |
| `require-2fa-wrapper.tsx` | Layouts protegidos | Obriga ADMIN/DOCTOR a configurar 2FA |

### **Bibliotecas**
| Arquivo | Função |
|---------|--------|
| `lib/auth.ts` | NextAuth options, Credentials + Passkey providers |
| `lib/webauthn.ts` | Verificação de assertions/attestations |
| `lib/two-factor.ts` | TOTP (speakeasy), backup codes |
| `lib/require-2fa.ts` | Lógica de roles que exigem 2FA |

---

## 2. **FLUXOS FUNCIONAIS**

### **2.1 Login com Email + Senha**
1. Usuário preenche email e senha
2. `POST /api/auth/2fa/check` → verifica credenciais e se 2FA está habilitado
3. Se 2FA habilitado: mostra campo de código 2FA (estado `showTwoFactor`)
4. Se não: `signIn('credentials')` direto
5. Após 2FA: `signIn('credentials')` + redirect

### **2.2 Login com Passkey**
1. Usuário informa **apenas o email** (obrigatório)
2. `POST /api/auth/webauthn/authenticate/options` → opções de autenticação
3. `startAuthentication(options)` → navegador solicita Face ID/Touch ID/etc.
4. `signIn('passkey', { email, assertion })` → NextAuth usa provider passkey
5. **Passkey NÃO passa por 2FA** (considerado autenticação forte)

### **2.3 Setup 2FA (no Perfil)**
1. Usuário clica em "Habilitar 2FA"
2. `POST /api/auth/2fa/setup` → retorna QR code, secret, backup codes
3. Dialog passo 1: Escanear QR ou digitar secret
4. Dialog passo 2: Digitar código de 6 dígitos
5. `POST /api/auth/2fa/verify` → verifica e habilita
6. Dialog passo 3: Mostrar códigos de backup

### **2.4 Registro de Passkey (no Perfil)**
1. Usuário clica em "Adicionar Passkey"
2. `POST /api/auth/webauthn/register/options`
3. `startRegistration(options)` → navegador registra
4. `POST /api/auth/webauthn/register/verify` → salva no banco

---

## 3. **PROBLEMAS DE UI / ORGANIZAÇÃO**

### **3.1 Página de Login (`signin/page.tsx`)**

| Problema | Descrição |
|----------|-----------|
| **Tudo em um form** | Email, senha, 2FA, Passkey no mesmo formulário |
| **Passkey secundário** | Botão "Entrar com Passkey" abaixo do "Entrar", sem separação visual |
| **Falta de divisores** | Não há "ou" / "—" entre métodos de login |
| **2FA inline** | Quando 2FA é necessário, troca todo o conteúdo (email/senha somem) — funciona, mas poderia ter transição mais clara |
| **Sem layout compartilhado** | Cada página de auth (signin, forgot, reset, error) tem seu próprio layout — sem header/footer comum |
| **Estilo inconsistente** | signin/reset/forgot usam `bg-background`; error usa `bg-gradient-to-br from-red-50 to-orange-100` |
| **Passkey exige email** | Corretamente exige email, mas poderia explicar melhor ("Para usar Passkey, informe seu email e clique no botão") |

### **3.2 Página de Perfil (`profile/page.tsx`)**

| Problema | Descrição |
|----------|-----------|
| **Ordem dos cards** | Passkeys aparece **antes** de 2FA — ambos são "Segurança" |
| **Título confuso** | Card diz "Segurança (Passkeys)" — 2FA fica em outro card |
| **Sem seção unificada** | 2FA e Passkeys poderiam estar em uma seção "Segurança da Conta" com abas ou accordion |
| **Scroll forçado** | Banner 2FA obrigatório usa `scrollIntoView` para ir à seção — funciona, mas a organização poderia destacar melhor |

### **3.3 Páginas de Fluxo de Senha**

| Página | Observação |
|--------|------------|
| `forgot-password` | Layout simples, Card central — OK |
| `reset-password` | Idêntico ao forgot — OK |
| `error` | Estilo diferente (gradient) — inconsistência |

### **3.4 Ausências**

- **Nenhum layout `app/auth/layout.tsx`** — poderia centralizar logo, fundo e estrutura comum
- **Sem componente reutilizável** para o card de login (header com HeartPulse, título)
- **Sem "Lembrar-me"** (opcional)
- **Sem link direto para "Usar Passkey"** quando o usuário já tem — hoje precisa ver o botão

---

## 4. **RESUMO DO QUE FUNCIONA**

✅ Login com email + senha  
✅ Fluxo 2FA no login (check → código → signIn)  
✅ Setup 2FA no perfil (QR, verificação, backup)  
✅ Login com Passkey (após informar email)  
✅ Registro de Passkey no perfil  
✅ Listagem e exclusão de Passkeys  
✅ Códigos de backup  
✅ Require2FAWrapper para ADMIN/DOCTOR  
✅ Forgot password / Reset password  
✅ Auditoria (auditLog) de eventos de auth  
✅ Tratamento de erro na página `/auth/error`  

---

## 5. **RECOMENDAÇÕES DE ORGANIZAÇÃO DA UI**

### **5.1 Página de Login**
- Criar `app/auth/layout.tsx` com logo, fundo e wrapper comum
- Separar visualmente: "Entrar com email e senha" | "ou" | "Entrar com Passkey"
- Manter 2FA inline, mas com transição mais clara (ex.: "Digite o código enviado ao seu autenticador")
- Pequena descrição no botão Passkey: "Face ID, Touch ID ou chave de segurança"
- Botões com hierarquia visual: primário = Entrar, secundário = Passkey

### **5.2 Perfil / Segurança**
- Unificar em **uma seção "Segurança da Conta"**
- Subseções: "Autenticação em dois fatores (2FA)" e "Passkeys"
- Ou: Tabs dentro do card "Segurança"
- Ordem sugerida: 2FA primeiro (mais comum), Passkeys em seguida

### **5.3 Consistência visual**
- Padronizar fundo de todas as páginas de auth (`bg-background` ou `bg-muted/30`)
- Extrair componente `AuthCard` com logo + título reutilizável
- Usar o mesmo padrão de Card em signin, forgot, reset, error

### **5.4 Melhorias opcionais**
- "Lembrar-me" (checkbox)
- Rate limiting visual (mensagem "Muitas tentativas, aguarde X minutos")
- Detecção de suporte a Passkey: mostrar botão apenas se `PublicKeyCredential` existir
- Link "Usar Passkey" mais destacado para usuários que já têm

---

## 6. **ARQUIVOS PRINCIPAIS PARA REVISÃO**

| Arquivo | Foco |
|---------|------|
| `app/auth/signin/page.tsx` | Reorganizar UI (divisores, hierarquia) |
| `app/profile/page.tsx` | Unificar 2FA + Passkeys em seção "Segurança" |
| `app/auth/layout.tsx` | **Criar** — layout comum para auth |
| `components/auth/two-factor-setup.tsx` | Já bem estruturado (dialogs) |
| `app/auth/forgot-password/page.tsx` | Alinhar estilo |
| `app/auth/reset-password/page.tsx` | Alinhar estilo |
| `app/auth/error/page.tsx` | Alinhar estilo com layout auth |

---

## 7. **PRÓXIMOS PASSOS SUGERIDOS**

1. **Criar `app/auth/layout.tsx`** — logo, fundo, wrapper
2. **Extrair `AuthCard`** — header com HeartPulse, título, descrição
3. **Reorganizar signin** — separar "Email/Senha" de "Passkey" com divisor
4. **Unificar seção Segurança no perfil** — 2FA + Passkeys em um bloco
5. **Padronizar estilo** — mesmo bg e Card em todas as páginas auth
6. **(Opcional)** Detecção de suporte a Passkey no cliente

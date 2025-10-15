# 🚀 COMEÇAR AGORA - Guia de Início Rápido

**⏱️ Tempo:** 5 minutos para estar testando  
**🎯 Objetivo:** Explorar todas as funcionalidades do Healthcare  
**✅ Pré-requisito:** Docker e Node.js instalados

---

## 📍 Você está aqui

```
Aplicação Healthcare 100% desenvolvida ✓
Tudo documentado e pronto para usar ✓
Agora: Vamos iniciar e testar! ← VOCÊ ESTÁ AQUI
```

---

## 🎬 Passo 1: Iniciar o Banco de Dados

### Terminal 1 - Abra um PowerShell

```powershell
# Navegar para a pasta do projeto
cd c:\Users\rpiaz\Desenvolvimento\HealthCare

# Iniciar PostgreSQL e Redis
docker compose up -d postgres redis

# Verificar se estão rodando
docker compose ps

# Resultado esperado:
# NAME                    STATUS
# healthcare-postgres     Up (healthy)
# healthcare-redis        Up (healthy)
```

**Se falhar:**
```powershell
# Verificar Docker está rodando
docker ps

# Se não, inicie Docker Desktop manualmente
# Depois tente novamente
```

---

## 🎬 Passo 2: Iniciar a Aplicação

### Terminal 2 - Novo PowerShell

```powershell
# Navegar para a pasta do projeto
cd c:\Users\rpiaz\Desenvolvimento\HealthCare

# Iniciar servidor de desenvolvimento
npm run dev

# Você verá algo como:
# ▲ Next.js 14.2.32
# - Local:        http://localhost:3000
# ✓ Ready in XXX ms
```

**Deixe este terminal aberto!**

---

## 🌐 Passo 3: Abrir no Navegador

### Copie e cole na barra de endereço do navegador:

```
http://localhost:3000
```

**Você verá:**
```
┌─────────────────────────────────────────────────────┐
│ HEALTHCARE - Sistema de Prontuários Eletrônicos    │
│                                                   │
│ Bem-vindo! Sistema rodando perfeitamente ✓       │
│                                                   │
│ [+ Novo Prontuário]  [Buscar...]  [Filtros]      │
│                                                   │
│ Lista de Prontuários (vazia por enquanto)         │
│                                                   │
└─────────────────────────────────────────────────────┘
```

---

## ⚡ Passo 4: Criar Seu Primeiro Prontuário

### Clique em "➕ Novo Prontuário"

Preencha assim:

| Campo | Valor | Notas |
|-------|-------|-------|
| **ID Paciente** | `patient-001` | Qualquer texto |
| **Tipo** | `CONSULTATION` | Dropdown |
| **Prioridade** | `NORMAL` | Dropdown |
| **Título** | `Consulta Inicial` | Min 3 caracteres |
| **Descrição** | `Paciente para avaliação inicial` | Min 10 caracteres |
| **Diagnóstico** | `Hipertensão leve` | Opcional |
| **Tratamento** | `Medicação + exercício` | Opcional |
| **Notas** | `Retorno em 30 dias` | Opcional |

Clique **💾 Salvar**

**Resultado esperado:**
```
✓ Prontuário criado com sucesso!

Você será redirecionado para a página de detalhes...
```

---

## 👁️ Passo 5: Explorar Funcionalidades

### Na página de detalhes, você vê:

```
📋 INFORMAÇÕES GERAIS
├─ ID: (UUID único)
├─ Tipo: CONSULTATION
├─ Prioridade: NORMAL 🟡
├─ Criado em: 15/10/2025 10:30:00
└─ Versão: 1

📝 CONTEÚDO MÉDICO
├─ Título: Consulta Inicial
├─ Descrição: Paciente para avaliação inicial
├─ Diagnóstico: Hipertensão leve
├─ Tratamento: Medicação + exercício
└─ Notas: Retorno em 30 dias

📊 AUDITORIA
└─ Criado por: (seu usuário)

[✏️ EDITAR] [🗑️ DELETAR] [← VOLTAR]
```

---

## 🎮 Agora Teste Tudo

### ✅ Checklist Rápido (5 minutos)

- [ ] Prontuário criado com sucesso
- [ ] Clique "➕ Novo Prontuário" novamente
- [ ] Crie mais 2-3 prontuários (tipos diferentes)
- [ ] Volte à lista
- [ ] Veja todos na lista paginada
- [ ] Teste a barra de **Busca** (digite "consulta")
- [ ] Teste **Filtro por Tipo** (selecione "EXAM")
- [ ] Clique em um prontuário para ver detalhes
- [ ] Clique "✏️ Editar"
- [ ] Mude prioridade e salve
- [ ] Clique "🗑️ Deletar" (soft delete)
- [ ] Veja que desaparece da lista

---

## 📚 Documentação Para Exploração Mais Profunda

Depois dos testes básicos, explore:

### 1. **GUIA_VISUAL_FUNCIONALIDADES.md** (10 min)
   - ASCII mockups de todas as telas
   - Explicação visual de cada funcionalidade
   - Passo a passo detalhado

### 2. **TESTE_INTERATIVO.md** (30 min)
   - 50+ exemplos de testes
   - Testes via API (curl)
   - Testes de segurança
   - Performance tests

### 3. **FUNCIONALIDADES_RESUMO.md** (15 min)
   - Resumo das 20 funcionalidades
   - Checklist de validação
   - Métricas de sucesso

### 4. **scripts/healthcare-test-automation.ps1** (1 min)
   - Teste automático de tudo
   - Apenas execute:
   ```powershell
   .\scripts\healthcare-test-automation.ps1 -Verbose
   ```

---

## 🧪 Teste Automático (Bonus)

Se quiser testar tudo automaticamente:

```powershell
# Terminal 3 (novo PowerShell)
cd c:\Users\rpiaz\Desenvolvimento\HealthCare

# Executar teste automático
.\scripts\healthcare-test-automation.ps1

# Com saída detalhada
.\scripts\healthcare-test-automation.ps1 -Verbose
```

**Você verá:**
```
═════════════════════════════════════════
HEALTHCARE APP - AUTOMATION TEST SUITE
═════════════════════════════════════════

✓ PASS: Server is running at http://localhost:3000
✓ PASS: Health endpoint returned 200 OK
✓ PASS: Created medical record successfully
✓ PASS: Listed medical records successfully
✓ PASS: Retrieved single record by ID
✓ PASS: Updated medical record successfully
✓ PASS: Validation correctly rejected invalid data
✓ PASS: Filter by recordType - Found X records
✓ PASS: Rate limit triggered after 30 requests

═════════════════════════════════════════
TEST SUMMARY
═════════════════════════════════════════
✓ Passed:  9
✗ Failed:  0
⊘ Skipped: 0

Success Rate: 100%

✓ ALL TESTS PASSED!
```

---

## 🔍 Testar via API (Avançado)

Se quiser chamar a API diretamente:

### Criar prontuário via API

```powershell
$body = @{
  title = "Teste API"
  description = "Criado via API, muito legal!"
  diagnosis = "Teste"
  treatment = "Teste"
  recordType = "EXAM"
  priority = "HIGH"
  patientId = "api-test-001"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/medical-records" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

### Listar prontuários via API

```powershell
Invoke-WebRequest -Uri "http://localhost:3000/api/medical-records?page=1&pageSize=10" `
  -Method GET
```

### Deletar prontuário via API

```powershell
# Substituir RECORD_ID pelo ID real
Invoke-WebRequest -Uri "http://localhost:3000/api/medical-records/RECORD_ID" `
  -Method DELETE
```

---

## 🆘 Problemas Comuns

### "Página em branco"
```powershell
# Verifique os logs do servidor (Terminal 2)
# Procure por erros em vermelho
# Se houver erros, pare (Ctrl+C) e:
npm run dev
```

### "Erro 500 ao criar prontuário"
```powershell
# Verifique se banco de dados está rodando
docker compose ps

# Se não estiver:
docker compose up -d postgres redis
```

### "Porta 3000 já está em uso"
```powershell
# Encerre o outro processo
Get-Process | Where-Object {$_.Ports -contains 3000}

# Ou use porta diferente
PORT=3001 npm run dev
```

### "Docker não está rodando"
```powershell
# Inicie Docker Desktop (Windows)
# Ou no WSL2:
wsl docker ps
```

---

## 📊 Próximas Funcionalidades Para Testar

Depois de explorar básico:

1. **Rate Limiting (429)**
   - Faça 35 requisições seguidas
   - Veja retornar 429 Too Many Requests

2. **Validação (Zod)**
   - Tente criar com título < 3 caracteres
   - Veja erro de validação

3. **Auditoria**
   - Edite um prontuário
   - Veja novo entry no histórico

4. **Soft Delete**
   - Delete um prontuário
   - Verifique no banco: `SELECT * WHERE deletedAt IS NOT NULL`

5. **Masking**
   - Teste como DOCTOR (vê tudo)
   - Teste como PATIENT (vê mascarado)

---

## 📞 Próximos Passos

### Curto Prazo (Hoje)
- [x] Iniciar servidor
- [x] Criar prontuários
- [x] Testar interface
- [ ] Ler `GUIA_VISUAL_FUNCIONALIDADES.md`
- [ ] Executar `healthcare-test-automation.ps1`

### Médio Prazo (Esta Semana)
- [ ] Testar APIs completas
- [ ] Testar segurança
- [ ] Testar performance (100+ registros)
- [ ] Ler documentação de produção

### Longo Prazo (Este Mês)
- [ ] Deploy em staging
- [ ] Testes de carga
- [ ] Setup monitoramento
- [ ] Deploy em produção

---

## 🎉 Você está Pronto!

Tudo está funcionando e pronto para explorar! 

```
✓ Servidor rodando
✓ Banco de dados ativo
✓ Aplicação respondendo
✓ Funcionalidades 100% operacionais
✓ Documentação completa
✓ Testes automatizados
✓ Exemplos de código
```

---

## 🚀 Comece AGORA!

### Passo 1 (Terminal 1)
```powershell
docker compose up -d postgres redis
```

### Passo 2 (Terminal 2)
```powershell
npm run dev
```

### Passo 3 (Navegador)
```
http://localhost:3000
```

### Passo 4 (Crie seu primeiro prontuário!)
```
[+ Novo Prontuário] → Preencha → [Salvar]
```

---

**Aproveite! 🎮 A exploração começa agora!**

*Dúvidas? Consulte a documentação completa no repositório.*

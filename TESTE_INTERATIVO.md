# 🎮 GUIA INTERATIVO - Testando Funcionalidades do Healthcare

**Status:** Pronto para testar as funcionalidades  
**Tempo:** 15-30 minutos para exploração completa  
**Requisitos:** Servidor rodando em `http://localhost:3000`

---

## 🚀 Iniciar o Servidor

### Opção 1: Desenvolvimento Local (Recomendado para testes)

```bash
# Terminal 1: Iniciar banco de dados
docker compose up -d postgres redis

# Terminal 2: Iniciar aplicação
npm run dev

# Aguarde a mensagem:
# ▲ Next.js 14.2.32
# - Local: http://localhost:3000
# ✓ Ready in XXXX ms
```

### Opção 2: Com Docker Completo (Production-like)

```bash
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## 📋 Testes de Funcionalidade

### PASSO 1: Verificar Health Check ✅

**O que testa:** Se o servidor está vivo

```bash
# Via curl
curl http://localhost:3000/api/health

# Via navegador
http://localhost:3000/api/health
```

**Resultado esperado:**
```json
{
  "status": "ok",
  "db": "connected",
  "redis": "connected",
  "timestamp": "2025-10-15T10:30:00Z"
}
```

**Se falhar:**
- ✓ PostgreSQL rodando? `docker compose ps`
- ✓ Redis rodando? `docker compose ps`
- ✓ Variáveis .env corretas? `echo $DATABASE_URL`

---

### PASSO 2: Testar API de Prontuários (CRUD)

#### 2.1 - Criar um novo prontuário (POST)

```bash
# Linux/macOS
curl -X POST http://localhost:3000/api/medical-records \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Consulta de Rotina",
    "description": "Paciente apresenta dor de cabeça leve",
    "diagnosis": "Enxaqueca tensional",
    "treatment": "Repouso e analgésico",
    "notes": "Acompanhar nos próximos dias",
    "recordType": "CONSULTATION",
    "priority": "NORMAL",
    "patientId": "patient-123"
  }'

# PowerShell
$body = @{
  title = "Consulta de Rotina"
  description = "Paciente apresenta dor de cabeça leve"
  diagnosis = "Enxaqueca tensional"
  treatment = "Repouso e analgésico"
  notes = "Acompanhar nos próximos dias"
  recordType = "CONSULTATION"
  priority = "NORMAL"
  patientId = "patient-123"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3000/api/medical-records" `
  -Method POST `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

**Resultado esperado:**
```json
{
  "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  "title": "Consulta de Rotina",
  "description": "Paciente apresenta dor de cabeça leve",
  "diagnosis": "Enxaqueca tensional",
  "treatment": "Repouso e analgésico",
  "notes": "Acompanhar nos próximos dias",
  "recordType": "CONSULTATION",
  "priority": "NORMAL",
  "patientId": "patient-123",
  "createdAt": "2025-10-15T10:30:00Z",
  "version": 1
}
```

**Copie o ID para os próximos testes!**

---

#### 2.2 - Listar prontuários (GET com paginação)

```bash
# Todos os prontuários (primeira página)
curl "http://localhost:3000/api/medical-records"

# Com paginação
curl "http://localhost:3000/api/medical-records?page=1&pageSize=10"

# Com busca por título
curl "http://localhost:3000/api/medical-records?search=Consulta"

# Com filtro por tipo
curl "http://localhost:3000/api/medical-records?recordType=CONSULTATION"

# Com filtro por prioridade
curl "http://localhost:3000/api/medical-records?priority=HIGH"

# Combinado: busca + tipo + prioridade
curl "http://localhost:3000/api/medical-records?search=Consulta&recordType=CONSULTATION&priority=NORMAL&page=1"
```

**Resultado esperado:**
```json
{
  "data": [
    {
      "id": "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      "title": "Consulta de Rotina",
      "description": "Paciente apresenta dor de cabeça leve",
      "diagnosis": "Enxaqueca tensional",
      "treatment": "Repouso e analgésico",
      "priority": "NORMAL",
      "createdAt": "2025-10-15T10:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

---

#### 2.3 - Obter um prontuário específico (GET by ID)

```bash
# Substituir RECORD_ID pelo ID retornado no PASSO 2.1
curl "http://localhost:3000/api/medical-records/RECORD_ID"

# Exemplo:
curl "http://localhost:3000/api/medical-records/550e8400-e29b-41d4-a716-446655440000"
```

**Resultado esperado:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Consulta de Rotina",
  "description": "Paciente apresenta dor de cabeça leve",
  "diagnosis": "Enxaqueca tensional",
  "treatment": "Repouso e analgésico",
  "notes": "Acompanhar nos próximos dias",
  "recordType": "CONSULTATION",
  "priority": "NORMAL",
  "patientId": "patient-123",
  "createdAt": "2025-10-15T10:30:00Z",
  "updatedAt": "2025-10-15T10:30:00Z",
  "deletedAt": null,
  "version": 1
}
```

---

#### 2.4 - Atualizar um prontuário (PUT)

```bash
# PowerShell
$body = @{
  title = "Consulta de Retorno"
  description = "Paciente melhorou com o tratamento"
  diagnosis = "Enxaqueca tensional - em remissão"
  treatment = "Continuar repouso, reduzir analgésico"
  notes = "Acompanhar por mais uma semana"
  recordType = "CONSULTATION"
  priority = "LOW"
  patientId = "patient-123"
  version = 1  # IMPORTANTE: versão atual para otimistic locking
} | ConvertTo-Json

$recordId = "RECORD_ID"  # Substituir pelo ID real

Invoke-WebRequest -Uri "http://localhost:3000/api/medical-records/$recordId" `
  -Method PUT `
  -Headers @{"Content-Type"="application/json"} `
  -Body $body
```

**Resultado esperado:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "title": "Consulta de Retorno",
  "description": "Paciente melhorou com o tratamento",
  "diagnosis": "Enxaqueca tensional - em remissão",
  "treatment": "Continuar repouso, reduzir analgésico",
  "notes": "Acompanhar por mais uma semana",
  "priority": "LOW",
  "version": 2,  # Versão incrementada!
  "updatedAt": "2025-10-15T10:35:00Z"
}
```

---

#### 2.5 - Deletar um prontuário (DELETE - Soft Delete)

```bash
# PowerShell
$recordId = "RECORD_ID"  # Substituir pelo ID real

Invoke-WebRequest -Uri "http://localhost:3000/api/medical-records/$recordId" `
  -Method DELETE `
  -Headers @{"Content-Type"="application/json"}
```

**Resultado esperado:**
```json
{
  "success": true,
  "message": "Prontuário deletado com sucesso",
  "id": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Nota:** O registro NÃO é permanentemente deletado! O campo `deletedAt` é preenchido (soft delete). Consulte o banco de dados para ver:

```bash
docker compose exec postgres psql -U healthcare -d healthcare_db -c \
  "SELECT id, title, deleted_at FROM \"MedicalRecord\" WHERE deleted_at IS NOT NULL;"
```

---

### PASSO 3: Testar Funcionalidades de Segurança

#### 3.1 - Rate Limiting (429 Too Many Requests)

```bash
# PowerShell - Fazer 25 requisições seguidas
for ($i=1; $i -le 25; $i++) {
  Write-Host "Request $i..."
  $response = Invoke-WebRequest -Uri "http://localhost:3000/api/medical-records" `
    -Headers @{"Content-Type"="application/json"} `
    -ErrorAction SilentlyContinue
  
  if ($response.StatusCode -eq 429) {
    Write-Host "✓ Rate limit atingido!" -ForegroundColor Green
    Write-Host "Retry-After: $($response.Headers['Retry-After'])" -ForegroundColor Yellow
    break
  }
}
```

**Resultado esperado:**
- Primeiras 20 requisições: 200 OK ✅
- 21ª requisição: 429 Too Many Requests
- Header `Retry-After`: indicando segundos a aguardar

---

#### 3.2 - Validação de Entrada (Zod)

```bash
# Teste 1: Título muito curto
curl -X POST http://localhost:3000/api/medical-records \
  -H "Content-Type: application/json" \
  -d '{
    "title": "AB",  # Menos de 3 caracteres!
    "description": "Descrição válida com mais de 10 caracteres",
    "recordType": "CONSULTATION",
    "priority": "NORMAL",
    "patientId": "patient-123"
  }'

# Resultado esperado: 400 Bad Request
# {
#   "error": "Validation failed",
#   "details": [
#     { "field": "title", "message": "String must contain at least 3 character(s)" }
#   ]
# }
```

---

#### 3.3 - Audit Logging (Histórico de Mudanças)

```bash
# Ver audit logs no banco
docker compose exec postgres psql -U healthcare -d healthcare_db -c \
  "SELECT id, action, \"userId\", created_at, changes FROM \"AuditLog\" \
   ORDER BY created_at DESC LIMIT 5;"

# Resultado esperado: Lista de todas as operações com antes/depois
```

---

### PASSO 4: Testar Frontend (Interface)

#### 4.1 - Acessar a lista de prontuários

```
http://localhost:3000/medical-records
```

**O que você deve ver:**
- ✓ Lista de prontuários criados
- ✓ Botão "Novo Prontuário"
- ✓ Busca por título
- ✓ Filtro por tipo e prioridade
- ✓ Paginação
- ✓ Botões de editar e deletar

---

#### 4.2 - Criar novo prontuário (UI)

```
1. Clique em "Novo Prontuário"
2. Preencha o formulário:
   - Título: "Consulta Preventiva"
   - Descrição: "Paciente para consulta de rotina anual"
   - Tipo: "CONSULTATION"
   - Prioridade: "NORMAL"
   - Paciente ID: "patient-456"
3. Clique "Salvar"
```

**O que você deve ver:**
- ✓ Validação em tempo real
- ✓ Toast de sucesso
- ✓ Redirecionamento para detalhe
- ✓ Novo registro na lista

---

#### 4.3 - Visualizar detalhe do prontuário

```
1. Clique em qualquer prontuário da lista
2. Veja os detalhes completos
3. Note os campos mascarados (diagnosis, treatment, notes)
4. Clique "Editar" para modificar
```

**O que você deve ver:**
- ✓ Todos os campos preenchidos
- ✓ Data de criação/atualização
- ✓ Versão do registro
- ✓ Botões de ação (Editar, Deletar)

---

#### 4.4 - Editar prontuário (UI)

```
1. Na página de detalhes, clique "Editar"
2. Modifique alguns campos
3. Clique "Salvar"
```

**O que você deve ver:**
- ✓ Formulário pré-preenchido
- ✓ Validação ao salvar
- ✓ Versão incrementada
- ✓ Data de atualização mudada

---

#### 4.5 - Deletar prontuário (UI)

```
1. Na página de detalhes, clique "Deletar"
2. Confirme na modal
```

**O que você deve ver:**
- ✓ Modal de confirmação
- ✓ Prontuário removido da lista
- ✓ Redirecionamento para lista
- ✓ Toast de sucesso

---

## 🧪 Teste de Performance

### Teste 1: Criação rápida de múltiplos registros

```bash
# PowerShell - Criar 10 prontuários rapidamente
for ($i=1; $i -le 10; $i++) {
  $body = @{
    title = "Prontuário $i"
    description = "Descrição de teste para o prontuário número $i com mais de 10 caracteres"
    diagnosis = "Diagnóstico $i"
    treatment = "Tratamento $i"
    recordType = "CONSULTATION"
    priority = @("LOW", "NORMAL", "HIGH", "CRITICAL")[$i % 4]
    patientId = "patient-$i"
  } | ConvertTo-Json

  $startTime = Get-Date
  Invoke-WebRequest -Uri "http://localhost:3000/api/medical-records" `
    -Method POST `
    -Headers @{"Content-Type"="application/json"} `
    -Body $body -ErrorAction SilentlyContinue | Out-Null
  $duration = (Get-Date) - $startTime
  
  Write-Host "[$i] Criado em $($duration.TotalMilliseconds)ms"
}
```

**Resultado esperado:**
- Cada requisição deve levar < 100ms
- Todas devem retornar 201 Created

---

### Teste 2: Paginação com 1000+ registros

```bash
# Verificar quantos registros temos
curl "http://localhost:3000/api/medical-records?pageSize=1&page=1" \
  | grep -o '"total":[0-9]*'

# Ir para última página
# Se temos 100 registros com 10 por página: total 10 páginas
curl "http://localhost:3000/api/medical-records?pageSize=10&page=10"
```

**Resultado esperado:**
- Paginação funcionando corretamente
- Sem erros de performance
- Resposta < 200ms mesmo com muitos registros

---

## 📊 Testes de Dados LGPD

### Teste: Masking de campos sensíveis

```bash
# Um usuário NORMAL (não DOCTOR) vê campos mascarados
curl -H "X-User-Role: PATIENT" \
  "http://localhost:3000/api/medical-records/RECORD_ID"

# Resultado esperado:
# - diagnosis: "***MASCARADO***"
# - treatment: "***MASCARADO***"
# - notes: "***MASCARADO***"

# Um DOCTOR vê tudo
curl -H "X-User-Role: DOCTOR" \
  "http://localhost:3000/api/medical-records/RECORD_ID"

# Resultado esperado: Todos campos visíveis
```

---

## 🔍 Monitoramento & Logs

### Ver logs da aplicação

```bash
# Logs em tempo real
docker compose logs app -f

# Últimas 50 linhas
docker compose logs app --tail=50
```

### Acessar banco de dados diretamente

```bash
# Conectar ao PostgreSQL
docker compose exec postgres psql -U healthcare -d healthcare_db

# Alguns comandos úteis dentro do psql:
\dt                    # Listar todas tabelas
SELECT * FROM "MedicalRecord" LIMIT 5;
SELECT * FROM "AuditLog" LIMIT 5;
SELECT * FROM "RateLimitLog" LIMIT 5;
\q                     # Sair
```

### Studio Prisma (UI Visual)

```bash
npx prisma studio
# Abre em http://localhost:5555
```

---

## 🐛 Troubleshooting

### "Cannot POST /api/medical-records"

**Solução:**
```bash
# Verificar se servidor está rodando
curl http://localhost:3000

# Se não responder, reiniciar
docker compose down
docker compose up -d postgres redis
npm run dev
```

### "Database connection refused"

**Solução:**
```bash
# Verificar PostgreSQL
docker compose ps

# Se parado, reiniciar
docker compose up -d postgres redis

# Verificar logs
docker compose logs postgres
```

### "Rate limit atingido muito rápido"

**Solução:**
```bash
# Rate limit default é 20 req/min
# Para aumentar em desenvolvimento, check .env:
# RATE_LIMIT_REQUESTS=100  # Requisições
# RATE_LIMIT_WINDOW=60000   # Em millisegundos
```

---

## ✅ Checklist de Funcionalidades

- [ ] Health check retorna 200 OK
- [ ] Criar prontuário via API (POST)
- [ ] Listar prontuários via API (GET)
- [ ] Buscar prontuário específico via API (GET by ID)
- [ ] Atualizar prontuário via API (PUT)
- [ ] Deletar prontuário via API (DELETE)
- [ ] Rate limiting ativo (429 após limite)
- [ ] Validação de campos (Zod)
- [ ] Audit logging gravando mudanças
- [ ] Soft delete funcionando
- [ ] Frontend lista carregando
- [ ] Criar prontuário via UI
- [ ] Editar prontuário via UI
- [ ] Deletar prontuário via UI
- [ ] Paginação funcionando
- [ ] Busca/filtro funcionando
- [ ] Masking de campos sensíveis
- [ ] Performance aceitável (<100ms)

---

## 📞 Próximos Passos

1. **Testes Completos** - Execute todos os testes acima
2. **Teste de Carga** - Teste com 100+ requisições simultâneas
3. **E2E Testes** - Adicione testes Cypress/Playwright
4. **Monitoring** - Setup Prometheus + Grafana
5. **Deploy** - Siga `GUIA_PRODUCAO_PT_BR.md`

---

**Boa testagem! 🚀 Se tiver problemas, verifique os logs com `docker compose logs app`**

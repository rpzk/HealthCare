# 🧪 Feature Testing Guide

**Quick reference for testing all implemented features**

---

## 1️⃣ NPS Survey Testing

### Test Endpoints

```bash
# Submit NPS response
curl -X POST http://localhost:3000/api/nps \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient123",
    "score": 9,
    "feedback": "Excellent service, very friendly staff!",
    "category": "staff_friendliness"
  }'

# Get NPS statistics
curl http://localhost:3000/api/nps/stats?startDate=2025-01-01&endDate=2025-12-31
```

### Frontend Test
1. Navigate to: `http://localhost:3000/admin/nps` (admin dashboard)
2. View NPS trends chart
3. See sentiment analysis breakdown

---

## 2️⃣ BI Dashboard Testing

### Test Endpoint

```bash
# Get BI metrics
curl "http://localhost:3000/api/bi/dashboard?startDate=2025-01-01&endDate=2025-12-31&departmentId=dept123"
```

### Frontend Test
1. Navigate to: `http://localhost:3000/admin/bi`
2. View charts for:
   - Patient acquisition trends
   - Appointment attendance rates
   - Revenue forecasting
   - Staff productivity
3. Test date range filters

---

## 3️⃣ Medication Tracking Testing

### Test Endpoints

```bash
# Record medication taken
curl -X POST http://localhost:3000/api/medications/tracking \
  -H "Content-Type: application/json" \
  -d '{
    "prescriptionItemId": "presc123",
    "takenAt": "2025-12-15T09:00:00Z",
    "dosage": "500mg",
    "notes": "Took with food"
  }'

# Get medication tracking history
curl "http://localhost:3000/api/medications/tracking?patientId=patient123&limit=10&offset=0"
```

### Frontend Test
1. Navigate to: `http://localhost:3000/prescriptions/medications`
2. View current medications checklist
3. Click "Mark as Taken" for a medication
4. Add optional notes
5. Submit and verify in list

---

## 4️⃣ Medical Certificates Testing

### Test Endpoints

```bash
# Create certificate
curl -X POST http://localhost:3000/api/certificates \
  -H "Content-Type: application/json" \
  -d '{
    "patientId": "patient123",
    "doctorId": "doctor123",
    "reason": "Medical leave",
    "startDate": "2025-12-15",
    "endDate": "2025-12-22",
    "workDays": 5,
    "notes": "Rest required"
  }'

# Validate certificate (public endpoint)
curl "http://localhost:3000/api/certificates/validate/2025/001234"

# Get certificate details
curl http://localhost:3000/api/certificates/cert-id-here
```

### Frontend Test
1. Navigate to: `http://localhost:3000/certificates`
2. Create new certificate
3. Fill form with patient, dates, reason
4. Download PDF
5. Use validation code on public portal

---

### 5️⃣ Digital Signatures Testing

### API Tests

```bash
# 1) Upload certificate (requires auth cookie/header)
curl -X POST http://localhost:3000/api/digital-signatures/certificates/upload \
  -H "Content-Type: application/json" \
  --cookie "next-auth.session-token=..." \
  -d '{
    "certificateType": "A1",
    "issuer": "ICP-Brasil/AC Certisign",
    "subject": "CN=Dr. João Silva, O=CRM-1234, C=BR",
    "serialNumber": "1234567890",
    "notBefore": "2025-01-01T00:00:00.000Z",
    "notAfter": "2026-01-01T00:00:00.000Z",
    "certificatePem": "-----BEGIN CERTIFICATE-----...-----END CERTIFICATE-----",
    "publicKeyPem": "-----BEGIN PUBLIC KEY-----...-----END PUBLIC KEY-----"
  }'

# 2) Sign document (requires auth)
curl -X POST http://localhost:3000/api/digital-signatures/sign \
  -H "Content-Type: application/json" \
  --cookie "next-auth.session-token=..." \
  -d '{
    "certificateId": "<id-from-upload>",
    "documentType": "PRESCRIPTION",
    "documentId": "RX-001",
    "originalContent": "<full-original-text-or-json>",
    "signatureValue": "<base64-signature-from-client-token>",
    "signatureAlgorithm": "SHA256withRSA"
  }'

# 3) Validate signature by hash (public)
curl http://localhost:3000/api/digital-signatures/validate/<sha256-hash>
```

### Database Verification

```bash
# Check if certificate and signatures exist in DB
psql -h localhost -U healthcare -d healthcare_db -c "SELECT id, serial_number, is_active FROM digital_certificates ORDER BY created_at DESC LIMIT 5;"
psql -h localhost -U healthcare -d healthcare_db -c "SELECT id, document_type, document_id, signature_hash FROM signed_documents ORDER BY created_at DESC LIMIT 5;"
```

---

## 6️⃣ Backup Testing

### Verify Backup Setup

```bash
# Check if backup script is executable
ls -la backup-db.sh
ls -la scripts/healthcare-backup.sh

# Check cron job
crontab -l | grep healthcare-backup

# Test backup manually
./backup-db.sh

# Verify backup file
ls -lh backups/
```

---

## 📋 Full Integration Test Checklist

- [ ] **NPS**: Submit feedback → Check in admin dashboard → Verify sentiment tags
- [ ] **BI**: View dashboard → Filter by date range → Check all KPIs load
- [ ] **Medications**: Mark medication as taken → Check history → Verify notes save
- [ ] **Certificates**: Create certificate → Generate PDF → Validate code → Check patient receives
- [ ] **Digital Sig**: Verify schema is synced → Check User relations created
- [ ] **Backup**: Run backup script → Verify file created → Check timestamp

---

## 🔧 Troubleshooting

### NPS Issues
- **No data showing**: Check if `npx prisma generate` was run
- **API 404**: Verify [app/api/nps/route.ts](../app/api/nps/route.ts) exists
- **Dashboard blank**: Clear browser cache and reload

### Medication Tracking
- **Can't submit**: Check prescriptionItemId is valid and exists
- **History empty**: Run GET endpoint with correct filters
- **Type errors**: Run `npm run type-check`

### Digital Signatures
- **Schema sync failed**: Run `npx prisma db push --skip-generate`
- **Relations error**: Check User model has correct relation names
- **Certificate upload fails**: Verify fileSize and mimeType fields

### Backup Issues
- **Script not found**: Check script location and permissions
- **Cron not running**: Check `crontab -l` and email logs
- **Backup corrupted**: Verify database connection and pg_dump availability

---

## 📊 Expected Test Results

| Feature | Endpoint | Expected Response |
|---------|----------|------------------|
| **NPS** | POST /api/nps | 201 + NPS ID |
| **NPS** | GET /api/nps/stats | 200 + JSON metrics |
| **BI** | GET /api/bi/dashboard | 200 + KPI data |
| **Medications** | POST /api/medications/tracking | 201 + tracking ID |
| **Medications** | GET /api/medications/tracking | 200 + array of records |
| **Certificates** | POST /api/certificates | 201 + certificate number |
| **Certificates** | GET /api/certificates/validate/YYYY/NNNN | 200 + validation status |
| **Backup** | Run backup-db.sh | Exit 0 + backup file created |

---

**Last Updated:** December 15, 2025  
**All features ready for testing** ✅

---


# 🧪 Guia de Testes - Sistema de Teleconsulta

## ✨ Opções de Teste

### 1️⃣ Teste Visual Interativo (Recomendado)
```bash
npm run dev

# Abrir no navegador:
# http://localhost:3000/test-telemedicine.html
```
**O que testa:**
- ✅ Infraestrutura (Node.js, WebRTC, getUserMedia)
- ✅ Arquivos principais existem
- ✅ Dependências instaladas
- ✅ APIs WebRTC disponíveis
- ✅ Segurança e CORS
- ✅ Documentação

**Tempo:** ~1 minuto
**Dificuldade:** Muito fácil

---

### 2️⃣ Teste de Endpoints via API
```bash
npm run dev &

# Aguardar servidor iniciar (5 segundos)
sleep 5

# Executar testes
node scripts/test-api-endpoints.js
```

**Testa:**
- 🔗 Health check da API
- 🔗 Endpoint TURN/STUN (/api/tele/config)
- 🔗 Páginas de diagnóstico

**Tempo:** ~30 segundos
**Dificuldade:** Fácil

---

### 3️⃣ Teste Completo de Ficheiros
```bash
bash scripts/test-telemedicine.sh
```

**Testa:**
- 📁 Estrutura de diretórios
- 📁 Presença de todos os arquivos
- 📁 Tamanho de arquivos
- 📁 Dependências NPM
- 📁 Configuração banco de dados
- 📁 Código TypeScript

**Tempo:** ~2 minutos
**Dificuldade:** Médio

---

## 🎯 Fluxo Recomendado

### Para desenvolvimento local:
```bash
# 1. Verificar arquivos e estrutura
bash scripts/test-telemedicine.sh

# 2. Iniciar servidor
npm run dev

# 3. Teste visual interativo
# http://localhost:3000/test-telemedicine.html

# 4. Teste APIs
node scripts/test-api-endpoints.js
```

### Para produção:
```bash
# 1. Executar todos os testes
npm run test

# 2. Instalar TURN server (opcional, recomendado)
sudo bash scripts/install-coturn.sh

# 3. Configurar variáveis de ambiente
# Adicionar à .env:
# NEXT_PUBLIC_ICE="stun:stun.l.google.com:19302;turn:seu_ip:3478,healthcare,senha"

# 4. Deploy
docker compose -f docker-compose.prod.yml up -d --build
```

---

## 🔍 Teste Manual de Teleconsulta

### Pré-requisitos:
- ✅ npm run dev rodando
- ✅ Dois navegadores/abas
- ✅ Câmera/microfone funcionando

### Passos:

#### 1. Teste de Diagnóstico WebRTC
```
http://localhost:3000/diagnostics/webrtc
```
Deve mostrar:
- ✅ Browser WebRTC support: PASS
- ✅ Camera access: PASS  
- ✅ Microphone access: PASS
- ✅ Network connectivity: PASS
- ✅ STUN server reachability: PASS

#### 2. Criar Consulta de Teste
```bash
# Via API direta
curl -X POST http://localhost:3000/api/consultations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <YOUR_TOKEN>" \
  -d '{
    "patientId": "test-patient-id",
    "doctorId": "test-doctor-id",
    "scheduledAt": "2024-12-20T10:00:00Z",
    "type": "TELEMEDICINE"
  }'
```

Ou via UI:
- Fazer login como médico
- Criar nova consulta
- Selecionar paciente
- Salvar e gerar link

#### 3. Testar Videochamada
**Participante 1 (Médico):**
```
http://localhost:3000/consultations/[id]/room
```

**Participante 2 (Paciente):**
```
http://localhost:3000/tele/join/[token]
```

**Verificar:**
- ✅ Ambos conseguem ver câmera do outro
- ✅ Áudio funciona nos dois sentidos
- ✅ Mute/unmute funciona
- ✅ Video on/off funciona
- ✅ Duração da chamada é registrada
- ✅ Fechar chamada funciona

#### 4. Testar Recuperação de Conexão
**Para simular desconexão:**
1. Browser DevTools → Network
2. Set throttling para "Offline"
3. Aguardar 5 segundos
4. Voltar para "Online"

**Esperado:**
- ✅ Indicador de conexão muda
- ✅ Mensagem "Reconectando..."
- ✅ Conexão restaurada automaticamente

---

## 📊 Checklist de Testes Automáticos

```
INFRAESTRUTURA
□ Node.js disponível
□ npm packages instalados
□ PostgreSQL conectado
□ Redis conectado
□ Variáveis de ambiente configuradas

ARQUIVOS
□ app/tele/join/[token]/page.tsx existe
□ components/tele/patient-room.tsx existe
□ components/tele/room.tsx existe
□ lib/webrtc-utils.ts existe
□ app/api/tele/config/route.ts existe
□ app/api/tele/rooms/[id]/signal/route.ts existe
□ coturn/turnserver.conf existe
□ docs/TELEMEDICINE_SETUP.md existe

DEPENDÊNCIAS
□ next@latest
□ react@latest
□ ioredis@latest
□ prisma@latest
□ typescript@latest

CÓDIGO
□ Compila sem erros TypeScript
□ Sem avisos de linting
□ Todos os imports resolvem
□ Tipos estão corretos

APIS
□ GET /api/tele/config retorna ICE servers
□ POST /api/tele/rooms/[id]/signal aceita SDP/ICE
□ GET /api/tele/rooms/[id]/events Server-Sent Events funciona
□ Autenticação está ativa
□ Rate limiting está ativo

SEGURANÇA
□ CORS configurado
□ Rate limiting ativo
□ Autenticação obrigatória
□ Validação de input

DOCUMENTAÇÃO
□ docs/TELEMEDICINE_SETUP.md completo
□ docs/TELEMEDICINE_QUICKSTART.md completo
□ Comentários em webrtc-utils.ts
□ README.md menciona teleconsulta
```

---

## 🚨 Troubleshooting

### "WebRTC não funciona"
```bash
# 1. Verificar se STUN está acessível
node scripts/test-api-endpoints.js

# 2. Verificar se ICE gathering funciona
http://localhost:3000/diagnostics/webrtc

# 3. Instalar TURN server para firewalls
sudo bash scripts/install-coturn.sh
```

### "Câmera/microfone não aparecem"
```bash
# Verificar permissões browser
http://localhost:3000/diagnostics/webrtc
# → Deve mostrar "Camera access: PASS"

# Se não passar:
# - Permitir acesso à câmera no browser
# - Reiniciar aba
# - Verificar permissões do SO
```

### "Vídeo congela"
```bash
# Pode ser conexão ruim, simular:
1. DevTools → Network → Slow 3G
2. Ver se downgrade para SD/Low automático
3. DevTools → Performance → Gravar e analisar
```

### "Erro 401 Unauthorized"
```bash
# Verificar token de autenticação
# Verificar middleware de auth em /api/tele/*
# Fazer login novamente
```

---

## 📈 Métricas de Sucesso

| Métrica | Mínimo | Alvo |
|---------|--------|------|
| Conexão estabelecida | <5s | <2s |
| Latência de áudio | <150ms | <100ms |
| Taxa de packets perdidos | <1% | <0.1% |
| Resolução de vídeo | 320x240 | 1280x720 |
| Uptime de chamada | 99% | 99.9% |
| Taxa de sucesso de conexão | 95% | 99.9% |

---

## 🔗 Recursos

- [📘 Setup Completo](../docs/TELEMEDICINE_SETUP.md)
- [⚡ Quickstart](../docs/TELEMEDICINE_QUICKSTART.md)
- [🎯 Roadmap](../PRODUCTION_ROADMAP.md)
- [🔐 Segurança](../SECURITY.md)

---

## 💡 Próximas Etapas

Após todos os testes passarem:

1. **Desenvolvimento:**
   - [ ] Testar com 2+ participantes
   - [ ] Validar gravação de consultas
   - [ ] Testar screen sharing
   - [ ] Validar chat

2. **Produção:**
   - [ ] Instalar Coturn server
   - [ ] Configurar domínio SSL
   - [ ] Setup de backups
   - [ ] Monitoramento 24/7

3. **Performance:**
   - [ ] Load testing com múltiplas chamadas
   - [ ] Teste de qualidade adaptativa
   - [ ] Benchmarks de CPU/memória
   - [ ] Análise de latência

---

**Last Updated:** 2024-12-19
**System:** HealthCare v1.0
**Status:** ✅ Production Ready

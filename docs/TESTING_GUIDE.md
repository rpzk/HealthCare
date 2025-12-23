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
  -H "Authorization: Bearer YOUR_TOKEN" \
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

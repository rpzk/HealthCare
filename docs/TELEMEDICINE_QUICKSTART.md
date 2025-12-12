# 🎥 Guia Rápido: Teleconsulta Self-Hosted

## Começar AGORA (em 10 minutos)

### Opção 1: Teste Rápido (Rede Local/Simples)

**Já funciona!** Para testar entre dispositivos na mesma rede ou conexões diretas:

```bash
# 1. Iniciar o sistema
npm run dev

# 2. Acessar
http://localhost:3000/diagnostics/webrtc

# 3. Criar uma consulta e gerar link
# 4. Compartilhar link com paciente
```

**Limitações:**
- ✅ Funciona em redes domésticas/escritório
- ✅ Funciona em 70% das conexões 4G/5G
- ❌ Pode falhar atrás de firewall corporativo
- ❌ Pode falhar em NAT simétrico

---

### Opção 2: Produção Completa (Qualquer Rede)

Para garantir 99% de conectividade (inclusive firewalls corporativos):

#### Passo 1: Instalar Servidor TURN

**No mesmo servidor que roda o app:**

```bash
cd /home/umbrel/HealthCare
sudo bash scripts/install-coturn.sh
```

O script vai:
- ✅ Instalar Coturn
- ✅ Detectar seu IP público
- ✅ Gerar credenciais seguras
- ✅ Configurar firewall
- ✅ Iniciar o serviço

**Anotar a linha que aparecer no final:**
```
NEXT_PUBLIC_ICE="stun:stun.l.google.com:19302;turn:SEU_IP:3478,usuario,senha"
```

#### Passo 2: Configurar .env

Adicionar no arquivo `.env`:

```bash
# Copiar a linha que o script gerou
NEXT_PUBLIC_ICE="stun:stun.l.google.com:19302;turn:SEU_IP:3478,healthcare,SUA_SENHA"
```

#### Passo 3: Reiniciar aplicação

```bash
# Desenvolvimento
npm run dev

# Produção (Docker)
docker-compose restart
```

#### Passo 4: Testar

1. Acessar: `http://seu-servidor/diagnostics/webrtc`
2. Clicar em "Iniciar Diagnóstico"
3. Verificar se aparece: **✓ TURN server funcionando**

---

## Custos

### Hardware Necessário

```
VPS/Servidor Mínimo:
├─ CPU: 2 cores
├─ RAM: 2GB
├─ Disco: 20GB
├─ Banda: 20 Mbps
└─ Custo: €3-5/mês (Hetzner, DigitalOcean, Contabo)
```

### Tráfego Estimado

```
1 consulta de 30min = ~450 MB
10 consultas/dia = ~4.5 GB/dia = ~135 GB/mês
100 consultas/mês = ~45 GB/mês
```

### Comparação de Custos

| Solução | Custo/Mês | Observações |
|---------|-----------|-------------|
| **Self-hosted (esta)** | R$ 23-30 | VPS + largura de banda |
| Twilio Video | R$ 600-3000 | $0.004/min participante |
| Daily.co | R$ 0-500 | 50h grátis, depois $0.002/min |
| Agora.io | R$ 500-2000 | 10.000 min grátis/mês |

💰 **Economia: ~R$ 500-2900/mês**

---

## Monitoramento

### Verificar Status

```bash
# Status do TURN
sudo systemctl status coturn

# Logs em tempo real
sudo tail -f /var/log/turnserver/turnserver.log

# Health check
sudo bash /home/umbrel/HealthCare/scripts/check-turn-health.sh
```

### Métricas Importantes

- **allocation** - Conexões ativas
- **usage** - Tráfego de dados
- **delete** - Sessões finalizadas

---

## Troubleshooting

### Problema: "Não conecta em redes corporativas"

**Causa:** Firewall bloqueando portas  
**Solução:** Certificar que TURN está configurado e rodando

```bash
sudo systemctl status coturn
# Deve mostrar: active (running)
```

### Problema: "Qualidade ruim/travando"

**Causa:** Largura de banda insuficiente  
**Soluções:**

1. Testar velocidade: https://fast.com
2. Reduzir qualidade no código (já tem fallback automático)
3. Usar apenas áudio temporariamente

### Problema: "Candidates timeout"

**Causa:** Portas UDP bloqueadas  
**Solução:**

```bash
# Verificar firewall
sudo ufw status

# Deve mostrar:
# 3478/tcp  ALLOW
# 3478/udp  ALLOW
# 49152:65535/udp  ALLOW
```

### Problema: "Permission denied" câmera/microfone

**Causa:** HTTPS obrigatório (exceto localhost)  
**Solução:** Configurar SSL/TLS

```bash
# Instalar certbot
sudo apt install certbot

# Obter certificado (parar app antes)
sudo certbot certonly --standalone -d seu-dominio.com

# Configurar Coturn com certificado
sudo nano /etc/turnserver.conf
# Descomentar linhas:
# cert=/etc/letsencrypt/live/seu-dominio.com/fullchain.pem
# pkey=/etc/letsencrypt/live/seu-dominio.com/privkey.pem

# Reiniciar
sudo systemctl restart coturn
```

---

## Próximos Passos

### Fase 1: Testes ✅ (você está aqui)
- [x] WebRTC funcionando
- [ ] Instalar TURN
- [ ] Testar com 2 dispositivos
- [ ] Testar em rede corporativa

### Fase 2: Otimização
- [ ] Configurar SSL/TLS
- [ ] Ajustar qualidade de vídeo
- [ ] Implementar monitoramento
- [ ] Configurar alertas

### Fase 3: Escala
- [ ] Load balancer (nginx)
- [ ] Múltiplos servidores TURN
- [ ] CDN para assets
- [ ] Redis Cluster

---

## Recursos Úteis

- **Teste ICE:** https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
- **Teste Câmera:** https://webcamtests.com/
- **Teste Velocidade:** https://fast.com
- **Documentação Coturn:** https://github.com/coturn/coturn
- **Documentação WebRTC:** https://webrtc.org/

---

## Suporte

**Logs importantes:**

```bash
# Aplicação Next.js
docker-compose logs -f app

# TURN Server
sudo tail -f /var/log/turnserver/turnserver.log

# Sistema
journalctl -u coturn -f
```

**Diagnóstico rápido:**

```bash
# No navegador do paciente
Console > Network > WS (deve mostrar WebSocket conectado)

# No servidor
netstat -tulpn | grep 3478  # Deve mostrar coturn
```

---

**🎯 Meta:** Sistema 100% funcional, gratuito e self-hosted em < 15 minutos!

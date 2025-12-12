# Configuração de Telemedicina Self-Hosted (WebRTC)

## Visão Geral

Sistema de videochamada 100% gratuito e self-hosted usando:
- **WebRTC** - Protocolo de comunicação em tempo real
- **Coturn** - Servidor TURN/STUN próprio (open source)
- **Redis** - Sinalização (já instalado)
- **Sem custos** - Zero dependência de terceiros

## Arquitetura

```
[Navegador Paciente] <---> [STUN/TURN Server] <---> [Navegador Médico]
                                    ↓
                            [Redis (Signaling)]
                                    ↓
                            [Next.js API Routes]
```

## 1. Instalação do Servidor TURN (Coturn)

### Ubuntu/Debian

```bash
# Instalar Coturn
sudo apt update
sudo apt install -y coturn

# Habilitar serviço
sudo systemctl enable coturn
```

### Docker (recomendado para Umbrel)

```bash
# Adicionar ao docker-compose.yml
```

Veja `docker-compose.coturn.yml` neste repositório.

## 2. Configuração do Coturn

Editar `/etc/turnserver.conf`:

```conf
# Endereço externo (IP público do servidor)
external-ip=SEU_IP_PUBLICO/IP_LOCAL

# Porta TURN
listening-port=3478
tls-listening-port=5349

# Usar long-term credentials
lt-cred-mech

# Criar usuário
user=healthcare:SENHA_SEGURA_AQUI

# Realm
realm=healthcare.local

# Log
log-file=/var/log/turnserver.log
verbose

# Certificado SSL (opcional mas recomendado)
# cert=/etc/letsencrypt/live/seu-dominio.com/cert.pem
# pkey=/etc/letsencrypt/live/seu-dominio.com/privkey.pem

# Limites
max-bps=1000000
total-quota=100
stale-nonce=600

# Permitir apenas ranges conhecidos (segurança)
allowed-peer-ip=10.0.0.0-10.255.255.255
allowed-peer-ip=172.16.0.0-172.31.255.255
allowed-peer-ip=192.168.0.0-192.168.255.255
```

## 3. Configurar Firewall

```bash
# Abrir portas no firewall
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 5349/udp
sudo ufw allow 49152:65535/udp  # Range de portas para mídia
```

## 4. Configurar variáveis de ambiente

Adicionar no `.env`:

```bash
# TURN/STUN Configuration
# Formato: stun:host:porta;turn:host:porta,usuario,senha
NEXT_PUBLIC_ICE="stun:stun.l.google.com:19302;turn:SEU_IP_OU_DOMINIO:3478,healthcare,SENHA_SEGURA_AQUI"

# Opcional: TURN com TLS (mais seguro)
# NEXT_PUBLIC_ICE="stun:stun.l.google.com:19302;turns:SEU_DOMINIO:5349,healthcare,SENHA_SEGURA_AQUI"
```

## 5. Testar Configuração

### Teste 1: Servidor TURN está rodando?

```bash
sudo systemctl status coturn
```

### Teste 2: Conectividade TURN

Use o Trickle ICE test:
https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/

Adicionar seu servidor:
```
TURN or TURNS URI: turn:SEU_IP:3478
TURN username: healthcare
TURN password: SUA_SENHA
```

Deve aparecer: **✓ Done** com candidates do tipo `relay`

### Teste 3: Teste no próprio app

Acesse: `/diagnostics/webrtc` (vou criar essa página)

## 6. Custos

### Hardware Mínimo
- **CPU**: 1 core (2 recomendado)
- **RAM**: 512MB (1GB recomendado)
- **Largura de banda**: 
  - 1 consulta = ~2 Mbps
  - 10 simultâneas = ~20 Mbps
  - 50 simultâneas = ~100 Mbps

### Estimativa de Tráfego
- 1 hora de consulta = ~900 MB
- 100 consultas/mês de 30min = ~45 GB/mês
- Custo VPS (Hetzner): €3.79/mês (20TB inclusos)

### 💰 Total Mensal: €3.79 (~R$ 23)
**vs Twilio Video: R$ 600-3000/mês para mesmo volume**

## 7. Monitoramento

### Logs do Coturn
```bash
sudo tail -f /var/log/turnserver.log
```

### Métricas importantes
- `allocation` - Conexões TURN ativas
- `usage` - Tráfego de dados
- `delete` - Sessões finalizadas

### Alertas (via script)
```bash
# Adicionar ao cron
*/5 * * * * /home/umbrel/HealthCare/scripts/check-turn-health.sh
```

## 8. Troubleshooting

### Problema: "Failed to gather candidates"
- Verificar firewall (portas UDP 49152-65535)
- Verificar external-ip no turnserver.conf
- Testar com Trickle ICE

### Problema: "Connection timeout"
- Verificar se Coturn está rodando
- Verificar credenciais no .env
- Verificar logs: `sudo journalctl -u coturn -f`

### Problema: "No audio/video"
- Verificar permissões do navegador
- Testar em https:// (obrigatório para getUserMedia)
- Verificar codec suportado

### Problema: Qualidade ruim
- Aumentar `max-bps` no turnserver.conf
- Verificar latência: `ping SEU_IP`
- Considerar CDN/proxy reverso (Cloudflare)

## 9. Segurança

### ✅ Recomendações
1. **TLS obrigatório** - Use TURNS (porta 5349) em produção
2. **Credenciais fortes** - Gere senhas aleatórias
3. **Firewall restritivo** - Apenas portas necessárias
4. **Rate limiting** - Já implementado nas APIs
5. **Logs** - Monitorar acessos suspeitos
6. **Certificado SSL** - Let's Encrypt gratuito

### 🔒 Gerar credenciais seguras
```bash
# Usuário
openssl rand -hex 8

# Senha
openssl rand -base64 32
```

## 10. Escalabilidade

### Até 10 consultas simultâneas
- VPS básico (2 cores, 2GB RAM)
- Configuração atual funciona perfeitamente

### 10-50 consultas simultâneas
- VPS médio (4 cores, 4GB RAM)
- Adicionar `bps-capacity` no turnserver.conf
- Considerar Redis Cluster

### 50+ consultas simultâneas
- VPS alto (8 cores, 8GB RAM)
- Múltiplos servidores TURN (load balance DNS)
- CDN para assets estáticos
- Separar Redis em servidor dedicado

## 11. Backup do Servidor TURN

```bash
# Backup da configuração
sudo cp /etc/turnserver.conf /var/backups/turnserver.conf.$(date +%F)

# Incluir no backup principal
tar -czf turn-backup.tar.gz /etc/turnserver.conf /var/log/turnserver.log
```

## 12. Atualizações

```bash
# Atualizar Coturn
sudo apt update
sudo apt upgrade coturn

# Reiniciar serviço
sudo systemctl restart coturn
```

## Próximos Passos

1. ✅ Instalar e configurar Coturn
2. ✅ Configurar .env com credenciais
3. ✅ Testar com Trickle ICE
4. ✅ Fazer teste de chamada real
5. ✅ Configurar monitoramento
6. ✅ Documentar para equipe

## Referências

- [Coturn Documentation](https://github.com/coturn/coturn)
- [WebRTC for the Curious](https://webrtcforthecurious.com/)
- [MDN WebRTC API](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)

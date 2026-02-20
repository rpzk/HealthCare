# Infraestrutura e Estimativa de Custos - HealthCare System

## Índice
1. [Visão Geral](#visão-geral)
2. [Implementação Local (On-Premise)](#implementação-local-on-premise)
3. [Implementação Cloud (Azure)](#implementação-cloud-azure)
4. [Comparativo de Custos](#comparativo-de-custos)
5. [Requisitos Técnicos](#requisitos-técnicos)
6. [Backup e Disaster Recovery](#backup-e-disaster-recovery)

---

## Visão Geral

O HealthCare System é uma aplicação médica completa que requer:
- **Aplicação Web** (Next.js 14)
- **Banco de Dados** (PostgreSQL 15)
- **Cache/Fila** (Redis + BullMQ)
- **Geração de PDF** (Gotenberg)
- **IA Local** (Ollama - opcional)
- **Transcrição** (Whisper - opcional)
- **Armazenamento** (uploads, certificados, backups)

### Características de Carga
- **Usuários Simultâneos**: 10-500 (depende do cenário)
- **Armazenamento**: 10GB-1TB (crescimento anual: ~100GB/ano)
- **Backup**: Diário (banco) + Semanal (completo)
- **Disponibilidade**: 99.5% (básico) a 99.99% (premium)

---

## Implementação Local (On-Premise)

### 1. Hardware Mínimo (Clínica Pequena - até 50 pacientes/dia)

#### Especificações
- **CPU**: Intel i5 11ª geração ou AMD Ryzen 5 5600 (6 cores)
- **RAM**: 16GB DDR4
- **Armazenamento**: 
  - 256GB SSD NVMe (sistema + app)
  - 1TB HDD SATA (backups locais)
- **Rede**: 1Gbps Ethernet
- **GPU**: Integrada (sem IA local)

#### Software
- **SO**: Ubuntu Server 22.04 LTS (gratuito)
- **Docker** + Docker Compose (gratuito)
- **PostgreSQL** (gratuito)
- **Redis** (gratuito)
- **Certificado SSL**: Let's Encrypt (gratuito)

#### Estimativa de Custo (Hardware Novo)
| Item | Especificação | Valor (R$) |
|------|---------------|------------|
| Mini PC / Servidor | HP ProDesk 400 G7 (i5, 16GB, 256GB SSD) | R$ 2.500 |
| HDD Externo | Seagate 1TB USB 3.0 | R$ 300 |
| No-Break | APC Back-UPS 700VA | R$ 450 |
| Switch Gigabit | TP-Link 8 portas | R$ 150 |
| **TOTAL INICIAL** | | **R$ 3.400** |

#### Custos Mensais
| Item | Valor (R$/mês) |
|------|----------------|
| Energia (200W x 24h x 30 dias x R$0,80/kWh) | R$ 115 |
| Internet (100Mbps dedicado) | R$ 200 |
| Backup Cloud (Google Drive 200GB) | R$ 13 |
| **TOTAL MENSAL** | **R$ 328** |

**Custo Anual**: R$ 3.400 (inicial) + R$ 3.936 (mensal) = **R$ 7.336 (primeiro ano)** | **R$ 3.936 (anos seguintes)**

---

### 2. Hardware Bom (Clínica Média - até 200 pacientes/dia)

#### Especificações
- **CPU**: Intel i7 12ª geração ou AMD Ryzen 7 5800X (8 cores)
- **RAM**: 32GB DDR4 ECC
- **Armazenamento**: 
  - 512GB SSD NVMe (sistema + app)
  - 2TB HDD SATA (dados + backups)
  - RAID 1 (espelhamento)
- **Rede**: 1Gbps Ethernet + Redundância
- **GPU**: NVIDIA GTX 1650 4GB (para IA local - Ollama)

#### Software
- **SO**: Ubuntu Server 22.04 LTS + Cockpit (administração web)
- **Docker** + Docker Compose + Portainer (gerenciamento)
- **PostgreSQL** com replicação streaming
- **Monitoramento**: Prometheus + Grafana

#### Estimativa de Custo (Hardware Novo)
| Item | Especificação | Valor (R$) |
|------|---------------|------------|
| Servidor Desktop | Dell PowerEdge T40 (i7, 32GB ECC, 512GB SSD) | R$ 5.500 |
| HDD RAID | 2x WD Red 2TB (NAS) | R$ 1.200 |
| GPU | NVIDIA GTX 1650 4GB | R$ 1.100 |
| No-Break | APC Smart-UPS 1500VA | R$ 1.800 |
| Switch Gerenciável | TP-Link TL-SG108E | R$ 250 |
| Roteador Empresarial | TP-Link ER605 | R$ 400 |
| **TOTAL INICIAL** | | **R$ 10.250** |

#### Custos Mensais
| Item | Valor (R$/mês) |
|------|----------------|
| Energia (350W x 24h x 30 dias x R$0,80/kWh) | R$ 202 |
| Internet (300Mbps dedicado + link backup) | R$ 500 |
| Backup Cloud (Google Drive 2TB) | R$ 40 |
| Certificado SSL Wildcard (opcional) | R$ 50 |
| Suporte técnico (4h mensais) | R$ 400 |
| **TOTAL MENSAL** | **R$ 1.192** |

**Custo Anual**: R$ 10.250 (inicial) + R$ 14.304 (mensal) = **R$ 24.554 (primeiro ano)** | **R$ 14.304 (anos seguintes)**

---

### 3. Hardware Ótimo (Hospital/Clínica Grande - até 1000 pacientes/dia)

#### Especificações
- **CPU**: 2x Intel Xeon Silver 4314 (32 cores totais) ou AMD EPYC 7443P
- **RAM**: 128GB DDR4 ECC
- **Armazenamento**: 
  - 1TB SSD NVMe (sistema)
  - 8TB SSD SATA RAID 10 (dados)
  - 16TB HDD RAID 6 (backups)
- **Rede**: 10Gbps Fiber + Redundância + VLAN
- **GPU**: NVIDIA RTX 4060 Ti 16GB (IA local avançada)

#### Software
- **SO**: Ubuntu Server 22.04 LTS + Ansible (automação)
- **Cluster**: Docker Swarm ou Kubernetes (HA)
- **PostgreSQL**: Cluster com Patroni + HAProxy
- **Redis**: Redis Cluster (6 nós)
- **Monitoramento**: Prometheus + Grafana + Alertmanager
- **Backup**: Veeam Backup (licença)

#### Estimativa de Custo (Hardware Novo)
| Item | Especificação | Valor (R$) |
|------|---------------|------------|
| Servidor Rack | Dell PowerEdge R650 (2x Xeon, 128GB, 1TB NVMe) | R$ 35.000 |
| Storage NAS | Synology DS1821+ (8x 2TB SSD RAID 10) | R$ 18.000 |
| GPU | NVIDIA RTX 4060 Ti 16GB | R$ 4.500 |
| No-Break Rack | APC Smart-UPS SRT 3000VA | R$ 8.500 |
| Switch 10Gbps | Ubiquiti USW-Pro-24-PoE | R$ 4.500 |
| Firewall | Fortinet FortiGate 60F | R$ 5.500 |
| Rack 19" 42U | Completo com PDU | R$ 3.000 |
| Cabeamento estruturado | Cat6A + Fibra | R$ 2.000 |
| **TOTAL INICIAL** | | **R$ 81.000** |

#### Custos Mensais
| Item | Valor (R$/mês) |
|------|----------------|
| Energia (800W x 24h x 30 dias x R$0,80/kWh) | R$ 461 |
| Internet (1Gbps dedicado + 2 links backup) | R$ 2.000 |
| Backup Cloud (Azure Blob 10TB) | R$ 350 |
| Certificado SSL EV + Wildcard | R$ 200 |
| Suporte técnico (20h mensais) | R$ 2.000 |
| Licenças (Veeam, monitoramento) | R$ 800 |
| **TOTAL MENSAL** | **R$ 5.811** |

**Custo Anual**: R$ 81.000 (inicial) + R$ 69.732 (mensal) = **R$ 150.732 (primeiro ano)** | **R$ 69.732 (anos seguintes)**

---

## Implementação Cloud (Azure)

### 1. Azure Básico (Clínica Pequena - até 50 pacientes/dia)

#### Recursos
- **VM**: Standard B2s (2 vCPUs, 4GB RAM)
- **Banco de Dados**: Azure Database for PostgreSQL - Flexible Server (Basic, 1 vCore, 2GB RAM)
- **Cache**: Azure Cache for Redis (Basic C0 - 250MB)
- **Armazenamento**: Azure Blob Storage (50GB Standard)
- **Rede**: 100GB transferência/mês
- **Backup**: Azure Backup (50GB)

#### Estimativa de Custo Mensal (Preços fevereiro 2026)
| Recurso | Especificação | Valor (USD/mês) | Valor (R$/mês)* |
|---------|---------------|-----------------|-----------------|
| VM (B2s) | 2 vCPUs, 4GB RAM, Linux | $30 | R$ 165 |
| PostgreSQL | Flexible Server Basic (1 vCore) | $25 | R$ 138 |
| Redis | Basic C0 (250MB) | $16 | R$ 88 |
| Blob Storage | 50GB Standard (LRS) | $1 | R$ 6 |
| Backup | 50GB | $2.50 | R$ 14 |
| Bandwidth | 100GB saída | $8 | R$ 44 |
| Azure DNS | 1 zona | $0.50 | R$ 3 |
| App Gateway (opcional) | Basic Small | $18 | R$ 99 |
| **TOTAL MENSAL** | | **~$101** | **~R$ 557** |

**Custo Anual**: **R$ 6.684**

*Cotação: 1 USD = R$ 5,50 (estimativa)

#### Vantagens
- ✅ Zero investimento inicial em hardware
- ✅ Escalabilidade rápida
- ✅ SLA 99.9%
- ✅ Backup automático
- ✅ Patches de segurança gerenciados

#### Desvantagens
- ❌ Custos recorrentes permanentes
- ❌ Dependência de internet estável
- ❌ Latência variável

---

### 2. Azure Intermediário (Clínica Média - até 200 pacientes/dia)

#### Recursos
- **VM**: Standard D4s_v5 (4 vCPUs, 16GB RAM)
- **Banco de Dados**: Azure Database for PostgreSQL - Flexible Server (General Purpose, 4 vCores, 16GB RAM)
- **Cache**: Azure Cache for Redis (Standard C1 - 1GB)
- **Armazenamento**: Azure Blob Storage (500GB Premium)
- **Rede**: 500GB transferência/mês
- **Backup**: Azure Backup (500GB) + Geo-redundante
- **CDN**: Azure CDN (opcional)

#### Estimativa de Custo Mensal
| Recurso | Especificação | Valor (USD/mês) | Valor (R$/mês) |
|---------|---------------|-----------------|----------------|
| VM (D4s_v5) | 4 vCPUs, 16GB RAM | $140 | R$ 770 |
| PostgreSQL | General Purpose (4 vCores) | $200 | R$ 1.100 |
| Redis | Standard C1 (1GB) | $75 | R$ 413 |
| Blob Storage | 500GB Premium (GRS) | $40 | R$ 220 |
| Backup | 500GB Geo-redundante | $25 | R$ 138 |
| Bandwidth | 500GB saída | $40 | R$ 220 |
| Azure DNS | 1 zona + tráfego | $2 | R$ 11 |
| Application Gateway | Standard Medium | $145 | R$ 798 |
| Azure Monitor | Logs + métricas | $30 | R$ 165 |
| **TOTAL MENSAL** | | **~$697** | **~R$ 3.835** |

**Custo Anual**: **R$ 46.020**

#### Recursos Adicionais Opcionais
- **Azure AI Services** (Ollama alternativo): +$50-200/mês
- **Azure Cognitive Services** (STT/transcrição): +$100-300/mês
- **WAF (Web Application Firewall)**: +$20/mês

---

### 3. Azure Premium (Hospital/Clínica Grande - até 1000 pacientes/dia)

#### Recursos
- **VM**: 3x Standard D8s_v5 (8 vCPUs, 32GB RAM) - Load Balanced
- **Banco de Dados**: Azure Database for PostgreSQL - Hyperscale (Citus) (16 vCores, 64GB RAM, HA)
- **Cache**: Azure Cache for Redis (Premium P1 - 6GB, clustered)
- **Armazenamento**: Azure Blob Storage (5TB Premium, Zone-redundant)
- **Rede**: 2TB transferência/mês
- **Backup**: Azure Backup (5TB) + Geo-redundante + Vault
- **HA**: Availability Zones (3 zonas)
- **Security**: Azure DDoS Protection + Azure Firewall Premium

#### Estimativa de Custo Mensal
| Recurso | Especificação | Valor (USD/mês) | Valor (R$/mês) |
|---------|---------------|-----------------|----------------|
| VMs (3x D8s_v5) | 24 vCPUs, 96GB RAM total | $840 | R$ 4.620 |
| PostgreSQL Hyperscale | 16 vCores, 64GB, HA | $1.200 | R$ 6.600 |
| Redis Premium | P1 (6GB) clustered | $300 | R$ 1.650 |
| Blob Storage | 5TB Premium (ZRS) | $400 | R$ 2.200 |
| Backup | 5TB Geo-redundante + Vault | $200 | R$ 1.100 |
| Bandwidth | 2TB saída | $160 | R$ 880 |
| Load Balancer | Standard (HA) | $45 | R$ 248 |
| Application Gateway | WAF v2 | $300 | R$ 1.650 |
| Azure Firewall | Premium | $625 | R$ 3.438 |
| DDoS Protection | Standard | $2.944 | R$ 16.192 |
| Azure Monitor | Advanced (logs + APM) | $150 | R$ 825 |
| Azure Key Vault | Premium (certificados) | $15 | R$ 83 |
| **TOTAL MENSAL** | | **~$7.179** | **~R$ 39.486** |

**Custo Anual**: **R$ 473.832**

#### Recursos Premium Adicionais
- **Azure AI Services** (GPT-4, OCR, etc): +$500-2000/mês
- **Azure Sentinel** (SIEM): +$200-500/mês
- **Azure DevOps** (CI/CD avançado): +$100/mês
- **Consultoria Microsoft**: +$2.000-5.000/mês

#### SLA e Disponibilidade
- **Uptime SLA**: 99.99% (multi-zone)
- **RTO**: < 1 hora
- **RPO**: < 5 minutos
- **Suporte**: Azure Premier (24/7)

---

## Comparativo de Custos

### Resumo Anual (Primeiro Ano)

| Cenário | Local | Azure | Diferença |
|---------|-------|-------|-----------|
| **Pequeno (50 pac/dia)** | R$ 7.336 | R$ 6.684 | Azure -9% mais barato |
| **Médio (200 pac/dia)** | R$ 24.554 | R$ 46.020 | Local 47% mais barato |
| **Grande (1000 pac/dia)** | R$ 150.732 | R$ 473.832 | Local 68% mais barato |

### Resumo Anual (Terceiro Ano - Sem investimento inicial)

| Cenário | Local | Azure | Diferença |
|---------|-------|-------|-----------|
| **Pequeno** | R$ 3.936 | R$ 6.684 | Local 41% mais barato |
| **Médio** | R$ 14.304 | R$ 46.020 | Local 69% mais barato |
| **Grande** | R$ 69.732 | R$ 473.832 | Local 85% mais barato |

### Breakeven Point (Ponto de Equilíbrio)

#### Cenário Pequeno
- **Investimento Local**: R$ 3.400
- **Diferença Mensal**: Azure mais caro em R$ 229/mês
- **Breakeven**: Nunca (Azure sempre mais caro após 1 ano)

#### Cenário Médio
- **Investimento Local**: R$ 10.250
- **Diferença Mensal**: Azure mais caro em R$ 2.643/mês
- **Breakeven**: ~4 meses

#### Cenário Grande
- **Investimento Local**: R$ 81.000
- **Diferença Mensal**: Azure mais caro em R$ 33.700/mês
- **Breakeven**: ~2.4 meses

---

## Requisitos Técnicos

### Requisitos Mínimos de Rede

| Cenário | Usuários Simultâneos | Banda Mínima | Banda Recomendada |
|---------|---------------------|--------------|-------------------|
| Pequeno | 5-10 | 10 Mbps | 50 Mbps |
| Médio | 20-50 | 50 Mbps | 300 Mbps |
| Grande | 100-200 | 300 Mbps | 1 Gbps |

### Requisitos de Disponibilidade

| Tipo | Uptime | Downtime/ano | Cenário |
|------|--------|--------------|---------|
| Básico | 99% | 3.65 dias | Clínicas pequenas, horário comercial |
| Bom | 99.5% | 1.83 dias | Clínicas médias |
| Ótimo | 99.9% | 8.76 horas | Hospitais |
| Premium | 99.99% | 52.6 minutos | Hospitais críticos, emergências |

### Crescimento de Armazenamento (Estimativa)

| Tipo de Dado | Tamanho Médio | Por Paciente/Ano |
|--------------|---------------|------------------|
| Ficha cadastral | 5 KB | 5 KB |
| Prontuário (texto) | 50 KB | 200 KB |
| Prescrições (PDF) | 100 KB | 500 KB |
| Exames (PDF) | 500 KB | 2 MB |
| Imagens médicas (JPEG) | 2 MB | 10 MB |
| DICOM (raio-X) | 10 MB | 50 MB |
| **Total (sem imagens)** | | **~3 MB** |
| **Total (com imagens)** | | **~60 MB** |

**Estimativa de Crescimento**:
- Clínica Pequena (50 pac/dia): ~50GB/ano (sem imagens) | ~900GB/ano (com imagens)
- Clínica Média (200 pac/dia): ~200GB/ano (sem imagens) | ~3.6TB/ano (com imagens)
- Hospital Grande (1000 pac/dia): ~1TB/ano (sem imagens) | ~18TB/ano (com imagens)

---

## Backup e Disaster Recovery

### Estratégia 3-2-1

**3 cópias** dos dados → **2 mídias diferentes** → **1 cópia offsite**

#### Implementação Local

| Tipo | Frequência | Retenção | Mídia | Custo |
|------|-----------|----------|-------|-------|
| Banco de Dados | Diário (automático) | 30 dias | SSD local | Incluído |
| Incremental | Diário | 7 dias | HDD local | Incluído |
| Completo | Semanal | 12 semanas | HDD externo | R$ 300 (único) |
| Offsite | Semanal | 12 meses | Google Drive | R$ 13-40/mês |

**Script de Backup Automático**: Incluído no sistema (`scripts/backup-complete.sh`)

#### Implementação Azure

| Tipo | Frequência | Retenção | Recurso | Custo (incluído na tabela) |
|------|-----------|----------|---------|----------------------------|
| PostgreSQL | Contínuo (PITR) | 35 dias | Azure Backup | Sim |
| Blob Storage | Versionamento | 90 dias | Soft Delete | Sim |
| VM Snapshots | Diário | 30 dias | Azure Backup | Sim |
| Geo-replication | Contínuo | - | GRS/ZRS | Sim |

### RPO e RTO

| Cenário | RPO (Perda Máxima) | RTO (Tempo Recuperação) |
|---------|-------------------|------------------------|
| Local Básico | 24 horas | 4-8 horas |
| Local Bom | 1 hora | 1-2 horas |
| Local Ótimo | 15 minutos | 30 minutos |
| Azure Básico | 1 hora | 2-4 horas |
| Azure Intermediário | 5 minutos | 1 hora |
| Azure Premium | 1 minuto | 15 minutos |

---

## Recomendações Finais

### Quando escolher Implementação Local:

✅ **Recomendado para**:
- Clínicas/hospitais com volume médio a alto (> 100 pacientes/dia)
- Orçamento para investimento inicial disponível
- Equipe técnica local ou contrato de suporte
- Preocupação com custos recorrentes de longo prazo
- Necessidade de controle total dos dados
- Internet instável ou cara

### Quando escolher Azure Cloud:

✅ **Recomendado para**:
- Clínicas pequenas iniciando operação (< 50 pacientes/dia)
- Sem orçamento para investimento inicial
- Sem equipe técnica local
- Necessidade de alta disponibilidade (99.9%+)
- Crescimento rápido esperado
- Múltiplas unidades/filiais
- Compliance rigoroso (certificações Azure)

### Solução Híbrida (Recomendação Intermediária):

Para clínicas médias, uma solução híbrida pode ser ideal:

1. **Servidor Local**: Aplicação + banco de dados
2. **Azure Backup**: Backup offsite automatizado
3. **Azure CDN**: Entrega rápida de assets estáticos
4. **Azure AI**: Serviços de IA quando necessário

**Custo Estimado**: R$ 15.000-20.000 (primeiro ano) | R$ 8.000-12.000 (anos seguintes)

---

## Checklist de Implementação

### Pré-Implementação
- [ ] Levantamento de requisitos (usuários, volume, dados sensíveis)
- [ ] Escolha da estratégia (local, cloud, híbrida)
- [ ] Aprovação de orçamento
- [ ] Contratação de equipe/consultoria (se necessário)
- [ ] Planejamento de rede e infraestrutura

### Implementação
- [ ] Aquisição/provisionamento de recursos
- [ ] Configuração de rede (VPN, firewall, segmentação)
- [ ] Instalação do sistema (Docker Compose ou Azure)
- [ ] Configuração de banco de dados e backups
- [ ] Configuração de certificados SSL/TLS
- [ ] Testes de carga e performance
- [ ] Testes de backup e recuperação

### Pós-Implementação
- [ ] Treinamento de usuários
- [ ] Documentação de processos
- [ ] Configuração de monitoramento e alertas
- [ ] Estabelecimento de SLA e suporte
- [ ] Planejamento de crescimento e escala
- [ ] Auditorias periódicas de segurança

---

## Contato e Suporte

Para dúvidas sobre implementação, entre em contato:
- **Documentação**: [GitHub - HealthCare](https://github.com/rpzk/HealthCare)
- **Issues**: [GitHub Issues](https://github.com/rpzk/HealthCare/issues)

---

**Última Atualização**: Fevereiro 2026  
**Versão**: 1.0  
**Autor**: HealthCare System Team

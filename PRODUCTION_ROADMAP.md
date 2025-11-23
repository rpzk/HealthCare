# 🚀 Roadmap de Infraestrutura para Produção (Enterprise Grade)

Este documento detalha a arquitetura necessária para rodar o HealthCare em um ambiente de produção robusto, escalável e seguro.

## 🏗️ Visão Geral da Arquitetura

Em produção, abandonamos a abordagem "monolítica" (tudo no mesmo servidor) e adotamos serviços gerenciados e clusters.

```mermaid
graph TD
    User[Usuário] --> LB[Load Balancer / CDN]
    LB --> AppCluster[Cluster Kubernetes/Docker Swarm (Next.js)]
    
    subgraph "Camada de Dados"
        AppCluster --> DB[(Managed PostgreSQL)]
        AppCluster --> Redis[(Managed Redis)]
        AppCluster --> S3[Object Storage (Uploads)]
    end
    
    subgraph "Camada de IA (GPU)"
        AppCluster --> AI_LB[Internal LB]
        AI_LB --> Whisper[Cluster STT (Whisper)]
        AI_LB --> LLM[Cluster LLM (Ollama/vLLM)]
    end
```

---

## 1. Requisitos de Hardware e Serviços

### A. Camada de Aplicação (Next.js)
Não exige GPU, mas exige CPU rápida para SSR (Server Side Rendering).
*   **Recomendação:** 2x Instâncias (mínimo) para redundância.
*   **Spec:** 2 vCPU, 4GB RAM cada.
*   **Tecnologia:** Kubernetes (EKS/AKS) ou AWS ECS / Google Cloud Run.

### B. Camada de Dados (Persistência)
Nunca hospede o banco de dados na mesma máquina da aplicação em produção crítica.
*   **Banco de Dados:** AWS RDS para PostgreSQL ou Google Cloud SQL.
    *   *Spec:* db.t3.medium (ou superior), Multi-AZ (para alta disponibilidade).
*   **Cache:** AWS ElastiCache (Redis) ou Redis Cloud.
*   **Arquivos (Uploads):** AWS S3 ou Google Cloud Storage.
    *   *Nota:* O código atual salva em disco local (`/uploads`). Para produção distribuída, é necessário refatorar para usar S3.

### C. Camada de IA (O Grande Desafio)
Rodar IA localmente exige GPUs dedicadas. CPU pura ficará lenta com múltiplos usuários.
*   **Opção 1 (Self-Hosted Robusto):**
    *   Servidor com GPU NVIDIA (T4 ou A10).
    *   *Provedores:* AWS (g4dn.xlarge), Lambda Labs, ou Hetzner (servidores dedicados com GPU).
*   **Opção 2 (Serverless AI - Recomendado para escalar):**
    *   Substituir Ollama local por API externa (OpenAI Enterprise, Anthropic ou Azure OpenAI) para garantir SLA.
    *   Substituir Whisper local por Deepgram ou OpenAI Whisper API.

---

## 🗺️ Roadmap de Implementação

### Fase 1: Preparação do Código (Semana 1)
- [ ] **Externalizar Uploads:** Alterar o sistema de upload para usar AWS S3 ou MinIO (atualmente grava em disco local, o que quebra em clusters).
- [ ] **Configuração de Logs:** Enviar logs para Datadog ou CloudWatch (não apenas console).
- [ ] **Stateless:** Garantir que nenhuma sessão fique na memória RAM (já usamos JWT, então ok).

### Fase 2: Infraestrutura Core (Semana 2)
- [ ] Provisionar **Managed PostgreSQL** (com backups automáticos).
- [ ] Provisionar **Managed Redis**.
- [ ] Configurar **CI/CD** (GitHub Actions) para buildar o Docker e enviar para um Registry (ECR/Docker Hub).

### Fase 3: Deploy da Aplicação (Semana 3)
- [ ] Configurar **Load Balancer** (NGINX ou ALB da AWS) com SSL/TLS automático.
- [ ] Subir o cluster de aplicação (Next.js) apontando para o banco gerenciado.
- [ ] Configurar Auto-scaling (subir mais containers se a CPU passar de 70%).

### Fase 4: Infraestrutura de IA (Semana 4)
- [ ] Decisão: GPU Própria vs API.
    - *Se GPU Própria:* Provisionar instância G4dn na AWS, instalar Drivers NVIDIA, Docker e rodar os containers `ollama` e `stt` lá. Expor apenas para a rede interna (VPC).

### Fase 5: Segurança e Observabilidade (Semana 5)
- [ ] **WAF (Web Application Firewall):** Proteger contra ataques DDOS e SQL Injection.
- [ ] **Monitoramento:** Dashboards no Grafana/Prometheus monitorando latência da IA e saúde do banco.
- [ ] **Backup:** Testar restore do banco de dados.

---

## 💰 Estimativa de Custo Mensal (Aproximada - AWS)

| Serviço | Spec | Custo Est. (USD) |
|---------|------|------------------|
| Load Balancer | ALB | $20 |
| App Compute | 2x t3.medium (ECS) | $60 |
| Database | RDS Postgres (db.t3.medium) | $60 |
| Redis | ElastiCache (cache.t3.micro) | $15 |
| Storage | S3 (100GB) | $5 |
| **IA (GPU)** | **g4dn.xlarge (On-demand)** | **$380** |
| **Total** | | **~$540/mês** |

*Dica: Para reduzir o custo da IA, use instâncias "Spot" (até 70% desconto) ou migre para APIs pagas por uso.*

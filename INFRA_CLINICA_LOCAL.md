# 🏥 Infraestrutura Física para Clínica (On-Premise)

Este guia detalha o hardware necessário para rodar o HealthCare localmente em uma clínica de pequeno/médio porte, garantindo performance para IA e segurança dos dados.

## 🖥️ O Servidor ("A Máquina Principal")

Para rodar IA (Llama 3 + Whisper) com agilidade para múltiplos médicos simultâneos, você não precisa de um servidor de rack barulhento. Uma **Workstation (Estação de Trabalho)** robusta é o ideal.

### Especificações Recomendadas

| Componente | Recomendação | Por que? |
|------------|--------------|----------|
| **Processador** | Intel Core i7 (12ª/13ª gen) ou Ryzen 7 (5000/7000) | O Next.js e o Banco de Dados precisam de clock alto para responder rápido às requisições da interface. |
| **Memória RAM** | **64 GB DDR4/DDR5** | Essencial. O Docker vai consumir uns 8GB, o Banco uns 4GB, mas a IA precisa de muita RAM sobrando para cache e operação fluida. |
| **Placa de Vídeo (GPU)** | **NVIDIA RTX 3060 (12GB)** ou **RTX 4060 Ti (16GB)** | **O componente mais crítico.** A IA roda na GPU. Você precisa de VRAM (memória de vídeo). Com 12GB+, você roda o modelo de linguagem e a transcrição de áudio simultaneamente sem engasgos. |
| **Armazenamento (OS)** | 1TB NVMe SSD (Gen 4) | Para o sistema operacional e containers Docker. |
| **Armazenamento (Dados)** | **2x 2TB SSD ou HDD em RAID 1** | **Segurança.** RAID 1 espelha os dados. Se um disco queimar, o outro assume e a clínica não para. |
| **Fonte** | 750W Gold (Corsair/XPG) | Estabilidade para aguentar a GPU rodando 24/7. |

**💰 Custo Estimado do Servidor:** R$ 6.000 - R$ 9.000 (dependendo das peças).

---

## ⚡ Energia e Rede (Infraestrutura de Apoio)

Não adianta ter um servidor bom se a energia cair ou a rede for lenta.

1.  **Nobreak (UPS) Senoidal (Obrigatório):**
    *   **Potência:** Mínimo 1500VA (recomendado 2200VA).
    *   **Tipo:** Senoidal Puro (para não estragar a fonte do servidor).
    *   *Função:* Segurar o servidor ligado por tempo suficiente para desligar corretamente em caso de queda de luz, evitando corrupção do banco de dados.

2.  **Rede Interna (LAN):**
    *   **Switch:** Gigabit Ethernet (10/100/1000).
    *   **Cabeamento:** Cabos CAT6 para os consultórios (muito mais estável que Wi-Fi para acessar prontuários pesados).
    *   **Wi-Fi:** Roteador Wi-Fi 6 (AX) para tablets/celulares dos médicos.

---

## 🛡️ Estratégia de Backup (A Regra 3-2-1)

Dados médicos são críticos. Ter RAID 1 no servidor protege contra quebra de disco, mas não contra roubo, incêndio ou vírus (Ransomware).

1.  **Cópia Local (Rápida):**
    *   Um HD Externo USB ligado ao servidor.
    *   Script automático fazendo backup do banco (`pg_dump`) toda madrugada.

2.  **Cópia Externa (Segurança):**
    *   Backup criptografado para nuvem (AWS S3 Glacier, Google Drive ou Backblaze).
    *   *Custo:* Muito baixo (centavos por GB) e salva a clínica em caso de desastre físico.

---

## 🚀 Como Configurar o Software

Nesta máquina física, você usará o **Docker** (igual ao guia do Umbrel, mas com suporte a GPU).

1.  Instale **Ubuntu Server 22.04 LTS** (ou 24.04). É mais estável e leve que Windows para servidores.
2.  Instale os **Drivers NVIDIA** proprietários.
3.  Instale o **NVIDIA Container Toolkit** (permite que o Docker use a placa de vídeo).
4.  No `docker-compose.prod.yml`, certifique-se de que a seção `deploy` do Ollama está ativa para usar a GPU:

```yaml
  ollama:
    # ...
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: all
              capabilities: [gpu]
```

## 👨‍⚕️ Experiência do Médico

Com essa infraestrutura:
*   **Login:** Instantâneo.
*   **Carregamento de Prontuário:** < 1 segundo.
*   **IA (Resumo/Diagnóstico):** Respostas em 2 a 5 segundos (graças à GPU RTX).
*   **Transcrição de Voz:** Quase tempo real.

---

## ✅ Checklist de Compra

- [ ] Processador i7/Ryzen 7
- [ ] 64GB RAM
- [ ] Placa Mãe compatível
- [ ] GPU NVIDIA RTX 3060 12GB (Mínimo)
- [ ] SSD NVMe 1TB (Sistema)
- [ ] 2x HD/SSD 2TB (Dados - RAID 1)
- [ ] Fonte 750W Real
- [ ] Gabinete bem ventilado
- [ ] Nobreak Senoidal 1500VA+

# ☂️ Guia de Instalação no UmbrelOS (MiniPC)

Este guia explica como rodar o HealthCare Medical Records no seu UmbrelOS (ou qualquer servidor Linux caseiro rodando Docker).

## Pré-requisitos

1. Acesso SSH ao seu Umbrel (`ssh umbrel@umbrel.local` ou IP).
2. Git instalado no Umbrel (geralmente já vem, ou `sudo apt install git`).

## Passo a Passo

### 1. Acessar o Umbrel via SSH

Abra seu terminal (PowerShell ou Terminal) e conecte-se:

```bash
ssh umbrel@umbrel.local
# Senha padrão geralmente é a mesma do dashboard web
```

### 2. Clonar o Repositório

Navegue para uma pasta de projetos (ex: `~/app-data` ou crie uma):

```bash
mkdir -p ~/projects
cd ~/projects
git clone https://github.com/rpzk/HealthCare.git
cd HealthCare
```

### 3. Configurar Variáveis de Ambiente

Crie o arquivo `.env` baseado no exemplo:

```bash
cp .env.example .env
nano .env
```

**Ajustes importantes para MiniPC:**
- `POSTGRES_PASSWORD`: Defina uma senha segura.
- `NEXTAUTH_SECRET`: Gere uma string aleatória (ex: `openssl rand -base64 32`).
- `NEXTAUTH_URL`: Mude para `http://umbrel.local:3000` ou o IP do seu Umbrel (ex: `http://192.168.1.100:3000`).
- `UMBREL_IP`: Adicione esta variável com o IP do seu Umbrel se necessário.
- `STT_MODEL`: Mude para `tiny` ou `base` se seu MiniPC for lento. O padrão `medium` pode ser pesado.
- `OLLAMA_MODEL`: `llama3` ou `phi3` (phi3 é mais leve e rápido em CPU).

### 4. Iniciar a Aplicação (Modo Otimizado para CPU)

Criamos um arquivo especial `docker-compose.umbrel.yml` que remove a exigência de GPU NVIDIA e ajusta timeouts para hardware mais modesto.

```bash
docker compose -f docker-compose.umbrel.yml up -d --build
```

*Nota: A primeira vez vai demorar alguns minutos para baixar as imagens e compilar o app.*

### 5. Baixar Modelos de IA

Após os containers subirem, você precisa baixar o modelo de IA no Ollama:

```bash
# Entre no container do Ollama
docker exec -it healthcare-ollama ollama pull llama3
# Ou se escolheu phi3 no .env
docker exec -it healthcare-ollama ollama pull phi3
```

### 6. Acessar

Abra no navegador: `http://umbrel.local:3000` (ou use o IP).

## 💡 Dicas de Performance para MiniPC

- **Memória RAM:** O sistema completo precisa de pelo menos 8GB de RAM (ideal 16GB) para rodar IA + Banco + App confortavelmente.
- **Modelo de Voz (Whisper):** Se a transcrição de áudio estiver lenta, mude `STT_MODEL` no `.env` para `tiny`.
- **Modelo de Texto (Ollama):** O modelo `phi3` é muito mais rápido em CPU que o `llama3` e consome menos RAM.

## Troubleshooting

Se algo der errado, verifique os logs:

```bash
docker compose -f docker-compose.umbrel.yml logs -f app
```

# 🤖 Configuração do Ollama para IA Local

Este guia explica como configurar e utilizar o Ollama para fornecer capacidades de IA local ao sistema HealthCare, eliminando a dependência de serviços de IA em nuvem e protegendo a privacidade dos dados.

## 📋 O que é o Ollama?

[Ollama](https://ollama.com/) é uma ferramenta de código aberto que permite executar modelos de linguagem de grande porte (LLMs) localmente em seu próprio hardware. Isso oferece várias vantagens:

- **Privacidade**: Os dados nunca saem do seu ambiente
- **Sem custos de API**: Nenhuma taxa por token ou limite de uso
- **Controle total**: Você decide quais modelos usar e como configurá-los
- **Operação offline**: Funciona sem acesso à internet

## 🚀 Modelos Suportados

O HealthCare está configurado para usar o modelo `llama3` por padrão, mas você pode escolher qualquer um dos modelos disponíveis na [biblioteca do Ollama](https://ollama.com/library), incluindo:

- `llama3` - Recomendado para uso geral (menor e mais rápido)
- `llama3:8b` - Boa combinação de tamanho e qualidade
- `llama3:70b` - Melhor qualidade (requer mais recursos)
- `mistral` - Bom equilíbrio entre eficiência e qualidade
- `phi` - Modelo leve com bom desempenho
- `gemma` - Modelo alternativo da Google
- `llama2` - Modelos anteriores (se preferir)

## 💻 Requisitos de Hardware

Para executar o Ollama eficientemente:

- **CPU**: Mínimo 4 núcleos, recomendado 8+ núcleos
- **RAM**: Mínimo 8GB, recomendado 16GB+
- **GPU**: Opcional, mas recomendado para melhor desempenho (NVIDIA com CUDA)
- **Armazenamento**: 10-50GB dependendo dos modelos instalados

## 🔧 Configuração

### 1. Variáveis de Ambiente

O HealthCare já está configurado para usar o Ollama. No arquivo `.env`:

```env
# Ollama (IA Local)
OLLAMA_URL=http://ollama:11434  # URL do serviço Ollama no Docker
OLLAMA_MODEL=llama3  # Modelo a ser usado
```

### 2. Inicialização

O script `start-with-ollama.sh` já configura automaticamente o ambiente:

```bash
# Iniciar tudo com um comando
npm run start:ollama

# Ou para incluir dados de exemplo
npm run start:ollama:seed
```

### 3. Trocando de Modelo

Para usar um modelo diferente:

1. Edite o arquivo `.env` e atualize o valor de `OLLAMA_MODEL`
2. Execute: `docker-compose exec ollama ollama pull nome-do-modelo`
3. Reinicie a aplicação: `docker-compose restart app`

## 🔍 Solução de Problemas

### Modelo não está carregando

Verifique se o modelo foi baixado corretamente:

```bash
docker-compose exec ollama ollama list
```

Se o modelo não aparece, baixe-o manualmente:

```bash
docker-compose exec ollama ollama pull llama3
```

### Desempenho lento

- Modelos menores (como `phi:2.7b` ou `llama3:8b`) são mais rápidos
- Considere habilitar suporte a GPU na configuração do Docker
- Aumente a memória disponível para o Docker

## 🛡️ Segurança e Privacidade

Com o Ollama, todos os dados processados pela IA permanecem em seu ambiente local, eliminando os riscos associados a serviços de IA em nuvem como:

- Vazamento de dados sensíveis
- Treinamento do modelo em dados confidenciais
- Dependência de conectividade com internet
- Custos variáveis baseados em uso

Esta abordagem está em total conformidade com as melhores práticas de privacidade e segurança de dados médicos.

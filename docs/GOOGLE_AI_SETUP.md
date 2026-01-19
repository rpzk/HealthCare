# 🤖 Como Configurar o Google AI Studio (Gemini)

Este guia irá ajudá-lo a configurar o Google AI Studio para usar as funcionalidades de IA no sistema de prontuário eletrônico.

## 📋 Pré-requisitos

- Conta Google ativa
- Acesso ao Google AI Studio

## 🚀 Passo a Passo

### 1. Acesse o Google AI Studio
Vá para: [https://makersuite.google.com/app/apikey](https://makersuite.google.com/app/apikey)

### 2. Faça Login
- Entre com sua conta Google
- Aceite os termos de serviço se necessário

### 3. Crie uma API Key
- Clique em **"Create API Key"**
- Selecione um projeto do Google Cloud (ou crie um novo)
- A chave será gerada automaticamente

### 4. Copie sua API Key
- Copie a chave gerada (exemplo: `AIzaSyAbc123def456ghi789jkl012mno345pqr678`)
- **⚠️ CRÍTICO**: Guarde essa chave em local seguro - ela não será mostrada novamente
- **🔐 NUNCA** commit a chave real no Git/GitHub
- **🚨 IMPORTANTE**: Se a chave for exposta, revogue-a imediatamente no Google Console

### 5. Configure no Sistema

#### Opção 1: Arquivo .env.local
```bash
# Crie ou edite o arquivo .env.local
cp .env.example .env.local

# Adicione sua chave
GOOGLE_AI_API_KEY="AIzaSyAbc123def456ghi789jkl012mno345pqr678"
```

#### Opção 2: Docker Compose
Edite o arquivo `docker-compose.yml`:
```yaml
environment:
  GOOGLE_AI_API_KEY: "AIzaSyAbc123def456ghi789jkl012mno345pqr678"
```

### 6. Teste a Integração
1. Reinicie o servidor: `npm run dev`
2. Abra o sistema em `http://localhost:3000`
3. Clique no botão **"Assistente IA"** no header
4. Faça uma pergunta para testar

## 🔧 Modelos Disponíveis

O sistema está configurado para usar o **Gemini 1.5 Flash**, que oferece:

- ⚡ **Resposta rápida** - Ideal para chat em tempo real
- 🧠 **Alta qualidade** - Compreensão avançada de contexto médico
- 💰 **Custo efetivo** - Ótimo custo-benefício para aplicações médicas
- 🌐 **Multilíngue** - Suporte completo ao português

## 💡 Funcionalidades de IA Disponíveis

### 1. 🔍 Análise de Sintomas
```javascript
// Exemplo de uso
const response = await MedicalAIService.analyzeSymptoms(
  ['febre', 'dor de cabeça', 'fadiga'],
  'Paciente hipertenso, 45 anos',
  'Sintomas há 3 dias'
)
```

### 2. 💊 Verificação de Interações Medicamentosas
```javascript
const interactions = await MedicalAIService.checkDrugInteractions([
  'Metformina', 'Captopril', 'Sinvastatina'
])
```

### 3. 📄 Resumo Médico Automático
```javascript
const summary = await MedicalAIService.generateMedicalSummary(
  patientData, consultations
)
```

## 🔒 Segurança e Privacidade

### ✅ Boas Práticas Implementadas:
- **Nunca envie dados sensíveis** identificáveis do paciente
- **Use apenas dados clínicos** necessários para análise
- **Implemente anonimização** automática de dados
- **Configure logs de auditoria** para todas as interações de IA

### 🛡️ Compliance LGPD:
- Dados são processados temporariamente
- Nenhum dado é armazenado nos servidores do Google permanentemente
- Pacientes podem solicitar exclusão de dados
- Sistema de auditoria completo

## 🔧 Solução de Problemas

### Erro: "API Key inválida"
```bash
# Verifique se a chave está correta
echo $GOOGLE_AI_API_KEY

# Regenere a chave no Google AI Studio se necessário
```

### Erro: "Cota excedida"
- Verifique seus limites no [Google Cloud Console](https://console.cloud.google.com/apis/api/generativeai.googleapis.com/quotas)
- Considere upgrade do plano se necessário

### Erro: "Modelo não encontrado"
```javascript
// Verifique se o modelo está correto no arquivo ai-service.ts
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
```

## 📊 Monitoramento e Métricas

### Acompanhe o uso da API:
1. Acesse o [Google Cloud Console](https://console.cloud.google.com)
2. Vá para **APIs & Services > Dashboard**
3. Selecione **Generative AI API**
4. Monitore:
   - Número de requests
   - Latência das respostas
   - Erros e falhas
   - Custo por período

## 💰 Custos

### Modelo Gemini 1.5 Flash (Preços de referência):
- **Input**: $0.075 por 1M tokens
- **Output**: $0.30 por 1M tokens
- **Contexto gratuito**: Primeiros 15 requests/minuto

### Estimativa de Uso Médico:
- **Análise de sintoma**: ~500 tokens = $0.0004
- **Verificação de interações**: ~300 tokens = $0.0002
- **Resumo médico**: ~800 tokens = $0.0006

## 📞 Suporte

### Recursos Adicionais:
- 📖 [Documentação do Google AI](https://ai.google.dev/docs)
- 💬 [Stack Overflow - google-generative-ai](https://stackoverflow.com/questions/tagged/google-generative-ai)
- 🆘 [Suporte Técnico Google Cloud](https://cloud.google.com/support)

---

**🎉 Parabéns! Seu sistema médico agora está equipado com IA avançada do Google!**

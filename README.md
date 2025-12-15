# 🏥 Sistema de Prontuário Eletrônico Moderno

Um sistema completo de prontuário eletrônico com inteligência artificial embarcada, desenvolvido com as mais modernas tecnologias web.

📚 **Índice & Tracking:**
- [Índice Completo](docs/DOCUMENTATION_INDEX.md)
- [Features Não Implementadas](docs/INCOMPLETE_FEATURES.md) - O que ainda falta

## ✨ Características Principais

### 🤖 Inteligência Artificial Integrada
- **Assistente Médico IA**: Suporte inteligente para diagnósticos e tratamentos
- **Análise de Sintomas**: IA analisa sintomas e sugere possíveis diagnósticos
- **Verificação de Interações Medicamentosas**: Detecta automaticamente interações entre medicamentos
- **Resumos Médicos Automatizados**: Gera resumos inteligentes do histórico do paciente
- **Sugestões de Exames**: Recomendações baseadas em sintomas e histórico
- **100% Local com Ollama**: Toda a IA roda localmente sem custos ou envio de dados para a nuvem

### 👩‍⚕️ Funcionalidades Médicas
- **Gestão Completa de Pacientes**: Cadastro, histórico e acompanhamento
- **Sistema de Consultas**: Agendamento e registro detalhado de consultas
- **Prontuário Eletrônico**: Registro digital completo e seguro
- **Prescrições Digitais**: Sistema de prescrição com validação automática
- **Sinais Vitais**: Registro e monitoramento de sinais vitais
- **Exames e Resultados**: Gestão completa de solicitações e resultados
- **Relatórios Médicos**: Dashboard com métricas e relatórios detalhados

### 🔒 Segurança e Compliance
- **Autenticação Robusta**: Sistema seguro de login e controle de acesso
- **Criptografia de Dados**: Proteção total dos dados médicos sensíveis
- **Auditoria Completa**: Log de todas as ações no sistema
- **Backup Automático**: Sistema de backup e recuperação de dados
- **Compliance LGPD**: Adequação às normas de proteção de dados

## 🛠️ Stack Tecnológica

### Frontend
- **Next.js 14** - Framework React com App Router
- **TypeScript** - Tipagem estática para maior segurança
- **Tailwind CSS** - Framework CSS utilitário moderno
- **Radix UI** - Componentes acessíveis e customizáveis
- **Lucide React** - Biblioteca de ícones moderna

### Backend
- **Node.js** - Runtime JavaScript server-side
- **Prisma ORM** - ORM moderno para banco de dados
- **NextAuth.js** - Autenticação completa e segura
- **Zod** - Validação de esquemas TypeScript-first

### Banco de Dados
- **PostgreSQL** - Banco de dados relacional robusto
- **Redis** - Cache e sessões (opcional)

### Inteligência Artificial
- **Ollama** - Modelos de linguagem avançados executados localmente
- **Análise de Texto Médico** - Processamento de linguagem natural especializada
- **Privacidade Total** - Dados sensíveis nunca saem do seu ambiente

### DevOps e Deploy
- **Docker** - Containerização da aplicação
- **Docker Compose** - Orquestração de containers
- **GitHub Actions** - CI/CD automatizado (configuração disponível)

## 🚀 Como Executar

### ⚡ Início rápido (local, com script)
```bash
# 1) Copiar .env de exemplo (o script faz isso se faltar)
# 2) Subir serviços, aplicar schema e seed automaticamente
chmod +x scripts/start-with-ollama.sh
./scripts/start-with-ollama.sh

# Para iniciar com dados de exemplo
./scripts/start-with-ollama.sh --seed
```

Após concluir, acesse: `http://localhost:3000` (ou o IP da sua máquina). Login inicial: `admin@healthcare.com` / `admin123` (altere após o primeiro acesso).

### Pré-requisitos
- Node.js 18+ 
- Docker e Docker Compose
- Conta Google AI Studio (para funcionalidades de IA)

### 1. Clone o Repositório
```bash
git clone https://github.com/seu-usuario/healthcare.git
cd healthcare
```

### 2. Configure as Variáveis de Ambiente
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Database
DATABASE_URL="postgresql://healthcare:healthcare123@localhost:5432/healthcare_db"

# NextAuth
NEXTAUTH_SECRET="seu-secret-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Ollama (IA Local)
OLLAMA_URL="http://ollama:11434"
OLLAMA_MODEL="llama3"
```

**📋 Para configurar e utilizar outros modelos do Ollama:** [Documentação do Ollama](https://ollama.com/library)

### 3. Executar com Docker (Recomendado)
```bash
# Iniciar todos os serviços
docker-compose up -d

# Ver logs da aplicação
docker-compose logs -f app
```

### 4. Executar em Desenvolvimento Local
```bash
# Instalar dependências
npm install

# Iniciar banco de dados PostgreSQL
docker-compose up -d postgres

# Executar migrations
npm run db:push

# Popular banco com dados de exemplo
npm run db:seed

# Iniciar aplicação
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`

## 📱 Como Usar o Sistema

### 1. **Login Inicial**
- Email: `admin@healthcare.com`
- Senha: `admin123` (configurar no seed)

### 2. **Dashboard Principal**
- Visão geral de pacientes e consultas
- Estatísticas em tempo real
- Ações rápidas para tarefas comuns

### 3. **Gestão de Pacientes**
- Cadastrar novos pacientes
- Visualizar histórico médico completo
- Busca avançada por múltiplos critérios

### 4. **Assistente de IA**
- Clique no botão "Assistente IA" no header
- Faça perguntas sobre sintomas, diagnósticos ou tratamentos
- Receba sugestões baseadas em IA médica

### 5. **Consultas Médicas**
- Agende novas consultas
- Registre evoluções e exames
- Sistema de lembretes automáticos

## 🧪 Funcionalidades de IA

### Análise de Sintomas
```typescript
// Exemplo de uso da API de IA
const response = await MedicalAIService.analyzeSymptoms(
  ['febre', 'dor de cabeça', 'fadiga'],
  'Paciente hipertenso, 45 anos',
  'Sintomas há 3 dias'
)
```

### Verificação de Interações
```typescript
const interactions = await MedicalAIService.checkDrugInteractions([
  'Metformina', 'Captopril', 'Sinvastatina'
])
```

### Resumo Médico Automático
```typescript
const summary = await MedicalAIService.generateMedicalSummary(
  patientData, consultations
)
```

## 📊 Estrutura do Banco de Dados

O sistema possui um esquema robusto com as seguintes entidades principais:

- **Users** - Médicos e profissionais de saúde
- **Patients** - Pacientes do sistema
- **Consultations** - Consultas médicas
- **MedicalRecords** - Prontuários eletrônicos
- **Prescriptions** - Prescrições médicas
- **ExamRequests** - Solicitações de exames
- **VitalSigns** - Sinais vitais
- **AIInteractions** - Interações com IA
- **Attachments** - Arquivos anexos

## 🔧 Configuração Avançada

### Configurar Diferentes Ambientes
```bash
# Desenvolvimento
npm run dev

# Produção
npm run build
npm run start

# Testes
npm run test
```

### Backup do Banco de Dados
```bash
# Criar backup
docker-compose exec postgres pg_dump -U healthcare healthcare_db > backup.sql

# Restaurar backup
docker-compose exec -T postgres psql -U healthcare healthcare_db < backup.sql
```

## 🧩 Rodar em Umbrel (posteriormente)
- Utilize o mesmo `docker-compose.yml` local com as variáveis definidas em `.env`.
- Ajuste `NEXTAUTH_URL` para `http://SEU_IP_UMBREL:3000`.
- Portas 3000 (app) e 5432/6379 (internas) já estão mapeadas; evite expor Postgres/Redis externamente em produção.
- Para start simplificado no Umbrel: execute o mesmo `scripts/first-start.sh` via shell do mini PC.

## 🚀 Deploy em Produção

### Usando Docker
```bash
# Build da imagem de produção
docker build -t healthcare-app .

# Deploy com Docker Compose
docker-compose -f docker-compose.prod.yml up -d
```

### Usando Vercel (Frontend) + Railway (Backend)
1. Configure as variáveis de ambiente na plataforma
2. Conecte o repositório GitHub
3. Deploy automático em cada push

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Crie um Pull Request

## 📄 Licença

Este projeto está licenciado sob a licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Para questões e suporte:
- 📧 Email: suporte@healthcare.com
- 💬 Issues: [GitHub Issues](https://github.com/seu-usuario/healthcare/issues)
- 📖 Documentação: [Wiki do Projeto](https://github.com/seu-usuario/healthcare/wiki)

## 🎯 Roadmap

### Próximas Funcionalidades
- [ ] App mobile nativo
- [ ] Telemedicina integrada
- [ ] Sistema de notificações push
- [ ] Dashboard para pacientes
- [ ] Integração com laboratórios
- [ ] Relatórios avançados com BI
- [ ] API pública para integrações
- [ ] Sistema de lembretes inteligentes

---

**Desenvolvido com ❤️ para revolucionar o atendimento médico digital**
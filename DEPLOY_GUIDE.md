# Deploy Guide

Guia para deploy do sistema HealthCare em produção e desenvolvimento.

## Passos para Deploy
- Build: npm run build
- Produção: docker compose -f docker-compose.prod.yml up -d --build
- Desenvolvimento: docker compose up -d postgres redis

## Variáveis de Ambiente
- Consulte .env.example para configuração
- Configure SMTP, DATABASE_URL, REDIS_HOST, OLLAMA_URL/MODEL

## Checklist de Produção
- Executar scripts de backup
- Validar configurações de segurança
- Testar endpoints principais

## Troubleshooting
- Verifique logs do Docker
- Consulte README.md para dúvidas comuns

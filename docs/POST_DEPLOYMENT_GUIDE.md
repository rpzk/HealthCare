# 🏥 Guia de Pós-Deployment do HealthCare

Este guia contém instruções para as atividades a serem realizadas após o deployment do sistema HealthCare em produção, incluindo monitoramento, manutenção, e treinamento da equipe.

## 📊 Monitoramento Contínuo

### Ferramentas de Monitoramento

O sistema HealthCare inclui várias ferramentas de monitoramento:

1. **Logs da Aplicação**
   ```bash
   # Visualizar logs em tempo real
   docker-compose -f docker-compose.prod.yml logs -f app
   
   # Logs do banco de dados
   docker-compose -f docker-compose.prod.yml logs -f postgres
   
   # Logs do Ollama
   docker-compose -f docker-compose.prod.yml logs -f ollama
   ```

2. **Métricas do Sistema**
   - Acesse `http://seu-servidor:3000/api/metrics` para métricas em formato Prometheus
   - As métricas incluem:
     - Tempo de resposta da API
     - Taxa de erro
     - Utilização de IA
     - Contagem de sessões ativas

3. **Dashboard de Status**
   - Acesse `http://seu-servidor:3000/system-monitor` (requer login de administrador)
   - Visualize o status de todos os componentes do sistema
   - Monitore a utilização de recursos

4. **Scripts de Monitoramento Automatizado**
   - Scripts automatizados verificam a saúde do sistema a cada 5 minutos
   - Alertas são enviados por email em caso de problemas
   - Logs de monitoramento em `/var/log/healthcare/monitor.log`

### Configuração de Alertas

Os alertas já estão configurados para as seguintes condições:

1. **Alertas de Infraestrutura**
   - Uso de CPU > 90% por mais de 5 minutos
   - Uso de memória > 90%
   - Espaço em disco < 10% disponível
   - Containers parados ou com falhas

2. **Alertas de Aplicação**
   - Taxa de erro da API > 5%
   - Tempo de resposta > 2 segundos
   - Falhas de autenticação consecutivas
   - Erros em operações críticas

3. **Alertas de Banco de Dados**
   - Conexões de banco de dados > 80% do limite
   - Tempo de resposta de consultas > 1 segundo
   - Espaço em disco do PostgreSQL < 15% disponível

Para configurar destinatários adicionais de alertas, edite o arquivo `/usr/local/bin/healthcare-monitor.sh` e atualize a variável `ALERT_EMAIL`.

## 🛠️ Manutenção Regular

### Backups

Os backups são configurados automaticamente:

1. **Backups Diários**
   - Executados automaticamente às 3h da manhã
   - Armazenados em `/var/backups/healthcare/`
   - Rotação automática: mantidos por 7 dias

2. **Restauração de Backup**
   ```bash
   # Restaurar de um backup específico
   cd /opt/healthcare
   docker-compose -f docker-compose.prod.yml exec -T postgres psql -U healthcare healthcare_db < /var/backups/healthcare/healthcare_db_YYYYMMDD_HHMMSS.sql
   ```

3. **Backups Manuais**
   ```bash
   # Backup manual
   cd /opt/healthcare
   ./scripts/healthcare-backup.sh
   ```

### Atualizações

Para atualizar o sistema:

1. **Atualização do Código**
   ```bash
   # No servidor de produção
   cd /opt/healthcare
   git pull origin main
   
   # Reconstruir e reiniciar
   docker-compose -f docker-compose.prod.yml up -d --build
   ```

2. **Atualização do Banco de Dados**
   ```bash
   # Aplicar migrações
   cd /opt/healthcare
   docker-compose -f docker-compose.prod.yml exec app npm run db:migrate:deploy
   ```

3. **Atualização dos Modelos de IA**
   ```bash
   # Atualizar modelo Ollama
   cd /opt/healthcare
   docker-compose -f docker-compose.prod.yml exec ollama ollama pull llama3
   
   # Reiniciar apenas o Ollama
   docker-compose -f docker-compose.prod.yml restart ollama
   ```

### Manutenção Programada

Recomendamos realizar manutenção programada mensalmente:

1. **Verificar atualizações de segurança**
2. **Limpar logs antigos**
3. **Verificar integridade do banco de dados**
4. **Realizar teste de restauração de backup**
5. **Verificar uso de recursos e ajustar se necessário**

## 👩‍💼 Treinamento da Equipe

### Material de Treinamento

Disponibilizamos material de treinamento para diferentes perfis de usuários:

1. **Administradores**
   - Documento completo em `/opt/healthcare/docs/admin-guide.pdf`
   - Vídeos de treinamento em `/opt/healthcare/docs/videos/admin/`
   - Procedimentos de manutenção e troubleshooting

2. **Médicos e Profissionais de Saúde**
   - Guia de uso em `/opt/healthcare/docs/user-guide.pdf`
   - Vídeos de treinamento em `/opt/healthcare/docs/videos/users/`
   - Tutoriais das funcionalidades principais

3. **Suporte Técnico**
   - Documento de procedimentos em `/opt/healthcare/docs/support-guide.pdf`
   - Fluxogramas de resolução de problemas
   - FAQs e problemas comuns

### Sessões de Treinamento Recomendadas

Recomendamos as seguintes sessões de treinamento:

1. **Sessão para Administradores (4 horas)**
   - Visão geral da arquitetura
   - Monitoramento e alertas
   - Procedimentos de backup e restauração
   - Resolução de problemas comuns
   - Gerenciamento de usuários e permissões

2. **Sessão para Médicos (2 horas)**
   - Interface do usuário e navegação
   - Gerenciamento de pacientes e prontuários
   - Uso da IA médica assistencial
   - Prescrições e agendamentos
   - Recursos avançados

3. **Sessão para Suporte Técnico (3 horas)**
   - Estrutura do sistema
   - Logs e diagnóstico
   - Procedimentos de escalação
   - Ferramentas de suporte
   - Atendimento a usuários

### Recursos Online

Disponibilizamos recursos online para referência contínua:

1. **Wiki do Projeto**: `http://seu-servidor:3000/docs`
2. **Base de Conhecimento**: `http://seu-servidor:3000/kb`
3. **Fórum de Suporte**: `http://seu-servidor:3000/forum`

## 📈 Feedback e Melhorias Contínuas

Para garantir que o sistema evolua conforme as necessidades:

1. **Sistema de Feedback**
   - Disponível em `http://seu-servidor:3000/feedback`
   - Os usuários podem enviar sugestões e relatar problemas

2. **Análise de Uso**
   - Relatórios semanais de uso são gerados automaticamente
   - Disponíveis em `http://seu-servidor:3000/admin/analytics`

3. **Reuniões de Retrospectiva**
   - Recomendamos reuniões mensais para discutir:
     - Feedback dos usuários
     - Desempenho do sistema
     - Necessidades emergentes
     - Planejamento de melhorias

## 🆘 Suporte e Contatos

Para questões e suporte:

- **Email**: suporte@healthcare.com
- **Telefone**: (11) 5555-1234
- **Horário**: Segunda a Sexta, 8h às 18h

Em caso de emergências fora do horário comercial:

- **Telefone de Plantão**: (11) 99999-9999
- **Email de Urgência**: emergencia@healthcare.com

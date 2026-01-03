# 🔒 Sistema de Backup Admin UI - Guia Rápido

## ✨ Novidades

Agora os administradores podem fazer backup e restauração de dados **sem usar terminal**:

### Localização
- **Settings → Aba "Backups"** (apenas para ADMIN)

## 📋 Funcionalidades

### ✅ Criar Backup Manual
- Botão: **"Criar Backup Manual Agora"**
- Inclui:
  - ✓ Banco de dados PostgreSQL completo
  - ✓ Certificados digitais (A1, A3, A4) do filesystem
  - ✓ Compressão automática (gzip)
- Tempo: ~30 segundos a 2 minutos (depende do tamanho dos dados)

### 📥 Fazer Download do Backup
- Botão: **Download** (ícone de seta para baixo)
- Arquivo: `healthcare_TIMESTAMP.sql.gz`
- Peso: Varia (tipicamente 50MB-500MB)

### 🔄 Restaurar do Backup
- Botão: **Restaurar** (ícone giratório azul)
- ⚠️ **CUIDADO**: Sobrescreve TODOS os dados atuais
- Requer confirmação com timestamp do backup

### 🗑️ Deletar Backup
- Botão: **Deletar** (ícone lixeira vermelha)
- Libera espaço em disco
- Requer confirmação

### 🔄 Atualizar Lista
- Botão: **"Atualizar"**
- Recarrega lista automaticamente a cada 30 segundos

## 📊 Informações Mostradas

Para cada backup:
- 📄 Nome do arquivo: `healthcare_YYYYMMDDHHMMSS.sql.gz`
- 💾 Tamanho: Formato legível (MB, GB, etc)
- 🕐 Data/Hora: "há 2 horas", "há 1 dia", etc
- 📝 Log: Indica se tem arquivo de log detalhado

## 🔐 Segurança

- ✓ Apenas ADMIN pode acessar (role-based access control)
- ✓ Validação de caminhos (previne directory traversal)
- ✓ Confirmação obrigatória para restauração
- ✓ Logs detalhados de todas as operações
- ✓ Nenhuma senha ou dados sensíveis em log visível

## 🔧 APIs Utilizadas

```
GET    /api/admin/backups                  → Listar backups
POST   /api/admin/backups                  → Criar novo backup
GET    /api/admin/backups/download         → Fazer download
DELETE /api/admin/backups                  → Deletar backup
POST   /api/admin/backups/restore          → Restaurar backup
```

## 📁 Armazenamento

Backups salvos em:
```
/home/umbrel/backups/healthcare/
├── healthcare_20250125143022.sql.gz
├── healthcare_20250125143022.log
├── healthcare_20250124020000.sql.gz
├── healthcare_20250124020000.log
└── ... (histórico)
```

## ⚙️ Backups Automáticos

Continuam acontecendo via systemd:
- ⏰ Horário: 02:00 AM diariamente
- 🔧 Gerenciar: `systemctl status healthcare-backup.timer`
- 📜 Ver logs: `journalctl -u healthcare-backup`

## 💡 Dicas de Uso

### Melhor Prática 1: Backup Antes de Mudanças Grandes
```
1. Entrar em Settings → Backups
2. Clicar "Criar Backup Manual Agora"
3. Fazer a mudança
4. Se der erro, clicar "Restaurar" neste backup
```

### Melhor Prática 2: Armazenamento Externo
```
1. Criar backup
2. Clicar Download
3. Guardar em HD externo ou cloud (AWS S3, Google Drive, etc)
```

### Melhor Prática 3: Verificação Periódica
```
1. Todo mês, revisar os backups listados
2. Verificar tamanho (se muito pequeno, algo errado)
3. Deletar backups muito antigos (mais de 1 ano)
```

## ❌ Problemas Comuns

### "Erro ao criar backup"
- ✓ Verificar espaço em disco: `df -h`
- ✓ Verificar se PostgreSQL está rodando: `docker ps`
- ✓ Verificar logs: `/home/umbrel/backups/healthcare/*.log`

### "Arquivo não encontrado ao restaurar"
- ✓ Fazer download do backup e tentar novamente
- ✓ Verificar permissões: `ls -la /home/umbrel/backups/healthcare/`

### "Restauração demorou muito"
- ✓ Normal para backups grandes (>500MB)
- ✓ Não fechar a página durante restauração
- ✓ Ver progresso nos logs do servidor

## 📞 Suporte

Para problemas avançados, ver:
- [DATABASE_BACKUP_PROCEDURE.md](../DATABASE_BACKUP_PROCEDURE.md) - Procedimentos técnicos
- [BACKUP_QUICK_START.md](../BACKUP_QUICK_START.md) - Guia de início rápido
- Logs: `/home/umbrel/backups/healthcare/*.log`

---

**Última atualização**: 2025-01-25
**Status**: ✅ Sistema pronto para uso

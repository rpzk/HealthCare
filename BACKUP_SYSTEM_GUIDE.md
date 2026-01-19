# Guia Completo do Sistema de Backup

## 📋 Funcionalidades Disponíveis

### 1. Backup Completo (Full Backup)
**O que faz**: Cria um backup completo de todo o sistema
**Inclui**:
- ✅ Banco de dados PostgreSQL completo (todos os dados)
- ✅ Certificados digitais (A1/A3/A4)
- ✅ Configurações do sistema (env, docker-compose, prisma)
- ✅ Manifesto com metadados do backup

**Como usar**:
1. Acesse `/admin/backup`
2. Clique em **"Criar Backup Manual Agora"**
3. Aguarde a criação (aparecerá na lista "Backups Disponíveis")

**Restaurar backup completo**:
1. Na lista "Backups Disponíveis", localize o backup desejado
2. Clique no ícone ⟳ (Restaurar)
3. Confirme a ação (⚠️ SOBRESCREVE todos os dados atuais)
4. Sistema será reiniciado automaticamente

**Status no Google Drive**:
- Badge "Drive OK" = Enviado com sucesso
- Badge "Drive pendente" = Não foi enviado ainda
- Ícone ☁️ = Reenviar manualmente ao Drive

---

### 2. Backups Granulares (Partial Backups)
**O que faz**: Exporta apenas domínios de dados específicos (tabelas estáveis que raramente mudam)

**Domínios disponíveis**:
- ☑️ **Termos** - Termos de uso e políticas
- ☑️ **CID10** - Códigos de doenças (CodeSystem + MedicalCode)
- ☑️ **CIAP2** - Classificação Internacional de Atenção Primária
- ☑️ **Enfermagem** - Códigos de enfermagem
- ☑️ **CBO** - Classificação Brasileira de Ocupações
- ☑️ **Medicamentos** - Catálogo de medicamentos
- ☑️ **Procedimentos** - SIGTAP (procedimentos SUS)
- ☑️ **Fórmulas Magistrais** - Templates de fórmulas

**Como usar**:
1. Acesse `/admin/backup`
2. Na seção "Backups Granulares", marque os domínios desejados
3. Clique em **"Criar backup granular"**
4. Um snapshot será criado em `/app/backups/healthcare/partial_<timestamp>/`

**Restaurar backup granular**:
1. Na lista de "Snapshots", localize o snapshot desejado
2. Clique em **"Restaurar"**
3. Confirme a ação
4. Todos os domínios do snapshot serão restaurados via **upsert** (seguro, não deleta dados)

**Formato de armazenamento**:
- Diretório: `partial_YYYYMMDDHHMMSS/`
- Arquivos JSON por domínio (ex: `terms.json`, `medications.json`)
- Safe restore (upsert, não destrutivo)

---

### 3. Backups por Entidade (Entity Backups)
**O que faz**: Exporta todos os dados relacionados a um paciente ou profissional específico

#### Exportar Paciente
**Inclui**:
- Dados do paciente
- Todas as consultas
- Todas as prescrições
- Requisições de exames
- Atestados médicos
- Encaminhamentos
- Prontuário médico
- Questionários respondidos
- Respostas NPS

**Como usar**:
1. Acesse `/admin/backup`
2. Na seção "Backups por Entidade → Paciente"
3. Informe **ID**, **CPF** ou **Email** do paciente
4. Clique em **"Exportar paciente"**
5. Arquivo JSON será salvo em `/app/backups/healthcare/patient_<timestamp>_<id>.json`

#### Exportar Profissional
**Inclui**:
- Dados do usuário (profissional)
- Consultas realizadas
- Prescrições emitidas
- Requisições de exames
- Atestados emitidos
- Encaminhamentos (origem e destino)
- Prontuários criados
- Questionários enviados
- Respostas NPS

**Como usar**:
1. Acesse `/admin/backup`
2. Na seção "Backups por Entidade → Profissional"
3. Informe **ID**, **Email** ou **CRM** do profissional
4. Clique em **"Exportar profissional"**
5. Arquivo JSON será salvo em `/app/backups/healthcare/professional_<timestamp>_<id>.json`

---

## 🔧 Configuração do Google Drive

### Requisitos
- Service Account (conta de serviço) do Google Cloud
- JSON de credenciais da service account
- **Shared Drive** (Drive compartilhado) - não usar "Meu Drive"!
- Service account adicionada como "Gestor de conteúdo" no Shared Drive

### Configurar
1. Acesse `/admin/backup`
2. Na seção "Google Drive (cópia externa)":
   - **Folder ID**: Cole o ID do Shared Drive (formato: `0ADN9RUdS0VmN...`)
   - **Impersonate** (opcional): Email para delegação de domínio (apenas se usar Google Workspace com DwD)
   - **Service Account JSON**: Cole o JSON completo das credenciais
3. Clique em **"Salvar credenciais"**

### Reenviar backup ao Drive
Se algum backup não foi enviado automaticamente:
1. Localize o backup com badge "Drive pendente"
2. Clique no ícone ☁️ (CloudUpload)
3. Aguarde confirmação de envio

---

## 📂 Estrutura de Arquivos

### Backup Completo
```
/app/backups/healthcare/
├── healthcare_20260117130923.sql.gz      # Dump do PostgreSQL
├── config_20260117130923.tar.gz          # Configs e certificados
├── manifest_20260117130923.json          # Metadados
├── status_20260117130923.json            # Status do envio ao Drive
├── backup_20260117130923.log             # Log do processo
└── rclone_20260117130923.log             # Log do rclone (Drive)
```

### Backup Granular
```
/app/backups/healthcare/partial_20260117131500/
├── terms.json
├── medications.json
├── code_systems_cid10.json
├── medical_codes_cid10.json
├── cbo_groups.json
└── occupations.json
```

### Backup por Entidade
```
/app/backups/healthcare/
├── patient_20260117132000_clxxx.json
└── professional_20260117132100_clyyy.json
```

---

## ⚠️ Avisos Importantes

### Backup Completo
- ⚠️ **Restaurar SOBRESCREVE todos os dados atuais**
- ⚠️ Sistema será reiniciado após restauração
- ✅ Use para disaster recovery
- ✅ Automatizado via cron (diário às 2h AM)

### Backup Granular
- ✅ **Restauração segura** (upsert, não deleta)
- ✅ Use para recarregar catálogos/códigos após atualização falha
- ✅ Não inclui dados transacionais (consultas, prescrições)
- ℹ️ Ideal para dados de referência estáveis

### Backup por Entidade
- ℹ️ Apenas **exportação** (sem restore automático)
- ℹ️ Use para auditoria, LGPD, portabilidade de dados
- ℹ️ Arquivo JSON para análise manual ou integração

### Google Drive
- ⚠️ **Não use "Meu Drive"** - service accounts têm quota zero
- ✅ Use **Shared Drive** (Drive de equipe)
- ✅ Adicione service account como membro com permissão "Gestor de conteúdo"
- ℹ️ Impersonation só para Google Workspace com DwD ativado

---

## 🚀 Exemplos de Uso

### Cenário 1: Disaster Recovery
1. Criar backup completo diário (automático)
2. Verificar envio ao Drive (badge "Drive OK")
3. Em caso de perda de dados: restaurar último backup completo

### Cenário 2: Atualização de Catálogo de Medicamentos
1. Criar backup granular ANTES (marcar "Medicamentos")
2. Executar atualização/importação
3. Se algo der errado: restaurar snapshot granular
4. Upsert restaura versão anterior sem perder outros dados

### Cenário 3: Portabilidade de Dados (LGPD)
1. Paciente solicita exportação dos seus dados
2. Usar "Backup por Entidade → Paciente" com CPF
3. Entregar arquivo JSON ao paciente

### Cenário 4: Auditoria de Profissional
1. Investigação de atividades de um médico
2. Usar "Backup por Entidade → Profissional" com CRM
3. Analisar JSON com todas consultas/prescrições

---

## 🔍 Troubleshooting

### "Nenhum snapshot granular"
- Ainda não foi criado nenhum backup granular
- Crie o primeiro marcando domínios e clicando "Criar backup granular"

### "Drive pendente" mesmo após criar backup
- Verifique configuração do Drive (JSON + Folder ID)
- Confirme que service account foi adicionada ao Shared Drive
- Use botão ☁️ para reenviar manualmente

### Erro ao restaurar backup completo
- Verifique script `/home/umbrel/HealthCare/scripts/restore-database.sh`
- Confirme que arquivo `.sql.gz` existe e não está corrompido
- Veja logs em `/app/backups/healthcare/backup_*.log`

### Erro "Service Accounts do not have storage quota"
- Você está usando "Meu Drive" (pasta pessoal)
- **Solução**: Migre para Shared Drive e adicione service account como membro

---

## 📊 Monitoramento

### Backups Automáticos
- Cron: Diário às 2h AM
- Script: `/home/umbrel/HealthCare/scripts/healthcare-backup.sh`
- Logs: `/app/backups/healthcare/backup_*.log`

### Retenção
- Local: 3 backups mais recentes (limpeza manual ou automática)
- Drive: Todos os backups (histórico completo)

### Logs
- `backup_*.log` - Processo completo de backup
- `rclone_*.log` - Detalhes do envio ao Drive
- `status_*.json` - Status de envio (`googleDriveUploaded: true/false`)

---

## 🛠️ Manutenção

### Limpar backups locais antigos
```bash
docker compose -f docker-compose.prod.yml exec app bash -c '
cd /app/backups/healthcare
ls -t healthcare_*.sql.gz | tail -n +4 | xargs -r rm
ls -t config_*.tar.gz | tail -n +4 | xargs -r rm
ls -t manifest_*.json | tail -n +4 | xargs -r rm
'
```

### Listar snapshots granulares
```bash
docker compose -f docker-compose.prod.yml exec app ls -la /app/backups/healthcare/ | grep partial
```

### Verificar tamanho total de backups
```bash
docker compose -f docker-compose.prod.yml exec app du -sh /app/backups/healthcare/
```

---

## ✅ Checklist de Verificação

- [ ] Backup completo automático funcionando (cron 2h AM)
- [ ] Google Drive configurado (service account + Shared Drive)
- [ ] Último backup mostra "Drive OK"
- [ ] Testado criação de backup granular
- [ ] Testado restauração de backup granular (upsert seguro)
- [ ] Testado exportação de paciente
- [ ] Testado exportação de profissional
- [ ] Retenção local configurada (manter apenas 3 mais recentes)
- [ ] Documentação revisada e atualizada

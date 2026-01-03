# 🔐 Procedimento Seguro de Backup e Migrações

## ⚠️ Princípio Fundamental

**NUNCA usar `prisma migrate reset` em produção!**

Esse comando apaga TODOS os dados. Em vez disso, use:
```bash
bash scripts/migrate-safe.sh
```

---

## 📋 Fluxo Seguro de Migrações

### Passo 1: Antes de qualquer mudança no schema Prisma

```bash
# Edite o schema.prisma com suas mudanças
vim prisma/schema.prisma

# SEMPRE use o script seguro (não use npx prisma migrate dev)
bash scripts/migrate-safe.sh
```

**O que o script faz:**
1. ✅ Cria backup completo do banco ANTES
2. ✅ Mostra migrações pendentes
3. ✅ Pede confirmação do usuário
4. ✅ Aplica as migrações
5. ✅ Regenera Prisma Client
6. ✅ Valida integridade do banco

---

## 🔄 Restaurando de um Backup

Se algo der errado:

```bash
bash scripts/restore-database.sh
```

**O que faz:**
1. Lista todos os backups disponíveis
2. Você escolhe qual restaurar
3. Pede confirmação
4. Restaura os dados
5. Regenera Prisma Client

---

## 📦 Localização dos Backups

Todos os backups estão em:
```
/home/umbrel/backups/healthcare/
```

**Estrutura:**
```
healthcare_20260103_110000.sql.gz  ← Arquivo comprimido do banco
backup_20260103_110000.log         ← Log detalhado
```

---

## 📊 Exemplo Real: Adicionar uma Nova Coluna

### ❌ ERRADO (PERIGOSO)

```bash
# Nunca faça isso!
npx prisma migrate dev --name add_field
# ou pior ainda:
npx prisma migrate reset
```

### ✅ CORRETO (SEGURO)

```bash
# 1. Edite o schema
nano prisma/schema.prisma
# Adicione sua nova coluna

# 2. Execute o script seguro
bash scripts/migrate-safe.sh

# Script irá:
# 1. Fazer backup automático
# 2. Mostrar migrações pendentes
# 3. Pedir confirmação
# 4. Aplicar mudanças
# 5. Validar tudo
```

---

## 🆘 O que fazer se der erro

### Cenário 1: Migração falha

```bash
# Logs detalhados estão em:
tail -50 /home/umbrel/backups/healthcare/backup_*.log

# Restaure o backup anterior:
bash scripts/restore-database.sh
```

### Cenário 2: Esqueceu de fazer backup antes

**Bom sinal:** Todo backup anterior ainda está lá!

```bash
# Listar todos os backups
ls -lah /home/umbrel/backups/healthcare/

# Restaurar o mais recente (antes do erro)
bash scripts/restore-database.sh
```

### Cenário 3: Mudança no schema causou perda de dados

```bash
# Prisma cria migration que você pode review
git diff prisma/migrations/

# Se quiser desfazer:
git checkout prisma/migrations/
bash scripts/restore-database.sh
```

---

## 🎯 Checklist Antes de Migração

- [ ] Fiz commit de todas as mudanças no git
- [ ] Criei branch para a mudança
- [ ] Testei a mudança no schema.prisma
- [ ] Todos vão usar `bash scripts/migrate-safe.sh`
- [ ] Ninguém vai usar `prisma migrate reset`
- [ ] Backup automático será criado
- [ ] Tenho acesso a `/home/umbrel/backups/healthcare/`

---

## 📝 Comandos Úteis

### Ver status de migrações
```bash
npx prisma migrate status
```

### Ver todos os backups
```bash
ls -lah /home/umbrel/backups/healthcare/
```

### Restaurar último backup
```bash
bash scripts/restore-database.sh
# Selecione opção 1 (mais recente)
```

### Fazer backup manual (sem migração)
```bash
bash scripts/backup-database.sh
```

### Conectar ao banco de dados (debug)
```bash
docker exec -it healthcare-db psql -U healthcare -d healthcare_db
```

---

## 🔍 Monitoramento de Backups

### Verificar tamanho dos backups
```bash
du -sh /home/umbrel/backups/healthcare/*
```

### Limpar backups antigos (CUIDADO!)
```bash
# Ver quais seriam deletados (30+ dias)
find /home/umbrel/backups/healthcare -name "*.sql.gz" -mtime +30

# Deletar apenas se tiver espaço
# (Recomenda-se manter pelo menos 5 backups recentes)
find /home/umbrel/backups/healthcare -name "*.sql.gz" -mtime +30 -delete
```

---

## 🚨 Procedimento de Emergência

Se banco foi apagado acidentalmente:

```bash
# 1. PARE TUDO
docker compose down

# 2. RESTAURE DO BACKUP
bash scripts/restore-database.sh

# 3. REINICIE
docker compose up -d

# 4. VALIDE
npm run dev
```

---

## 📞 Suporte

### Dúvidas frequentes

**P: Preciso fazer backup manualmente?**  
R: Não! O script `migrate-safe.sh` faz automaticamente.

**P: Quanto espaço ocupam os backups?**  
R: Depende do volume de dados. Tipicamente 500MB-1GB por backup.

**P: Posso deletar backups antigos?**  
R: Sim, mas guarde pelo menos os 5 mais recentes.

**P: E se o Docker caír durante um backup?**  
R: Ele está rodando no container, pode reiniciar sem problema.

---

## ✅ Checklist de Implementação

- [x] Script de backup automático (`backup-database.sh`)
- [x] Script de migração segura (`migrate-safe.sh`)
- [x] Script de restauração (`restore-database.sh`)
- [x] Documentação completa
- [ ] Configurar cron para backups automáticos diários
- [ ] Configurar monitoramento de espaço em disco
- [ ] Alertas se backup falhar

---

**Última atualização:** Janeiro 2026  
**Crítico:** Use SEMPRE `bash scripts/migrate-safe.sh`, nunca `prisma migrate reset`

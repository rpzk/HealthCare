# 🔐 SISTEMA DE PROTEÇÃO DE DADOS - QUICK START

## ⚡ O que mudou?

**ANTES:** ❌ `prisma migrate reset` apagava TODOS os dados em produção
**AGORA:** ✅ `bash scripts/migrate-safe.sh` protege dados com backup automático

---

## 🎯 Como Usar (3 Passos)

### Passo 1: Editar Schema
```bash
nano prisma/schema.prisma
# Faça suas mudanças
```

### Passo 2: Migração Segura
```bash
bash scripts/migrate-safe.sh
```

**O que acontece automaticamente:**
1. 🔐 Cria backup completo
2. 📊 Mostra dados sendo protegidos
3. ❓ Pede sua confirmação
4. 🚀 Aplica mudanças
5. ✅ Valida tudo

### Passo 3: Pronto!
Sistema está atualizado e dados estão seguros.

---

## 🆘 Se algo der errado

```bash
bash scripts/restore-database.sh
```

- Escolha qual backup restaurar
- Sistema volta ao estado anterior
- Nenhum dado perdido

---

## 📦 Onde ficam os Backups?

```
/home/umbrel/backups/healthcare/
├── healthcare_20260103_110000.sql.gz     ← Seu banco
├── healthcare_20260103_100000.sql.gz     ← Backup anterior
└── backup_20260103_110000.log            ← Detalhes
```

Cada migração cria um novo backup. Você tem histórico completo.

---

## 🤖 Backups Automáticos (Opcional)

Para backups diários automáticos às 2 AM:

```bash
sudo bash scripts/setup-systemd-backup.sh
```

Sistema fará backup **automaticamente** todo dia.

---

## 📊 Visualizar Backups

```bash
# Ver todos os backups
ls -lah /home/umbrel/backups/healthcare/

# Ver próximo backup automático agendado
systemctl list-timers healthcare-backup.timer

# Ver logs do último backup
journalctl -u healthcare-backup.service -n 50
```

---

## ⚠️ NUNCA FAÇA ISSO

```bash
# ❌ PERIGOSO - Apaga TUDO
npx prisma migrate reset

# ❌ PERIGOSO - Sem backup
npx prisma migrate dev
```

---

## ✅ FAÇA ISSO

```bash
# ✅ SEGURO - Backup automático
bash scripts/migrate-safe.sh

# ✅ Se precisar voltar atrás
bash scripts/restore-database.sh
```

---

## 📚 Documentação Completa

Veja [DATABASE_BACKUP_PROCEDURE.md](DATABASE_BACKUP_PROCEDURE.md) para:
- Procedimentos detalhados
- Troubleshooting
- Comandos avançados
- Casos de emergência

---

**Status:** ✅ Produção protegida contra perda de dados
**Última atualização:** Janeiro 2026

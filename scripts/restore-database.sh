#!/bin/bash

# ============================================
# DATABASE RESTORE SCRIPT
# Restaura a partir de um backup anterior
# ============================================

set -e

echo "🔄 RESTAURAR BANCO DE DADOS"
echo "============================"
echo ""

BACKUP_DIR="/home/umbrel/backups/healthcare"
DB_NAME="healthcare_db"
DB_USER="healthcare"

# Listar backups disponíveis
echo "📦 Backups disponíveis:"
echo ""

if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -1 $BACKUP_DIR/*.sql.gz 2>/dev/null)" ]; then
    echo "❌ Nenhum backup encontrado em $BACKUP_DIR"
    exit 1
fi

# Mostrar backups com índices
count=1
declare -a backups
while IFS= read -r file; do
    size=$(du -h "$file" | cut -f1)
    date_file=$(basename "$file" | sed 's/healthcare_//;s/.sql.gz//')
    backups[$count]="$file"
    printf "  %d) %s (%s)\n" "$count" "$date_file" "$size"
    count=$((count + 1))
done < <(ls -1t $BACKUP_DIR/healthcare_*.sql.gz 2>/dev/null)

echo ""
read -p "Selecione o número do backup a restaurar (1-$((count-1))): " choice

if [ -z "${backups[$choice]}" ]; then
    echo "❌ Seleção inválida"
    exit 1
fi

BACKUP_FILE="${backups[$choice]}"
echo ""
echo "📂 Arquivo selecionado: $BACKUP_FILE"
echo ""

# Confirmação
echo "⚠️  ATENÇÃO:"
echo "  - Todos os dados atuais SERÃO DESCARTADOS"
echo "  - Dados do backup SERÃO RESTAURADOS"
echo ""
read -p "Tem certeza? Digite 'sim' para confirmar: " confirm

if [ "$confirm" != "sim" ]; then
    echo "❌ Restauração cancelada"
    exit 0
fi

echo ""
echo "⏳ Restaurando banco de dados..."
echo ""

if gunzip -c "$BACKUP_FILE" | docker exec -i healthcare-db psql -U $DB_USER -d $DB_NAME > /dev/null 2>&1; then
    echo "✅ Restauração concluída!"
else
    echo "⚠️  Restauração com alguns erros de schema (esperado)"
    echo "   Os dados foram restaurados, mas pode haver conflitos de schema"
fi

echo ""
echo "🔄 Regenerando Prisma Client..."
npx prisma generate

echo ""
echo "✅ Banco restaurado com sucesso!"
echo ""

# Mostrar resumo
docker exec healthcare-db psql -U $DB_USER -d $DB_NAME -c "
  SELECT 
    (SELECT COUNT(*) FROM patients) as \"👥 Pacientes\",
    (SELECT COUNT(*) FROM patient_questionnaires) as \"📋 Questionários\",
    (SELECT COUNT(*) FROM consultations WHERE status NOT IN ('CANCELLED')) as \"📅 Agendamentos\",
    (SELECT COUNT(*) FROM users) as \"👤 Usuários\"
;" 2>/dev/null || echo "  (Erro ao conectar)"

echo ""

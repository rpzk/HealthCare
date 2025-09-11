#!/bin/bash

# Script para restaurar um backup do sistema HealthCare

# Verificar se um arquivo de backup foi fornecido
if [ -z "$1" ]; then
  echo "Uso: $0 <caminho_do_arquivo_backup.sql.gz>"
  echo "Exemplo: $0 /var/backups/healthcare/healthcare_db_20231025_120000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

# Verificar se o arquivo existe
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Erro: Arquivo de backup não encontrado: $BACKUP_FILE"
  exit 1
fi

# Confirmar a restauração
echo "AVISO: Você está prestes a restaurar o banco de dados a partir do backup:"
echo "$BACKUP_FILE"
echo ""
echo "Esta operação irá substituir TODOS os dados atuais no banco de dados."
echo "Certifique-se de que o sistema não está em uso durante a restauração."
echo ""
read -p "Continuar com a restauração? (s/N): " CONFIRM

if [[ ! "$CONFIRM" =~ ^[Ss]$ ]]; then
  echo "Restauração cancelada."
  exit 0
fi

# Verificar integridade do backup
echo "Verificando integridade do arquivo de backup..."
if ! gunzip -t "$BACKUP_FILE"; then
  echo "Erro: O arquivo de backup parece estar corrompido."
  exit 1
fi

# Parar os serviços
echo "Parando os serviços para evitar conflitos..."
cd /opt/healthcare || { echo "Diretório não encontrado"; exit 1; }
docker-compose -f docker-compose.prod.yml stop app

# Restaurar o backup
echo "Iniciando restauração do banco de dados..."
echo "Isso pode levar alguns minutos, dependendo do tamanho do backup."

# Criar banco temporário para evitar conflitos
TEMP_DB="healthcare_temp_$(date +%s)"
echo "Criando banco de dados temporário $TEMP_DB..."

docker-compose -f docker-compose.prod.yml exec -T postgres psql -U healthcare -c "CREATE DATABASE $TEMP_DB;" postgres

# Restaurar para o banco temporário
echo "Restaurando para banco temporário..."
gunzip -c "$BACKUP_FILE" | docker-compose -f docker-compose.prod.yml exec -T postgres psql -U healthcare "$TEMP_DB"

if [ $? -ne 0 ]; then
  echo "Erro durante a restauração do backup."
  echo "Removendo banco de dados temporário..."
  docker-compose -f docker-compose.prod.yml exec -T postgres psql -U healthcare -c "DROP DATABASE IF EXISTS $TEMP_DB;" postgres
  docker-compose -f docker-compose.prod.yml start app
  exit 1
fi

# Renomear bancos
echo "Restauração para banco temporário concluída. Trocando bancos..."

# Desconectar todas as conexões
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U healthcare -c "
SELECT pg_terminate_backend(pg_stat_activity.pid)
FROM pg_stat_activity
WHERE pg_stat_activity.datname IN ('healthcare_db', '$TEMP_DB')
  AND pid <> pg_backend_pid();" postgres

# Renomear bancos
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U healthcare -c "ALTER DATABASE healthcare_db RENAME TO healthcare_db_old_$(date +%s);" postgres
docker-compose -f docker-compose.prod.yml exec -T postgres psql -U healthcare -c "ALTER DATABASE $TEMP_DB RENAME TO healthcare_db;" postgres

# Iniciar serviços
echo "Reiniciando serviços..."
docker-compose -f docker-compose.prod.yml start app

# Verificar se o serviço iniciou corretamente
sleep 5
if docker-compose -f docker-compose.prod.yml ps app | grep -q "Up"; then
  echo "Serviço reiniciado com sucesso."
else
  echo "AVISO: O serviço não iniciou automaticamente. Verificando logs..."
  docker-compose -f docker-compose.prod.yml logs app --tail=50
  
  echo "Tentando reiniciar novamente..."
  docker-compose -f docker-compose.prod.yml restart app
fi

echo ""
echo "Restauração concluída com sucesso a partir de: $BACKUP_FILE"
echo "Um backup do banco antigo foi mantido como: healthcare_db_old_$(date +%s)"
echo "Você pode removê-lo após verificar que o sistema está funcionando corretamente com:"
echo "docker-compose -f docker-compose.prod.yml exec postgres psql -U healthcare -c 'DROP DATABASE healthcare_db_old_$(date +%s);' postgres"
echo ""
echo "Verifique o funcionamento do sistema acessando a aplicação."

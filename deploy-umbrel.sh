#!/bin/bash
# Script de deploy automatizado para Umbrel
echo "Iniciando deploy no Umbrel..."

# Garante que estamos na branch correta e atualizados
echo "Atualizando código..."
git stash
git pull
git stash pop || echo "Nada para restaurar ou conflito ignorado"

# Executa o Docker Compose com sudo
echo "Reconstruindo containers..."
sudo docker compose -f docker-compose.umbrel.yml up -d --build

# Aguarda o container iniciar
echo "Aguardando container iniciar..."
sleep 10

# Executa migrações do banco de dados
echo "Executando migrações do banco de dados..."
sudo docker compose -f docker-compose.umbrel.yml exec -T app npx prisma migrate deploy

# Regenera o cliente Prisma (garantia)
echo "Regenerando cliente Prisma..."
sudo docker compose -f docker-compose.umbrel.yml exec -T app npx prisma generate

# Reinicia a aplicação para carregar o novo cliente
echo "Reiniciando aplicação..."
sudo docker compose -f docker-compose.umbrel.yml restart app

echo "Deploy concluído com sucesso!"
echo "Aguarde alguns instantes para os serviços iniciarem."

#!/bin/bash
# Script de deploy automatizado para Umbrel
echo "Iniciando deploy no Umbrel..."

# Garante que estamos na branch correta e atualizados
echo "Atualizando código..."
git pull

# Executa o Docker Compose com sudo
echo "Reconstruindo containers..."
sudo docker compose -f docker-compose.umbrel.yml up -d --build

echo "Deploy concluído com sucesso!"
echo "Aguarde alguns instantes para os serviços iniciarem."

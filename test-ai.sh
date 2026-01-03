#!/bin/bash
MODEL=${1:-qwen2.5:3b}
echo "🤖 Testando IA - Modelo: $MODEL"
echo "================================="
echo ""
docker exec healthcare-ollama ollama run $MODEL "Você é um médico. Explique em 2 frases como diagnosticar cefaleia tensional."

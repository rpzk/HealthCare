#!/bin/bash
# Gera PNGs dos modelos ANVISA a partir dos PDFs em docs/anvisa-modelos
# Uso: ./scripts/generate-prescription-templates.sh
# Requer: poppler-utils (pdftoppm)

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/docs/anvisa-modelos"
DEST="$ROOT/public/prescription-templates"
mkdir -p "$DEST"

convert_pdf() {
  local src="$1"
  local destbase="$2"
  local pages="${3:-1}"
  [ -f "$src" ] || return 0
  pdftoppm -png -r 200 -f 1 -l "$pages" "$src" "$DEST/$destbase" 2>/dev/null || true
}

convert_pdf "$SRC/NOTIFICAÇÃO DE RECEITA A.pdf" "receita-a" 1
convert_pdf "$SRC/NOTIFICAÇÃO DE RECEITA B.pdf" "receita-b" 1
convert_pdf "$SRC/RECEITA DE CONTROLE ESPECIAL.pdf" "receita-controle-especial" 2

# Renomear saída do pdftoppm (gera receita-a-1.png, receita-a-2.png, etc)
for f in "$DEST"/receita-a-1.png; do [ -f "$f" ] && mv "$f" "$DEST/receita-a.png"; done
for f in "$DEST"/receita-b-1.png; do [ -f "$f" ] && mv "$f" "$DEST/receita-b.png"; done

echo "Templates em $DEST:"
ls -la "$DEST"/*.png 2>/dev/null || echo "Nenhum PNG gerado."

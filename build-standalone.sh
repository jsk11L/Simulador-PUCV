#!/usr/bin/env bash
# ============================================================
# Build standalone — produce simula (Linux/macOS) o simula.exe
# (Windows si GOOS=windows) en la raíz del repo.
#
# Uso:
#   ./build-standalone.sh                 # nativo
#   GOOS=windows ./build-standalone.sh    # cross a Windows
# ============================================================
set -euo pipefail

echo
echo "[1/4] Construyendo frontend..."
cd frontend
npm install
VITE_API_BASE_URL="" npm run build
cd ..

echo
echo "[2/4] Copiando dist al backend..."
rm -rf backend/frontend_dist
mkdir -p backend/frontend_dist
cp -r frontend/dist/. backend/frontend_dist/

echo
echo "[3/4] Compilando binario standalone..."
cd backend
go mod tidy
OUT_NAME="simula"
LDFLAGS="-s -w"
if [ "${GOOS:-}" = "windows" ]; then
  OUT_NAME="simula.exe"
  # Sin consola en Windows; los logs van al archivo de log de la app.
  LDFLAGS="-s -w -H=windowsgui"
fi
go build -ldflags="${LDFLAGS}" -o "../${OUT_NAME}" .
cd ..

echo
echo "[4/4] Listo. Ejecutable: ${OUT_NAME}"
ls -lh "${OUT_NAME}"

cat <<EOF

============================================================
Para probar:  ./${OUT_NAME}
Abrirá automáticamente http://localhost:8080
BD local en:  \$HOME/.simulapucv/datos.db
============================================================
EOF

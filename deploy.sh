#!/bin/bash
# Script de Actualización y Despliegue Automático - RadioFM
# Ejecutar con: ./deploy.sh "Mensaje de los cambios"

echo "==================================================="
echo "🚀 INICIANDO ACTUALIZACIÓN AUTOMÁTICA - RADIOFM"
echo "==================================================="

# 1. Obtener mensaje del commit
MENSAJE=$1
if [ -z "$MENSAJE" ]; then
  MENSAJE="Actualización automática $(date +'%Y-%m-%d %H:%M:%S')"
fi

echo "📦 1. Limpiando archivos basura y respaldos antiguos..."
rm -f *.zip
rm -rf node_modules
rm -rf tmp/*

echo "🐙 2. Subiendo cambios a GitHub (Render se actualizará solo)..."
git add .
git commit -m "$MENSAJE"
git push origin main

echo "🗜️ 3. Creando paquete de producción para GoDaddy..."
FECHA=$(date +'%Y-%m-%d')
ZIP_PROD="radio2_produccion_godaddy_$FECHA.zip"

# Empaquetar solo lo necesario para el Frontend
zip -r $ZIP_PROD css js index.html -x "*.DS_Store" > /dev/null

echo "✅ PROCESO COMPLETADO EXITOSAMENTE"
echo "==================================================="
echo "-> Backend (Render): Ya se está actualizando."
echo "-> Frontend (GoDaddy): Sube el archivo '$ZIP_PROD' a tu hosting."
echo "==================================================="

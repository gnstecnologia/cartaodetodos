#!/bin/bash

# Script para limpar arquivos desnecessários na VPS
# Execute na VPS: cd /var/www/cartaodetodos && bash deploy/limpar-vps.sh

set -e

echo "🧹 Limpando arquivos desnecessários na VPS..."

PROJECT_DIR="/var/www/cartaodetodos"
cd "$PROJECT_DIR"

# Lista de arquivos/diretórios NECESSÁRIOS
NECESSARIOS=(
    "server.js"
    "package.json"
    "package-lock.json"
    "styles.css"
    "*.html"
    "scripts/"
    "services/"
    "tools/"
    "supabase/"
    "deploy/nginx-cartaodetodos.conf"
    "deploy/setup-nginx-ssl.sh"
    "deploy/limpar-vps.sh"
    "docs/CONFIGURAR_SSL.md"
    "docs/DEPLOY.md"
    "docs/REFERENCIAS-ARQUIVOS.md"
    "README.md"
    "LOGO.webp"
    "faviconV2.png"
    "BACKGROUND-HERO.webp"
    "IMAGEM LADO DA HEADLINE.png"
    ".env"
    ".git/"
    "node_modules/"
    "deploy/"
    "docs/"
)

# Lista de arquivos/diretórios para REMOVER (se existirem)
ARQUIVOS_REMOVER=(
    ".github"
    "deploy-automatico.sh"
    "deploy-vps.sh"
    "stop-server.ps1"
    "test-connection.js"
    "Dockerfile"
    "docker-compose.yml"
    "vercel.json"
    "default.php"
    "ARQUIVOS_REMOVIDOS.md"
    "COMECE_AQUI.md"
    "DEPLOY_HOSTINGER.md"
    "DEPLOY_KVM.md"
    "DEPLOY_VERCEL.md"
    "DEPLOY_VPS.md"
    "INFORMACOES_DEPLOY.md"
    "SETUP.md"
    "README_API.md"
    "TIPOS_E_PERMISSOES.md"
    "RELATORIO_EXPORTACAO.md"
    "criar-usuario-admin.js"
    "corrigir-usuario-admin.js"
    "CONFIGURAR_SSL.md"
    "nginx-cartaodetodos.conf"
    "setup-nginx-ssl.sh"
    "limpar-vps.sh"
    "*.tmp"
    "*.temp"
    "*.log"
    "npm-debug.log*"
    ".DS_Store"
    "Thumbs.db"
)

echo ""
echo "📋 Verificando arquivos existentes..."
echo ""

# Listar todos os arquivos
echo "📁 Arquivos no diretório:"
ls -la | head -20

echo ""
echo "🔍 Procurando arquivos desnecessários..."

# Remover arquivos desnecessários
for item in "${ARQUIVOS_REMOVER[@]}"; do
    if [ -e "$item" ] || ls $item 2>/dev/null | grep -q .; then
        echo "❌ Removendo: $item"
        rm -rf $item 2>/dev/null || true
    fi
done

echo ""
echo "✅ Limpeza concluída!"
echo ""
echo "📊 Verificando estrutura final..."

# Verificar se arquivos necessários existem
echo ""
echo "✅ Arquivos essenciais:"
for item in "${NECESSARIOS[@]}"; do
    if [ -e "$item" ] || ls $item 2>/dev/null | grep -q .; then
        echo "  ✓ $item"
    else
        echo "  ⚠️  $item (não encontrado - verificar se é necessário)"
    fi
done

echo ""
echo "📁 Estrutura final do projeto:"
ls -la

echo ""
echo "✨ Limpeza finalizada!"

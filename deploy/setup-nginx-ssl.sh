#!/bin/bash

# Script para configurar Nginx e SSL na VPS
# Na raiz do projeto (ex.: /var/www/cartaodetodos): sudo bash deploy/setup-nginx-ssl.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NGINX_TEMPLATE="$SCRIPT_DIR/nginx-cartaodetodos.conf"

echo "🔧 Configurando Nginx e SSL para cartaodetodos.cloud..."

# Verificar se está rodando como root
if [ "$EUID" -ne 0 ]; then 
    echo "❌ Por favor, execute como root (use sudo)"
    exit 1
fi

# Instalar Nginx se não estiver instalado
if ! command -v nginx &> /dev/null; then
    echo "📦 Instalando Nginx..."
    apt update
    apt install -y nginx
fi

# Instalar Certbot se não estiver instalado
if ! command -v certbot &> /dev/null; then
    echo "📦 Instalando Certbot..."
    apt install -y certbot python3-certbot-nginx
fi

# Diretório do projeto
PROJECT_DIR="/var/www/cartaodetodos"
DOMAIN="cartaodetodos.cloud"

# Verificar se o diretório existe
if [ ! -d "$PROJECT_DIR" ]; then
    echo "⚠️  Diretório $PROJECT_DIR não encontrado. Criando..."
    mkdir -p "$PROJECT_DIR"
fi

# Backup da configuração do Nginx se existir
if [ -f "/etc/nginx/sites-available/$DOMAIN" ]; then
    echo "💾 Fazendo backup da configuração existente..."
    cp /etc/nginx/sites-available/$DOMAIN "/etc/nginx/sites-available/$DOMAIN.backup.$(date +%Y%m%d_%H%M%S)"
fi

# Copiar configuração do Nginx
echo "📝 Configurando Nginx..."
cp "$NGINX_TEMPLATE" /etc/nginx/sites-available/$DOMAIN

# Remover configuração HTTP temporariamente para obter certificado SSL
sed -i '/listen 443 ssl http2;/d' /etc/nginx/sites-available/$DOMAIN
sed -i '/ssl_certificate/d' /etc/nginx/sites-available/$DOMAIN
sed -i 's/return 301 https/# return 301 https/' /etc/nginx/sites-available/$DOMAIN

# Criar link simbólico
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Remover configuração padrão do Nginx se existir
rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
echo "🧪 Testando configuração do Nginx..."
nginx -t

# Reiniciar Nginx
echo "🔄 Reiniciando Nginx..."
systemctl restart nginx
systemctl enable nginx

# Obter certificado SSL
echo "🔐 Obtendo certificado SSL com Let's Encrypt..."
certbot --nginx -d $DOMAIN -d www.$DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN --redirect

# Restaurar configuração completa do Nginx
echo "📝 Aplicando configuração completa do Nginx..."
cp "$NGINX_TEMPLATE" /etc/nginx/sites-available/$DOMAIN
ln -sf /etc/nginx/sites-available/$DOMAIN /etc/nginx/sites-enabled/

# Testar novamente
nginx -t

# Reiniciar Nginx
systemctl reload nginx

echo ""
echo "✅ Configuração concluída!"
echo ""
echo "📋 Próximos passos:"
echo "   1. Verifique se o servidor Node.js está rodando: pm2 status"
echo "   2. Se não estiver, inicie: cd $PROJECT_DIR && pm2 start server.js --name cartaodetodos"
echo "   3. Acesse: https://$DOMAIN"
echo ""
echo "🔄 Renovação automática do certificado SSL está configurada via certbot timer"

#!/bin/bash

# Script de Deploy Automatizado para VPS Ubuntu
# Execute: bash deploy-vps.sh

set -e

echo "🚀 Iniciando deploy do Cartão de Todos na VPS..."
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar se está como root ou com sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${YELLOW}⚠️  Execute com sudo: sudo bash deploy-vps.sh${NC}"
    exit 1
fi

# Atualizar sistema
echo -e "${GREEN}📦 Atualizando sistema...${NC}"
apt update && apt upgrade -y

# Instalar Node.js 20.x
echo -e "${GREEN}📦 Instalando Node.js 20.x...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
else
    echo -e "${YELLOW}✅ Node.js já instalado: $(node --version)${NC}"
fi

# Instalar PM2
echo -e "${GREEN}📦 Instalando PM2...${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
else
    echo -e "${YELLOW}✅ PM2 já instalado${NC}"
fi

# Instalar Nginx
echo -e "${GREEN}📦 Instalando Nginx...${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
else
    echo -e "${YELLOW}✅ Nginx já instalado${NC}"
fi

# Criar diretório da aplicação
APP_DIR="/var/www/cartaodetodos"
echo -e "${GREEN}📁 Configurando diretório da aplicação...${NC}"

if [ ! -d "$APP_DIR" ]; then
    mkdir -p /var/www
    cd /var/www
    echo -e "${YELLOW}📥 Clonando repositório...${NC}"
    git clone https://github.com/gnstecnologia/cartaodetodos.git
else
    echo -e "${YELLOW}✅ Diretório já existe, atualizando...${NC}"
    cd $APP_DIR
    git pull
fi

cd $APP_DIR

# Instalar dependências
echo -e "${GREEN}📦 Instalando dependências npm...${NC}"
npm install

# Verificar se .env existe
if [ ! -f "$APP_DIR/.env" ]; then
    echo -e "${YELLOW}⚠️  Arquivo .env não encontrado!${NC}"
    echo -e "${YELLOW}📝 Criando arquivo .env de exemplo...${NC}"
    cat > $APP_DIR/.env << EOF
# Google Sheets Configuration
SPREADSHEET_ID=SEU_SPREADSHEET_ID
GOOGLE_SHEETS_LEADS_SHEET=Leads
GOOGLE_SHEETS_PROMOTOR_SHEET=Promotor

# Google Cloud Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=seu-email@projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Server Configuration
PORT=3000
NODE_ENV=production

# Dashboard Password
DASHBOARD_PASSWORD=admin123

# Webhook URL (opcional)
WEBHOOK_URL=
EOF
    echo -e "${RED}❌ Configure o arquivo .env antes de continuar!${NC}"
    echo -e "${YELLOW}   nano $APP_DIR/.env${NC}"
    exit 1
fi

# Configurar PM2
echo -e "${GREEN}⚙️  Configurando PM2...${NC}"
pm2 delete cartaodetodos 2>/dev/null || true
pm2 start server.js --name cartaodetodos
pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER
pm2 save

# Configurar Nginx
echo -e "${GREEN}⚙️  Configurando Nginx...${NC}"
read -p "Digite seu domínio (ou IP da VPS): " DOMAIN

cat > /etc/nginx/sites-available/cartaodetodos << EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/cartaodetodos /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

# Configurar firewall
echo -e "${GREEN}🔥 Configurando firewall...${NC}"
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo -e "${GREEN}✅ Deploy concluído com sucesso!${NC}"
echo ""
echo -e "${YELLOW}📋 Próximos passos:${NC}"
echo "1. Configure o arquivo .env se ainda não fez: nano $APP_DIR/.env"
echo "2. Verifique o status: pm2 status"
echo "3. Veja os logs: pm2 logs cartaodetodos"
echo "4. Acesse: http://$DOMAIN"
echo ""
echo -e "${YELLOW}💡 Para configurar SSL (Let's Encrypt):${NC}"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d $DOMAIN"
echo ""



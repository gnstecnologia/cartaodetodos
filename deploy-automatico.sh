#!/bin/bash

# ============================================
# Script de Deploy Automatizado Completo
# Cartão de Todos - VPS KVM
# ============================================

set -e

# Cores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

clear
echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   🚀 Deploy Automatizado - Cartão de Todos            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

# Verificar se está como root ou com sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Execute com sudo: sudo bash deploy-automatico.sh${NC}"
    exit 1
fi

# ============================================
# COLETA DE INFORMAÇÕES
# ============================================

echo -e "${YELLOW}📋 Vamos coletar as informações necessárias...${NC}"
echo ""

# 1. Domínio ou IP
read -p "🌐 Digite seu domínio (ex: cartaodetodos.com.br) ou IP da VPS: " DOMAIN
if [ -z "$DOMAIN" ]; then
    echo -e "${RED}❌ Domínio/IP é obrigatório!${NC}"
    exit 1
fi

# 2. SPREADSHEET_ID
read -p "📊 ID da Planilha Google Sheets: " SPREADSHEET_ID
if [ -z "$SPREADSHEET_ID" ]; then
    echo -e "${RED}❌ SPREADSHEET_ID é obrigatório!${NC}"
    exit 1
fi

# 3. GOOGLE_SERVICE_ACCOUNT_EMAIL
read -p "📧 Email da Service Account do Google: " GOOGLE_EMAIL
if [ -z "$GOOGLE_EMAIL" ]; then
    echo -e "${RED}❌ Email da Service Account é obrigatório!${NC}"
    exit 1
fi

# 4. GOOGLE_PRIVATE_KEY
echo -e "${YELLOW}🔑 Cole a chave privada completa (GOOGLE_PRIVATE_KEY):${NC}"
echo -e "${YELLOW}   (Cole tudo, incluindo BEGIN e END, depois pressione Enter e digite 'FIM' em uma nova linha)${NC}"
GOOGLE_PRIVATE_KEY=""
while IFS= read -r line; do
    if [ "$line" = "FIM" ]; then
        break
    fi
    if [ -z "$GOOGLE_PRIVATE_KEY" ]; then
        GOOGLE_PRIVATE_KEY="$line"
    else
        GOOGLE_PRIVATE_KEY="$GOOGLE_PRIVATE_KEY\n$line"
    fi
done

if [ -z "$GOOGLE_PRIVATE_KEY" ]; then
    echo -e "${RED}❌ Chave privada é obrigatória!${NC}"
    exit 1
fi

# 5. Nome das abas (opcional, com defaults)
read -p "📑 Nome da aba de Leads (Enter para 'Leads'): " LEADS_SHEET
LEADS_SHEET=${LEADS_SHEET:-Leads}

read -p "👥 Nome da aba de Promotores (Enter para 'Promotor'): " PROMOTOR_SHEET
PROMOTOR_SHEET=${PROMOTOR_SHEET:-Promotor}

# 6. Senha do Dashboard
read -p "🔐 Senha do Dashboard (Enter para 'admin123'): " DASHBOARD_PASSWORD
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD:-admin123}

# 7. Webhook URL (opcional)
read -p "🔗 URL do Webhook (Enter para pular): " WEBHOOK_URL

# 8. Configurar SSL?
read -p "🔒 Configurar SSL/HTTPS com Let's Encrypt? (s/n): " CONFIGURE_SSL
CONFIGURE_SSL=${CONFIGURE_SSL:-n}

echo ""
echo -e "${GREEN}✅ Informações coletadas!${NC}"
echo ""
read -p "Pressione Enter para começar o deploy ou Ctrl+C para cancelar..."

# ============================================
# INSTALAÇÃO E CONFIGURAÇÃO
# ============================================

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  FASE 0: Verificações Iniciais${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"

# Verificar se precisa reiniciar
if [ -f /var/run/reboot-required ]; then
    echo -e "${YELLOW}⚠️  Sistema precisa ser reiniciado após atualizações.${NC}"
    echo -e "${YELLOW}   Recomendado: Execute 'sudo reboot' após o deploy.${NC}"
    read -p "Deseja continuar mesmo assim? (s/n): " CONTINUE
    if [ "$CONTINUE" != "s" ] && [ "$CONTINUE" != "S" ]; then
        exit 0
    fi
fi

# Instalar Git (necessário para clonar repositório)
if ! command -v git &> /dev/null; then
    echo -e "${GREEN}📦 Instalando Git...${NC}"
    apt install -y git
    echo -e "${GREEN}✅ Git instalado${NC}"
else
    echo -e "${YELLOW}✅ Git já instalado: $(git --version)${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  FASE 1: Atualizando Sistema${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
apt update && apt upgrade -y

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  FASE 2: Instalando Node.js 20.x${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt install -y nodejs
    echo -e "${GREEN}✅ Node.js instalado: $(node --version)${NC}"
else
    echo -e "${YELLOW}✅ Node.js já instalado: $(node --version)${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  FASE 3: Instalando PM2${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
    echo -e "${GREEN}✅ PM2 instalado${NC}"
else
    echo -e "${YELLOW}✅ PM2 já instalado${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  FASE 4: Instalando Nginx${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
if ! command -v nginx &> /dev/null; then
    apt install -y nginx
    systemctl start nginx
    systemctl enable nginx
    echo -e "${GREEN}✅ Nginx instalado e iniciado${NC}"
else
    echo -e "${YELLOW}✅ Nginx já instalado${NC}"
fi

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  FASE 5: Clonando Repositório${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
APP_DIR="/var/www/cartaodetodos"

if [ -d "$APP_DIR" ]; then
    echo -e "${YELLOW}📁 Diretório já existe, atualizando...${NC}"
    cd $APP_DIR
    git pull
else
    mkdir -p /var/www
    cd /var/www
    git clone https://github.com/gnstecnologia/cartaodetodos.git
    cd cartaodetodos
fi

chown -R $SUDO_USER:$SUDO_USER $APP_DIR
cd $APP_DIR

echo -e "${GREEN}✅ Repositório configurado${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  FASE 6: Instalando Dependências${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
npm install --production
echo -e "${GREEN}✅ Dependências instaladas${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  FASE 7: Configurando Variáveis de Ambiente${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"

# Criar arquivo .env
cat > $APP_DIR/.env << EOF
# Google Sheets Configuration
SPREADSHEET_ID=$SPREADSHEET_ID
GOOGLE_SHEETS_LEADS_SHEET=$LEADS_SHEET
GOOGLE_SHEETS_PROMOTOR_SHEET=$PROMOTOR_SHEET

# Google Cloud Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=$GOOGLE_EMAIL
GOOGLE_PRIVATE_KEY="$GOOGLE_PRIVATE_KEY"

# Server Configuration
PORT=3000
NODE_ENV=production

# Dashboard Password
DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD
EOF

if [ ! -z "$WEBHOOK_URL" ]; then
    echo "WEBHOOK_URL=$WEBHOOK_URL" >> $APP_DIR/.env
fi

chmod 600 $APP_DIR/.env
chown $SUDO_USER:$SUDO_USER $APP_DIR/.env
echo -e "${GREEN}✅ Arquivo .env criado${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  FASE 8: Configurando PM2${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"

# Parar processo existente se houver
pm2 delete cartaodetodos 2>/dev/null || true

# Iniciar aplicação
cd $APP_DIR
pm2 start server.js --name cartaodetodos

# Configurar para iniciar automaticamente
# Verifica se é root ou usuário normal
if [ "$SUDO_USER" ]; then
    USER_HOME="/home/$SUDO_USER"
else
    USER_HOME="$HOME"
    SUDO_USER=$(whoami)
fi

pm2 startup systemd -u $SUDO_USER --hp $USER_HOME 2>/dev/null | grep -v "PM2" | bash || {
    echo -e "${YELLOW}⚠️  Execute o comando que apareceu acima para configurar PM2 no boot${NC}"
}
pm2 save

echo -e "${GREEN}✅ PM2 configurado${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  FASE 9: Configurando Nginx${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"

# Criar configuração do Nginx
cat > /etc/nginx/sites-available/cartaodetodos << EOF
server {
    listen 80;
    server_name $DOMAIN;

    client_max_body_size 10M;

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
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
EOF

# Ativar site
ln -sf /etc/nginx/sites-available/cartaodetodos /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração
nginx -t

# Recarregar Nginx
systemctl reload nginx

echo -e "${GREEN}✅ Nginx configurado${NC}"

echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  FASE 10: Configurando Firewall${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"

ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo -e "${GREEN}✅ Firewall configurado${NC}"

# SSL Configuration
if [ "$CONFIGURE_SSL" = "s" ] || [ "$CONFIGURE_SSL" = "S" ]; then
    echo ""
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  FASE 11: Configurando SSL (Let's Encrypt)${NC}"
    echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
    
    apt install -y certbot python3-certbot-nginx
    
    echo -e "${YELLOW}📧 Você precisará fornecer um email para o Let's Encrypt${NC}"
    read -p "Digite seu email: " SSL_EMAIL
    
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $SSL_EMAIL || {
        echo -e "${YELLOW}⚠️  Erro ao configurar SSL. Você pode configurar manualmente depois.${NC}"
    }
    
    echo -e "${GREEN}✅ SSL configurado${NC}"
fi

# ============================================
# FINALIZAÇÃO
# ============================================

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✅ DEPLOY CONCLUÍDO COM SUCESSO!            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}📊 Status da Aplicação:${NC}"
pm2 status

echo ""
echo -e "${BLUE}🌐 URLs de Acesso:${NC}"
if [ "$CONFIGURE_SSL" = "s" ] || [ "$CONFIGURE_SSL" = "S" ]; then
    echo -e "   ${GREEN}https://$DOMAIN${NC}"
else
    echo -e "   ${GREEN}http://$DOMAIN${NC}"
    echo -e "   ${YELLOW}💡 Configure SSL depois com: sudo certbot --nginx -d $DOMAIN${NC}"
fi

echo ""
echo -e "${BLUE}📝 Comandos Úteis:${NC}"
echo -e "   Ver logs:        ${GREEN}pm2 logs cartaodetodos${NC}"
echo -e "   Ver status:      ${GREEN}pm2 status${NC}"
echo -e "   Reiniciar:       ${GREEN}pm2 restart cartaodetodos${NC}"
echo -e "   Atualizar código: ${GREEN}cd $APP_DIR && git pull && npm install && pm2 restart cartaodetodos${NC}"

echo ""
echo -e "${BLUE}🔍 Testando Aplicação...${NC}"
sleep 3

# Testar se está respondendo
echo -e "${BLUE}⏳ Aguardando aplicação iniciar (10 segundos)...${NC}"
sleep 10

if curl -f http://localhost:3000/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Aplicação está respondendo corretamente!${NC}"
else
    echo -e "${YELLOW}⚠️  Aplicação pode estar iniciando ainda.${NC}"
    echo -e "${YELLOW}   Verifique os logs: pm2 logs cartaodetodos${NC}"
    echo -e "${YELLOW}   Verifique o status: pm2 status${NC}"
fi

# Verificar se precisa reiniciar após atualizações
if [ -f /var/run/reboot-required ]; then
    echo ""
    echo -e "${YELLOW}⚠️  ATENÇÃO: Sistema precisa ser reiniciado após atualizações.${NC}"
    echo -e "${YELLOW}   Execute: sudo reboot${NC}"
    echo -e "${YELLOW}   Após reiniciar, a aplicação iniciará automaticamente com PM2.${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Tudo pronto! Seu projeto está no ar!${NC}"
echo ""


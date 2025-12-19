# 🚀 Guia de Deploy na VPS Hostinger (Ubuntu 24)

Este guia completo vai te ajudar a hospedar o projeto Cartão de Todos na sua VPS Ubuntu.

## 📋 Pré-requisitos

- VPS Ubuntu 24 na Hostinger
- Acesso SSH à VPS
- Domínio configurado apontando para o IP da VPS (opcional, mas recomendado)

---

## 🎯 Opção 1: Deploy Simples (Recomendado)

### Passo 1: Conectar na VPS

```bash
ssh root@SEU_IP_DA_VPS
# ou
ssh usuario@SEU_IP_DA_VPS
```

### Passo 2: Atualizar o Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### Passo 3: Instalar Node.js 20.x

```bash
# Instalar Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalação
node --version
npm --version
```

### Passo 4: Instalar PM2 (Gerenciador de Processos)

```bash
sudo npm install -g pm2
```

**Por que PM2?**
- Mantém o servidor rodando mesmo após reiniciar
- Reinicia automaticamente se o processo cair
- Logs organizados
- Fácil gerenciamento

### Passo 5: Instalar Nginx (Reverse Proxy)

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### Passo 6: Clonar o Repositório

```bash
# Criar diretório para aplicações
sudo mkdir -p /var/www
cd /var/www

# Clonar repositório
sudo git clone https://github.com/gnstecnologia/cartaodetodos.git
sudo chown -R $USER:$USER /var/www/cartaodetodos
cd cartaodetodos
```

### Passo 7: Instalar Dependências

```bash
npm install
```

### Passo 8: Configurar Variáveis de Ambiente

```bash
# Criar arquivo .env
nano .env
```

Cole o conteúdo (substitua pelos seus valores):

```env
# Google Sheets Configuration
SPREADSHEET_ID=1LEUBhIGrXZ5A_WUyvof-47iwd1P-5-DpIw2BcO-k9yY
GOOGLE_SHEETS_LEADS_SHEET=Leads
GOOGLE_SHEETS_PROMOTOR_SHEET=Promotor

# Google Cloud Service Account
GOOGLE_SERVICE_ACCOUNT_EMAIL=robocartaodetodos@cartaodetodos-478014.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"

# Server Configuration
PORT=3000
NODE_ENV=production

# Dashboard Password
DASHBOARD_PASSWORD=admin123

# Webhook URL (opcional)
WEBHOOK_URL=https://backend.kukuna.com.br/webhook/87/Gqj9E1Vm5zv9o7PULYMDuv78P9pNHXyClyKQFkcb6r
```

Salve com `Ctrl+X`, depois `Y`, depois `Enter`.

### Passo 9: Iniciar com PM2

```bash
# Iniciar aplicação
pm2 start server.js --name cartaodetodos

# Configurar para iniciar automaticamente
pm2 startup
pm2 save

# Ver status
pm2 status
pm2 logs cartaodetodos
```

### Passo 10: Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/cartaodetodos
```

Cole esta configuração:

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO.com.br;  # ou IP da VPS

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Ativar o site:

```bash
sudo ln -s /etc/nginx/sites-available/cartaodetodos /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### Passo 11: Configurar SSL (Let's Encrypt) - Opcional mas Recomendado

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d SEU_DOMINIO.com.br
```

Siga as instruções na tela. O certificado será renovado automaticamente.

---

## 🐳 Opção 2: Deploy com Docker (Avançado)

### Criar Dockerfile

```dockerfile
FROM node:20-alpine

WORKDIR /app

# Copiar arquivos de dependências
COPY package*.json ./

# Instalar dependências
RUN npm ci --only=production

# Copiar código da aplicação
COPY . .

# Expor porta
EXPOSE 3000

# Variáveis de ambiente (serão sobrescritas pelo docker-compose)
ENV NODE_ENV=production
ENV PORT=3000

# Comando para iniciar
CMD ["node", "server.js"]
```

### Criar docker-compose.yml

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: cartaodetodos
    restart: unless-stopped
    ports:
      - "3000:3000"
    env_file:
      - .env
    volumes:
      - ./logs:/app/logs
    networks:
      - cartaodetodos-network

networks:
  cartaodetodos-network:
    driver: bridge
```

### Comandos Docker

```bash
# Construir e iniciar
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar
docker-compose down

# Reiniciar
docker-compose restart
```

---

## 🔧 Comandos Úteis

### Gerenciar com PM2

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs cartaodetodos

# Reiniciar
pm2 restart cartaodetodos

# Parar
pm2 stop cartaodetodos

# Ver monitoramento
pm2 monit
```

### Atualizar Código

```bash
cd /var/www/cartaodetodos
git pull
npm install  # se houver novas dependências
pm2 restart cartaodetodos
```

### Verificar Portas

```bash
# Ver se a porta 3000 está aberta
sudo netstat -tlnp | grep 3000

# Verificar firewall
sudo ufw status
```

---

## 🔒 Configuração de Firewall

```bash
# Permitir SSH
sudo ufw allow 22/tcp

# Permitir HTTP e HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Ativar firewall
sudo ufw enable
sudo ufw status
```

---

## 📝 Script de Deploy Automatizado

Crie um script para facilitar atualizações:

```bash
nano /var/www/cartaodetodos/deploy.sh
```

Cole:

```bash
#!/bin/bash
cd /var/www/cartaodetodos
git pull
npm install
pm2 restart cartaodetodos
echo "✅ Deploy concluído!"
```

Tornar executável:

```bash
chmod +x deploy.sh
```

Usar:

```bash
./deploy.sh
```

---

## 🐛 Troubleshooting

### Aplicação não inicia

```bash
# Ver logs do PM2
pm2 logs cartaodetodos --lines 50

# Verificar se a porta está em uso
sudo lsof -i :3000

# Verificar variáveis de ambiente
pm2 env cartaodetodos
```

### Nginx não funciona

```bash
# Verificar configuração
sudo nginx -t

# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Erro de permissões

```bash
# Dar permissões ao usuário
sudo chown -R $USER:$USER /var/www/cartaodetodos
```

---

## ✅ Checklist Final

- [ ] Node.js instalado
- [ ] PM2 instalado e configurado
- [ ] Aplicação rodando com PM2
- [ ] Nginx configurado
- [ ] SSL configurado (se tiver domínio)
- [ ] Firewall configurado
- [ ] Variáveis de ambiente configuradas
- [ ] Testado acesso via navegador

---

## 🎯 Resumo Rápido

**Comandos essenciais após configuração inicial:**

```bash
# Atualizar código
cd /var/www/cartaodetodos && git pull && npm install && pm2 restart cartaodetodos

# Ver logs
pm2 logs cartaodetodos

# Ver status
pm2 status
```

**URLs importantes:**
- Aplicação: `http://SEU_IP:3000` ou `https://SEU_DOMINIO.com.br`
- Status PM2: `pm2 status`
- Logs: `pm2 logs`

---

## 📞 Suporte

Se tiver problemas, verifique:
1. Logs do PM2: `pm2 logs cartaodetodos`
2. Logs do Nginx: `sudo tail -f /var/log/nginx/error.log`
3. Status do serviço: `pm2 status` e `sudo systemctl status nginx`



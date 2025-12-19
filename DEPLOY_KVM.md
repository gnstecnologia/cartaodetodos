# 🚀 Guia de Deploy em Hospedagem KVM 2 (VPS)

Este guia é específico para hospedagem KVM/VPS (como Hostinger, DigitalOcean, etc.) com Ubuntu.

## ✅ O Projeto Está Pronto?

**SIM!** O projeto está 100% pronto para rodar em VPS. Ele vai rodar como um **servidor Node.js** usando **PM2** para manter o processo ativo.

---

## 🎯 Como o Projeto Vai Rodar

### Arquitetura:

```
┌─────────────────┐
│   Nginx (80/443)│  ← Recebe requisições HTTP/HTTPS
└────────┬────────┘
         │ Proxy Reverso
         ▼
┌─────────────────┐
│  Node.js (3000) │  ← Servidor Express rodando
│   + PM2         │  ← Mantém processo ativo
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Google Sheets  │  ← API do Google Sheets
└─────────────────┘
```

### Fluxo:
1. **Usuário acessa** → `https://seudominio.com.br`
2. **Nginx recebe** → Porta 80/443
3. **Nginx redireciona** → `http://localhost:3000` (Node.js)
4. **Node.js processa** → Serve HTML/CSS/JS e API
5. **API consulta** → Google Sheets quando necessário

---

## 📋 Pré-requisitos

- ✅ VPS KVM com Ubuntu 20.04+ ou 22.04+
- ✅ Acesso SSH (root ou usuário com sudo)
- ✅ Domínio apontando para IP da VPS (opcional, mas recomendado)
- ✅ Pelo menos 1GB RAM (KVM 2 tem 2GB, suficiente!)

---

## 🚀 Passo a Passo Completo

### 1️⃣ Conectar na VPS

```bash
ssh root@SEU_IP_DA_VPS
# ou
ssh usuario@SEU_IP_DA_VPS
```

### 2️⃣ Atualizar Sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### 3️⃣ Instalar Node.js 20.x

```bash
# Instalar Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verificar instalação
node --version  # Deve mostrar v20.x.x
npm --version   # Deve mostrar 10.x.x
```

### 4️⃣ Instalar PM2 (Gerenciador de Processos)

```bash
sudo npm install -g pm2
```

**Por que PM2?**
- ✅ Mantém o servidor rodando mesmo após reiniciar
- ✅ Reinicia automaticamente se o processo cair
- ✅ Logs organizados
- ✅ Fácil gerenciamento

### 5️⃣ Instalar Nginx (Reverse Proxy)

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 6️⃣ Clonar Repositório

```bash
# Criar diretório para aplicações
sudo mkdir -p /var/www
cd /var/www

# Clonar repositório
sudo git clone https://github.com/gnstecnologia/cartaodetodos.git
sudo chown -R $USER:$USER /var/www/cartaodetodos
cd cartaodetodos
```

### 7️⃣ Instalar Dependências

```bash
npm install --production
```

### 8️⃣ Configurar Variáveis de Ambiente

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

### 9️⃣ Iniciar com PM2

```bash
# Iniciar aplicação
pm2 start server.js --name cartaodetodos

# Configurar para iniciar automaticamente ao reiniciar
pm2 startup
# Execute o comando que aparecer na tela (algo como: sudo env PATH=...)

pm2 save

# Ver status
pm2 status
pm2 logs cartaodetodos
```

### 🔟 Configurar Nginx

```bash
sudo nano /etc/nginx/sites-available/cartaodetodos
```

Cole esta configuração:

```nginx
server {
    listen 80;
    server_name SEU_DOMINIO.com.br;  # ou IP da VPS se não tiver domínio

    # Tamanho máximo de upload
    client_max_body_size 10M;

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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Ativar o site:

```bash
sudo ln -s /etc/nginx/sites-available/cartaodetodos /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Remove configuração padrão
sudo nginx -t  # Testa configuração
sudo systemctl reload nginx
```

### 1️⃣1️⃣ Configurar Firewall

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

### 1️⃣2️⃣ Configurar SSL (Let's Encrypt) - Opcional mas Recomendado

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d SEU_DOMINIO.com.br
```

Siga as instruções na tela. O certificado será renovado automaticamente.

---

## 🔧 Comandos Úteis

### Gerenciar com PM2

```bash
# Ver status
pm2 status

# Ver logs em tempo real
pm2 logs cartaodetodos

# Ver últimas 50 linhas
pm2 logs cartaodetodos --lines 50

# Reiniciar aplicação
pm2 restart cartaodetodos

# Parar aplicação
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

### Verificar se Está Rodando

```bash
# Verificar processo Node.js
pm2 status

# Verificar porta 3000
sudo netstat -tlnp | grep 3000

# Verificar Nginx
sudo systemctl status nginx

# Testar API
curl http://localhost:3000/api/health
```

---

## 📊 Monitoramento de Recursos (KVM 2 - 2GB RAM)

### Verificar Uso de Memória

```bash
# Uso geral
free -h

# Processos usando mais memória
pm2 monit

# Uso por processo
ps aux --sort=-%mem | head -10
```

**Expectativa de uso:**
- Node.js: ~100-200MB RAM
- Nginx: ~10-20MB RAM
- Sistema: ~200-300MB RAM
- **Total: ~500-700MB** (bem dentro dos 2GB!)

### Otimizar Memória (se necessário)

```bash
# Limitar memória do Node.js (se precisar)
pm2 start server.js --name cartaodetodos --max-memory-restart 500M
```

---

## 🐛 Troubleshooting

### Aplicação não inicia

```bash
# Ver logs detalhados
pm2 logs cartaodetodos --lines 100

# Verificar variáveis de ambiente
pm2 env cartaodetodos

# Verificar se porta está em uso
sudo lsof -i :3000

# Reiniciar PM2
pm2 restart cartaodetodos
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

# Verificar permissões do .env
ls -la .env
```

### Erro de conexão com Google Sheets

```bash
# Verificar variáveis de ambiente
cat .env | grep GOOGLE

# Testar conexão manualmente
node test-connection.js  # Se ainda tiver o arquivo
```

---

## 🔄 Script de Deploy Automatizado

Crie um script para facilitar atualizações:

```bash
nano /var/www/cartaodetodos/deploy.sh
```

Cole:

```bash
#!/bin/bash
cd /var/www/cartaodetodos
echo "📥 Atualizando código..."
git pull
echo "📦 Instalando dependências..."
npm install --production
echo "🔄 Reiniciando aplicação..."
pm2 restart cartaodetodos
echo "✅ Deploy concluído!"
pm2 logs cartaodetodos --lines 20
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

## ✅ Checklist Final

- [ ] Node.js 20.x instalado
- [ ] PM2 instalado e configurado
- [ ] Aplicação rodando com PM2
- [ ] PM2 configurado para iniciar automaticamente
- [ ] Nginx configurado e funcionando
- [ ] Firewall configurado
- [ ] SSL configurado (se tiver domínio)
- [ ] Variáveis de ambiente configuradas (.env)
- [ ] Testado acesso via navegador
- [ ] Testado API: `/api/health`

---

## 🎯 Resumo Rápido

**Como o projeto roda:**

1. **PM2** inicia o `server.js` na porta 3000
2. **Nginx** recebe requisições na porta 80/443
3. **Nginx** redireciona para `localhost:3000`
4. **Node.js** serve os arquivos HTML/CSS/JS e processa APIs
5. **Google Sheets API** é consultada quando necessário

**Comandos essenciais:**

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs cartaodetodos

# Reiniciar
pm2 restart cartaodetodos

# Atualizar código
cd /var/www/cartaodetodos && git pull && npm install && pm2 restart cartaodetodos
```

---

## 📞 Suporte

Se tiver problemas:

1. **Logs do PM2**: `pm2 logs cartaodetodos --lines 100`
2. **Logs do Nginx**: `sudo tail -f /var/log/nginx/error.log`
3. **Status dos serviços**: `pm2 status` e `sudo systemctl status nginx`
4. **Testar API**: `curl http://localhost:3000/api/health`

---

## 🚀 Pronto para Produção!

Seu projeto está configurado e pronto para rodar 24/7 na sua VPS KVM 2! 🎉


# 🔐 Configuração de SSL/HTTPS na VPS

Este guia explica como configurar SSL/HTTPS para o Cartão de Todos na VPS.

## 📋 Pré-requisitos

1. ✅ Servidor Node.js rodando na porta 3000
2. ✅ Domínio `cartaodetodos.cloud` apontando para o IP da VPS
3. ✅ Acesso root à VPS via SSH

## 🚀 Passo a Passo

### 1. Conecte na VPS

```bash
ssh root@72.62.105.86
```

### 2. Navegue até o diretório do projeto

```bash
cd /var/www/cartaodetodos
```

### 3. Execute o script de configuração

```bash
bash setup-nginx-ssl.sh
```

O script irá:
- ✅ Instalar Nginx (se não estiver instalado)
- ✅ Instalar Certbot (para certificado SSL)
- ✅ Configurar Nginx como proxy reverso
- ✅ Obter certificado SSL gratuito via Let's Encrypt
- ✅ Configurar renovação automática

### 4. Verificar se está funcionando

Após a execução, acesse:
- ✅ https://cartaodetodos.cloud
- ✅ https://www.cartaodetodos.cloud

Ambos devem redirecionar HTTP para HTTPS automaticamente.

## 🔍 Verificação Manual

Se precisar verificar manualmente:

```bash
# Verificar status do Nginx
sudo systemctl status nginx

# Verificar status do PM2 (Node.js)
pm2 status

# Testar configuração do Nginx
sudo nginx -t

# Ver logs do Nginx
sudo tail -f /var/log/nginx/error.log
```

## 🔄 Renovação do Certificado

O certificado SSL é renovado automaticamente pelo Certbot. Para verificar:

```bash
sudo certbot renew --dry-run
```

## ❌ Solução de Problemas

### Erro: "Unable to verify domain"

- Verifique se o DNS está apontando corretamente para a VPS
- Aguarde a propagação do DNS (pode levar até 48h)

### Erro: "Port 80 already in use"

- Pare outros serviços usando a porta 80
- Verifique: `sudo netstat -tulpn | grep :80`

### Nginx não inicia

- Verifique logs: `sudo tail /var/log/nginx/error.log`
- Teste configuração: `sudo nginx -t`

## 📝 Arquivos Importantes

- **Configuração Nginx**: `/etc/nginx/sites-available/cartaodetodos.cloud`
- **Certificados SSL**: `/etc/letsencrypt/live/cartaodetodos.cloud/`
- **Logs Nginx**: `/var/log/nginx/`

# 🚀 Deploy na Hostinger VPS - Guia Rápido

Guia específico para VPS Hostinger KVM 2 (Ubuntu 24.04).

## ✅ Checklist Pré-Deploy

Antes de começar, tenha em mãos:

- [ ] **IP da VPS**: `72.62.105.86` (já tem!)
- [ ] **Acesso SSH**: `ssh root@72.62.105.86`
- [ ] **Senha root** (ou chave SSH)
- [ ] **ID da Planilha Google Sheets**
- [ ] **Email da Service Account do Google**
- [ ] **Chave Privada do Google** (completa)
- [ ] **Domínio** (opcional, mas recomendado)

## 🚀 Deploy Automatizado (Recomendado)

### Passo 1: Conectar na VPS

```bash
ssh root@72.62.105.86
```

### Passo 2: Baixar e Executar Script

```bash
# Baixar script
wget https://raw.githubusercontent.com/gnstecnologia/cartaodetodos/main/deploy-automatico.sh

# Tornar executável
chmod +x deploy-automatico.sh

# Executar
bash deploy-automatico.sh
```

### Passo 3: Responder as Perguntas

O script vai perguntar:
1. **Domínio ou IP**: `72.62.105.86` (ou seu domínio se tiver)
2. **ID da Planilha**: Cole o ID da sua planilha
3. **Email Service Account**: Cole o email
4. **Chave Privada**: Cole a chave completa (digite 'FIM' quando terminar)
5. **Nome das abas**: Enter para usar padrão (Leads/Promotor)
6. **Senha Dashboard**: Enter para 'admin123' ou digite outra
7. **Webhook**: Enter para pular (ou cole URL)
8. **SSL**: `s` se tiver domínio, `n` se usar só IP

### Passo 4: Aguardar Conclusão

O script vai:
- ✅ Instalar tudo automaticamente
- ✅ Configurar PM2
- ✅ Configurar Nginx
- ✅ Configurar Firewall
- ✅ Configurar SSL (se escolheu)

## 📋 Informações da Sua VPS

- **IP**: `72.62.105.86`
- **OS**: Ubuntu 24.04 LTS
- **RAM**: 8GB (KVM 2)
- **CPU**: 2 cores
- **Disco**: 100GB
- **SSH**: `root@72.62.105.86`

## ⚠️ Observações Importantes

### 1. Reinicialização Necessária

O sistema mostrou que precisa reiniciar. **Recomendado**:

```bash
# Após o deploy, reinicie
sudo reboot
```

A aplicação iniciará automaticamente após reiniciar (graças ao PM2).

### 2. Firewall da Hostinger

A Hostinger pode ter firewall próprio no painel. Verifique:
- Painel Hostinger → VPS → Security → Firewall
- Permita portas: 22, 80, 443

### 3. Sem Domínio (Usando IP)

Se não tiver domínio:
- Use o IP: `72.62.105.86`
- Não configure SSL (responda `n`)
- Acesse: `http://72.62.105.86`

### 4. Com Domínio

Se tiver domínio:
1. Configure DNS apontando para `72.62.105.86`
2. Aguarde propagação (pode levar algumas horas)
3. No script, responda `s` para SSL
4. Acesse: `https://seudominio.com.br`

## 🔧 Comandos Úteis Após Deploy

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs cartaodetodos

# Reiniciar
pm2 restart cartaodetodos

# Atualizar código
cd /var/www/cartaodetodos
git pull
npm install
pm2 restart cartaodetodos
```

## 🐛 Troubleshooting

### Erro: "Permission denied"
```bash
sudo chown -R $USER:$USER /var/www/cartaodetodos
```

### Erro: "Port 3000 already in use"
```bash
# Ver o que está usando
sudo lsof -i :3000
# Parar processo
pm2 delete cartaodetodos
# Reiniciar
pm2 start /var/www/cartaodetodos/server.js --name cartaodetodos
```

### Nginx não funciona
```bash
# Verificar configuração
sudo nginx -t

# Ver logs
sudo tail -f /var/log/nginx/error.log

# Reiniciar
sudo systemctl restart nginx
```

### Aplicação não inicia
```bash
# Ver logs detalhados
pm2 logs cartaodetodos --lines 100

# Verificar .env
cat /var/www/cartaodetodos/.env

# Testar manualmente
cd /var/www/cartaodetodos
node server.js
```

## ✅ Verificação Final

Após o deploy, teste:

1. **API Health Check**:
   ```bash
   curl http://localhost:3000/api/health
   ```
   Deve retornar: `{"status":"ok",...}`

2. **Acesso via Nginx**:
   ```bash
   curl http://72.62.105.86/api/health
   ```
   Deve retornar o mesmo

3. **Acesso via Navegador**:
   - Abra: `http://72.62.105.86`
   - Deve carregar a página inicial

## 🎯 Próximos Passos

1. ✅ Execute o script de deploy
2. ✅ Reinicie a VPS: `sudo reboot`
3. ✅ Teste o acesso
4. ✅ Configure domínio (se tiver)
5. ✅ Configure SSL (se tiver domínio)

---

**Pronto para começar!** 🚀


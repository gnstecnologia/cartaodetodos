# 🚀 COMECE AQUI - Deploy na Hostinger VPS

## ✅ Você já tem:
- ✅ VPS Hostinger configurada (Ubuntu 24.04)
- ✅ IP: `72.62.105.86`
- ✅ Acesso SSH: `ssh root@72.62.105.86`
- ✅ Script de deploy automatizado pronto

## 📋 O que você precisa ter em mãos:

Antes de começar, prepare estas informações:

1. **ID da Planilha Google Sheets**
   - Abra sua planilha no Google Sheets
   - Na URL: `https://docs.google.com/spreadsheets/d/SEU_ID_AQUI/edit`
   - Copie o ID (parte entre `/d/` e `/edit`)

2. **Email da Service Account do Google**
   - No arquivo JSON que você baixou do Google Cloud
   - Procure por `"client_email"`
   - Exemplo: `robocartaodetodos@cartaodetodos-478014.iam.gserviceaccount.com`

3. **Chave Privada do Google**
   - No mesmo arquivo JSON
   - Procure por `"private_key"`
   - Copie TUDO, incluindo `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`

4. **Domínio (opcional)**
   - Se tiver domínio apontando para `72.62.105.86`
   - Ou use só o IP: `72.62.105.86`

---

## 🎯 PASSO A PASSO - Execute Agora:

### Passo 1: Conectar na VPS

Abra o terminal/PowerShell e execute:

```bash
ssh root@72.62.105.86
```

Digite a senha quando solicitado.

### Passo 2: Baixar o Script

Na VPS, execute:

```bash
wget https://raw.githubusercontent.com/gnstecnologia/cartaodetodos/main/deploy-automatico.sh
```

### Passo 3: Tornar Executável

```bash
chmod +x deploy-automatico.sh
```

### Passo 4: Executar o Script

```bash
bash deploy-automatico.sh
```

### Passo 5: Responder as Perguntas

O script vai perguntar:

1. **Domínio ou IP**: 
   - Digite: `72.62.105.86` (ou seu domínio se tiver)

2. **ID da Planilha Google Sheets**: 
   - Cole o ID que você copiou

3. **Email da Service Account**: 
   - Cole o email (ex: `robocartaodetodos@...`)

4. **Chave Privada**: 
   - Cole a chave completa
   - Quando terminar, digite `FIM` e pressione Enter

5. **Nome da aba de Leads**: 
   - Pressione Enter (usa padrão: `Leads`)

6. **Nome da aba de Promotores**: 
   - Pressione Enter (usa padrão: `Promotor`)

7. **Senha do Dashboard**: 
   - Pressione Enter (usa `admin123`) ou digite outra

8. **URL do Webhook**: 
   - Pressione Enter (pula se não tiver)

9. **Configurar SSL?**: 
   - Digite `n` (não) se usar só IP
   - Digite `s` (sim) se tiver domínio

### Passo 6: Aguardar

O script vai instalar tudo automaticamente. Pode levar 5-10 minutos.

### Passo 7: Reiniciar (Importante!)

Após o script terminar, reinicie a VPS:

```bash
sudo reboot
```

Aguarde 1-2 minutos e reconecte:

```bash
ssh root@72.62.105.86
```

### Passo 8: Verificar se Está Funcionando

```bash
# Ver status
pm2 status

# Ver logs
pm2 logs cartaodetodos

# Testar API
curl http://localhost:3000/api/health
```

### Passo 9: Acessar no Navegador

Abra no navegador:
- `http://72.62.105.86`

Deve carregar a página inicial!

---

## 🎉 Pronto!

Seu projeto está no ar! 🚀

---

## 📝 Comandos Úteis Depois

```bash
# Ver status da aplicação
pm2 status

# Ver logs em tempo real
pm2 logs cartaodetodos

# Reiniciar aplicação
pm2 restart cartaodetodos

# Atualizar código (quando fizer mudanças)
cd /var/www/cartaodetodos
git pull
npm install
pm2 restart cartaodetodos
```

---

## 🐛 Se Algo Der Errado

### Aplicação não inicia:
```bash
pm2 logs cartaodetodos --lines 100
```

### Verificar se está rodando:
```bash
pm2 status
curl http://localhost:3000/api/health
```

### Verificar Nginx:
```bash
sudo systemctl status nginx
sudo nginx -t
```

---

## ✅ Checklist Rápido

- [ ] Conectei na VPS
- [ ] Baixei o script
- [ ] Executei o script
- [ ] Respondi todas as perguntas
- [ ] Reiniciei a VPS
- [ ] Testei o acesso
- [ ] Está funcionando! 🎉

---

**Agora é só seguir os passos acima!** 🚀


# 📋 Informações Necessárias para Deploy Automatizado

Para fazer o deploy completo e automatizado, você precisa fornecer estas informações:

## 🔑 Informações Obrigatórias

### 1. **Domínio ou IP da VPS**
- **O que é**: O domínio (ex: `cartaodetodos.com.br`) ou IP da sua VPS
- **Onde encontrar**: 
  - Domínio: Se você tem um domínio configurado
  - IP: No painel da sua hospedagem (Hostinger, DigitalOcean, etc.)
- **Exemplo**: `cartaodetodos.com.br` ou `192.168.1.100`

### 2. **ID da Planilha Google Sheets (SPREADSHEET_ID)**
- **O que é**: O ID único da sua planilha do Google Sheets
- **Onde encontrar**: 
  1. Abra sua planilha no Google Sheets
  2. Olhe a URL: `https://docs.google.com/spreadsheets/d/SEU_ID_AQUI/edit`
  3. O ID é a parte entre `/d/` e `/edit`
- **Exemplo**: `1LEUBhIGrXZ5A_WUyvof-47iwd1P-5-DpIw2BcO-k9yY`

### 3. **Email da Service Account do Google (GOOGLE_SERVICE_ACCOUNT_EMAIL)**
- **O que é**: O email da conta de serviço do Google Cloud
- **Onde encontrar**: 
  - No arquivo JSON de credenciais que você baixou do Google Cloud Console
  - Procure por `"client_email"`
- **Exemplo**: `robocartaodetodos@cartaodetodos-478014.iam.gserviceaccount.com`

### 4. **Chave Privada do Google (GOOGLE_PRIVATE_KEY)**
- **O que é**: A chave privada completa da Service Account
- **Onde encontrar**: 
  - No arquivo JSON de credenciais
  - Procure por `"private_key"`
  - É uma string longa que começa com `-----BEGIN PRIVATE KEY-----`
- **Exemplo**: 
```
-----BEGIN PRIVATE KEY-----
MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDRvPtEui2bc8jh
... (várias linhas) ...
-----END PRIVATE KEY-----
```
- **⚠️ IMPORTANTE**: Copie a chave completa, incluindo as linhas `-----BEGIN PRIVATE KEY-----` e `-----END PRIVATE KEY-----`

## 📝 Informações Opcionais (com valores padrão)

### 5. **Nome da Aba de Leads**
- **Padrão**: `Leads`
- **O que é**: Nome da aba na planilha onde ficam os leads
- **Quando mudar**: Se você usou outro nome para a aba

### 6. **Nome da Aba de Promotores**
- **Padrão**: `Promotor`
- **O que é**: Nome da aba na planilha onde ficam os promotores
- **Quando mudar**: Se você usou outro nome para a aba

### 7. **Senha do Dashboard**
- **Padrão**: `admin123`
- **O que é**: Senha para acessar o dashboard administrativo
- **⚠️ RECOMENDADO**: Mude para uma senha forte em produção

### 8. **URL do Webhook (Opcional)**
- **Padrão**: Vazio (não usado)
- **O que é**: URL para receber notificações quando novos leads são cadastrados
- **Quando usar**: Se você tem um sistema externo que precisa ser notificado

### 9. **Configurar SSL/HTTPS?**
- **Padrão**: `n` (não)
- **O que é**: Se deseja configurar certificado SSL gratuito (Let's Encrypt)
- **Recomendado**: `s` (sim) se tiver domínio
- **Requer**: Domínio apontando para o IP da VPS

---

## 📦 Como Obter as Informações do Google

### Passo 1: Acessar Google Cloud Console
1. Acesse: https://console.cloud.google.com
2. Selecione seu projeto (ou crie um novo)

### Passo 2: Criar Service Account
1. Vá em **IAM & Admin** > **Service Accounts**
2. Clique em **Create Service Account**
3. Dê um nome (ex: "Cartão de Todos API")
4. Clique em **Create and Continue**
5. Role: **Editor** (ou **Viewer** se só ler)
6. Clique em **Done**

### Passo 3: Criar Chave JSON
1. Clique na Service Account criada
2. Vá na aba **Keys**
3. Clique em **Add Key** > **Create new key**
4. Escolha **JSON**
5. Baixe o arquivo JSON

### Passo 4: Extrair Informações
Abra o arquivo JSON baixado e você encontrará:
- `client_email` → **GOOGLE_SERVICE_ACCOUNT_EMAIL**
- `private_key` → **GOOGLE_PRIVATE_KEY**

### Passo 5: Compartilhar Planilha
1. Abra sua planilha no Google Sheets
2. Clique em **Compartilhar**
3. Cole o email da Service Account (o `client_email`)
4. Dê permissão de **Editor**
5. Clique em **Enviar**

---

## 🚀 Como Usar o Script Automatizado

### Opção 1: Executar Diretamente na VPS

```bash
# Conectar na VPS
ssh root@SEU_IP_DA_VPS

# Baixar script
wget https://raw.githubusercontent.com/gnstecnologia/cartaodetodos/main/deploy-automatico.sh

# Tornar executável
chmod +x deploy-automatico.sh

# Executar
sudo bash deploy-automatico.sh
```

O script vai perguntar todas as informações acima interativamente!

### Opção 2: Preparar Informações Antes

Crie um arquivo com suas informações (não commite no Git!):

```bash
nano minhas-credenciais.txt
```

Cole suas informações:
```
DOMINIO=cartaodetodos.com.br
SPREADSHEET_ID=1LEUBhIGrXZ5A_WUyvof-47iwd1P-5-DpIw2BcO-k9yY
GOOGLE_EMAIL=robocartaodetodos@cartaodetodos-478014.iam.gserviceaccount.com
GOOGLE_KEY="-----BEGIN PRIVATE KEY-----\n..."
```

Depois execute o script e use essas informações quando perguntado.

---

## ✅ Checklist Antes de Começar

- [ ] Tenho acesso SSH à VPS
- [ ] Tenho o ID da planilha Google Sheets
- [ ] Tenho a Service Account criada no Google Cloud
- [ ] Tenho o arquivo JSON da Service Account
- [ ] Compartilhei a planilha com o email da Service Account
- [ ] Tenho domínio configurado (ou sei o IP da VPS)
- [ ] Domínio aponta para o IP da VPS (se usar SSL)

---

## 🔒 Segurança

⚠️ **NUNCA compartilhe ou commite no Git:**
- Arquivo JSON da Service Account
- Chave privada
- Senha do dashboard
- Arquivo `.env`

✅ **O script cria o arquivo `.env` automaticamente e com permissões seguras (600)**

---

## 📞 Precisa de Ajuda?

Se tiver dúvidas sobre alguma informação:
1. Verifique o arquivo `COMO_CRIAR_ENV.md` (se ainda existir)
2. Consulte a documentação do Google Cloud
3. Verifique os logs: `pm2 logs cartaodetodos`


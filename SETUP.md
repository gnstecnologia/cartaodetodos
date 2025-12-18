# Guia Rápido de Configuração

## Passo a Passo para Configurar o Projeto

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Google Cloud

1. Acesse: https://console.cloud.google.com/
2. Crie um projeto novo
3. Ative a API do Google Sheets:
   - Vá em "APIs & Services" > "Library"
   - Busque "Google Sheets API"
   - Clique em "Enable"

### 3. Criar Service Account

1. Vá em "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "Service Account"
3. Dê um nome (ex: "cartaodetodos-api")
4. Clique em "Create and Continue"
5. Pule as permissões (opcional)
6. Clique em "Done"
7. Clique no Service Account criado
8. Vá na aba "Keys"
9. Clique em "Add Key" > "Create new key"
10. Escolha "JSON" e baixe o arquivo

### 4. Configurar Planilha

1. Abra sua planilha do Google Sheets
2. Clique em "Compartilhar" (botão azul no canto superior direito)
3. No campo de email, cole o email do Service Account
   - O email está no arquivo JSON baixado, campo `client_email`
   - Exemplo: `cartaodetodos-api@projeto-123456.iam.gserviceaccount.com`
4. Dê permissão de "Editor"
5. Clique em "Enviar"

### 5. Configurar .env

1. Copie `.env.example` para `.env`:
   ```bash
   cp .env.example .env
   ```

2. Abra o arquivo JSON do Service Account baixado

3. Preencha o `.env`:

```env
READSHEET_ID=cole_o_id_aqui
# ID da planilha (pegue da URL: https://docs.google.com/spreadsheets/d/ID_AQUI/edit)
SP
# Nomes das abas (padrão)
GOOGLE_SHEETS_LEADS_SHEET=Leads
GOOGLE_SHEETS_PROMOTOR_SHEET=Promotor

# Do arquivo JSON do Service Account:
GOOGLE_SERVICE_ACCOUNT_EMAIL=client_email_do_json
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\ncole_a_chave_privada_aqui\n-----END PRIVATE KEY-----\n"

# Porta (padrão 3000)
PORT=3000

# Senha do dashboard (ALTERE!)
DASHBOARD_PASSWORD=admin123

# Webhook (opcional, deixe vazio se não usar)
WEBHOOK_URL=
```

**IMPORTANTE sobre GOOGLE_PRIVATE_KEY:**
- Copie todo o conteúdo do campo `private_key` do JSON
- Mantenha as quebras de linha como `\n`
- Mantenha as aspas duplas ao redor

Exemplo:
```env
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQC...\n-----END PRIVATE KEY-----\n"
```

### 6. Testar Localmente

```bash
npm start
```

O servidor deve iniciar na porta 3000. Acesse:
- http://localhost:3000/api/health (deve retornar `{"ok":true,"status":"online"}`)

### 7. Configurar Frontend

Adicione no início de `index.html`, `dashboard.html` e `crm.html` (antes de outros scripts):

```html
<script>
  window.API_BASE_URL = 'http://localhost:3000';
</script>
```

Para produção, altere para sua URL:
```html
<script>
  window.API_BASE_URL = 'https://api.seudominio.com';
</script>
```

### 8. Estrutura da Planilha

O sistema criará automaticamente as colunas necessárias na aba "Leads" se não existirem:

- Data e Hora
- Nome
- Telefone
- Código de Indicação
- Origem
- Site
- Status
- Log de Status
- Última Mudança de Status
- Data Última Mudança

A aba "Promotor" deve ter:
- ID
- Nome
- Telefone
- Chave Pix (opcional)
- URL (opcional)

### 9. Deploy em VPS

#### Opção 1: PM2 (Recomendado)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar
pm2 start server.js --name cartaodetodos

# Ver logs
pm2 logs cartaodetodos

# Reiniciar
pm2 restart cartaodetodos

# Parar
pm2 stop cartaodetodos
```

#### Opção 2: systemd

Crie `/etc/systemd/system/cartaodetodos.service`:

```ini
[Unit]
Description=Cartão de Todos API
After=network.target

[Service]
Type=simple
User=seu-usuario
WorkingDirectory=/caminho/para/cartaodetodos
ExecStart=/usr/bin/node server.js
Restart=always

[Install]
WantedBy=multi-user.target
```

Depois:
```bash
sudo systemctl enable cartaodetodos
sudo systemctl start cartaodetodos
sudo systemctl status cartaodetodos
```

### 10. Verificar se Está Funcionando

1. Acesse a landing page: `http://localhost:3000` (ou sua URL)
2. Preencha o formulário
3. Verifique se o lead aparece na planilha
4. Acesse o dashboard: `http://localhost:3000/dashboard.html`
5. Acesse o CRM: `http://localhost:3000/crm.html`

## Problemas Comuns

### "Permission denied" ao acessar planilha
- Verifique se compartilhou a planilha com o email do Service Account
- Verifique se deu permissão de "Editor"

### "Invalid credentials"
- Verifique se copiou a chave privada completa no `.env`
- Verifique se as quebras de linha estão como `\n`
- Verifique se está entre aspas duplas

### Leads não aparecem
- Verifique se a aba se chama exatamente "Leads" (case-sensitive)
- Verifique se o `SPREADSHEET_ID` está correto
- Verifique os logs do servidor: `pm2 logs` ou `npm start`

### CORS Error no navegador
- Certifique-se de que o frontend está apontando para a URL correta da API
- Em produção, configure CORS no servidor se necessário

## Próximos Passos

1. Altere a senha do dashboard no `.env`
2. Configure HTTPS em produção
3. Configure backup da planilha
4. Configure monitoramento (opcional)


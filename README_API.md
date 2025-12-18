# API Cartão de Todos - Google Sheets

Este projeto foi recriado para usar Google Sheets API diretamente, sem depender do Google Apps Script. O sistema agora pode ser hospedado em uma VPS.

## 🚀 Estrutura do Projeto

- **Backend**: Node.js + Express + Google Sheets API
- **Frontend**: HTML/CSS/JavaScript (sem mudanças visuais)
- **Banco de Dados**: Google Sheets (Leads e Promotor)

## 📋 Pré-requisitos

1. Node.js 18+ instalado
2. Conta Google Cloud com projeto criado
3. Service Account criado no Google Cloud
4. Planilha Google Sheets criada e compartilhada com o Service Account

## 🔧 Configuração

### 1. Criar Projeto no Google Cloud

1. Acesse [Google Cloud Console](https://console.cloud.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Ative a API do Google Sheets:
   - Vá em "APIs & Services" > "Library"
   - Busque por "Google Sheets API"
   - Clique em "Enable"

### 2. Criar Service Account

1. Vá em "APIs & Services" > "Credentials"
2. Clique em "Create Credentials" > "Service Account"
3. Preencha os dados e crie
4. Clique no Service Account criado
5. Vá na aba "Keys"
6. Clique em "Add Key" > "Create new key"
7. Escolha "JSON" e baixe o arquivo

### 3. Configurar Planilha

1. Abra sua planilha do Google Sheets
2. Clique em "Compartilhar" (Share)
3. Adicione o email do Service Account (encontrado no JSON baixado, campo `client_email`)
4. Dê permissão de "Editor"

### 4. Configurar Variáveis de Ambiente

1. Copie o arquivo `.env.example` para `.env`
2. Preencha as variáveis:

```env
# ID da planilha (encontrado na URL: https://docs.google.com/spreadsheets/d/ID_AQUI/edit)
SPREADSHEET_ID=seu_id_da_planilha

# Nomes das abas
GOOGLE_SHEETS_LEADS_SHEET=Leads
GOOGLE_SHEETS_PROMOTOR_SHEET=Promotor

# Dados do Service Account (do JSON baixado)
GOOGLE_SERVICE_ACCOUNT_EMAIL=seu-service-account@projeto.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nChave privada aqui\n-----END PRIVATE KEY-----\n"

# Porta do servidor
PORT=3000

# Senha do dashboard
DASHBOARD_PASSWORD=admin123

# Webhook (opcional)
WEBHOOK_URL=https://seu-webhook.com/endpoint
```

**Importante**: A `GOOGLE_PRIVATE_KEY` deve estar entre aspas e com `\n` para quebras de linha.

### 5. Estrutura da Planilha

#### Aba "Leads"
As seguintes colunas serão criadas automaticamente se não existirem:

| Coluna | Descrição |
|--------|-----------|
| Data e Hora | Data/hora de criação do lead (ISO São Paulo) |
| Nome | Nome do lead |
| Telefone | Telefone do lead |
| Código de Indicação | ID do promotor |
| Origem | Origem do lead (ex: landing-cartao-de-todos) |
| Site | Site de origem (opcional) |
| Status | Status atual (Nova Indicação, Em Contato, etc.) |
| Log de Status | JSON com histórico de mudanças |
| Última Mudança de Status | Último status aplicado |
| Data Última Mudança | Data/hora da última mudança (ISO São Paulo) |

#### Aba "Promotor"
| Coluna | Descrição |
|--------|-----------|
| ID | ID único do promotor |
| Nome | Nome do promotor |
| Telefone | Telefone do promotor |
| Chave Pix | Chave Pix (opcional) |
| URL | URL personalizada (opcional) |

## 📦 Instalação

```bash
# Instalar dependências
npm install

# Iniciar servidor
npm start

# Ou em modo desenvolvimento (com auto-reload)
npm run dev
```

## 🌐 Configurar Frontend

Atualize a URL da API nos arquivos frontend:

### Opção 1: Variável Global (Recomendado)

Adicione no `<head>` de `index.html`, `dashboard.html` e `crm.html`:

```html
<script>
  window.API_BASE_URL = 'http://localhost:3000'; // Ou sua URL de produção
</script>
```

### Opção 2: Editar Diretamente

Edite `scripts/dashboard.js`, `scripts/crm.js` e `scripts/form-handler.js`:

```javascript
const API_BASE_URL = 'http://localhost:3000'; // Ou sua URL de produção
```

## 🚢 Deploy em VPS

### 1. Instalar Node.js na VPS

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Ou use nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 18
```

### 2. Clonar/Enviar Projeto

```bash
git clone seu-repositorio
cd cartaodetodos
npm install
```

### 3. Configurar .env

```bash
nano .env
# Cole suas variáveis de ambiente
```

### 4. Usar PM2 (Recomendado)

```bash
# Instalar PM2
npm install -g pm2

# Iniciar aplicação
pm2 start server.js --name cartaodetodos

# Salvar configuração
pm2 save
pm2 startup
```

### 5. Configurar Nginx (Opcional)

```nginx
server {
    listen 80;
    server_name seu-dominio.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## ✨ Funcionalidades Implementadas

### Dashboard
- ✅ Filtro de período (data inicial e final)
- ✅ Estatísticas de indicações
- ✅ Ranking de promotores

### CRM Kanban
- ✅ Drag and drop de leads entre colunas
- ✅ Filtro de promotor (dropdown com busca)
- ✅ Filtro de período (data inicial e final)
- ✅ Timeline do lead (histórico de mudanças de status)
- ✅ Log automático de todas as mudanças

### Sistema de Log
- ✅ Todas as mudanças de status são registradas automaticamente
- ✅ Data/hora em formato ISO de São Paulo
- ✅ Timeline completa disponível para cada lead

## 🔒 Segurança

- Altere a senha padrão do dashboard no `.env`
- Use HTTPS em produção
- Mantenha o arquivo `.env` seguro e nunca o commite no Git
- Configure firewall na VPS para permitir apenas portas necessárias

## 📝 API Endpoints

### POST `/api/leads`
Cadastra um novo lead.

**Body:**
```json
{
  "nome": "João Silva",
  "telefone": "21999999999",
  "codigoIndicacao": "1"
}
```

### GET `/api/dashboard?dataInicio=2024-01-01&dataFim=2024-12-31`
Busca dados do dashboard com filtros opcionais.

### POST `/api/leads/:leadId/status`
Atualiza status de um lead.

**Body:**
```json
{
  "status": "Em Contato"
}
```

### GET `/api/leads/:leadId/timeline`
Busca timeline (histórico) de um lead.

## 🐛 Troubleshooting

### Erro: "Permission denied"
- Verifique se o Service Account tem acesso à planilha
- Verifique se a API do Google Sheets está ativada

### Erro: "Invalid credentials"
- Verifique se a `GOOGLE_PRIVATE_KEY` está correta no `.env`
- Certifique-se de que as quebras de linha estão como `\n`

### Leads não aparecem
- Verifique se a aba "Leads" existe na planilha
- Verifique se o `SPREADSHEET_ID` está correto

## 📞 Suporte

Para dúvidas ou problemas, verifique:
1. Logs do servidor (`console.log` ou PM2 logs)
2. Console do navegador (F12)
3. Estrutura da planilha



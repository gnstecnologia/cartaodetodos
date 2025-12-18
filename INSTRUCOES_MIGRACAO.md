# Instruções de Migração - Apps Script para Google Sheets API

## O que mudou?

Este projeto foi **completamente recriado** para usar Google Sheets API diretamente, sem depender do Google Apps Script. Agora você pode hospedar em uma VPS.

## Principais Mudanças

### ✅ Backend Novo
- **Antes**: Google Apps Script (limitado, hospedado no Google)
- **Agora**: Node.js + Express + Google Sheets API (pode hospedar em VPS)

### ✅ Melhorias Implementadas

1. **Dashboard**
   - ✅ Filtro de período (data inicial e final) - **NOVO**
   - ✅ Estatísticas e ranking (mantido)

2. **CRM Kanban**
   - ✅ Filtro de promotor com busca (dropdown) - **NOVO**
   - ✅ Filtro de período (data inicial e final) - **NOVO**
   - ✅ Timeline do lead (histórico completo) - **NOVO**
   - ✅ Drag and drop (mantido)

3. **Sistema de Log**
   - ✅ Log automático de todas as mudanças de status - **NOVO**
   - ✅ Data/hora em formato ISO de São Paulo - **NOVO**
   - ✅ Colunas adicionadas automaticamente na planilha - **NOVO**

## Estrutura da Planilha Atualizada

### Aba "Leads" - Novas Colunas

O sistema criará automaticamente estas colunas se não existirem:

| Coluna | Descrição |
|--------|-----------|
| **Log de Status** | JSON com histórico completo de mudanças |
| **Última Mudança de Status** | Último status aplicado |
| **Data Última Mudança** | Data/hora da última mudança (ISO São Paulo) |

**Exemplo de Log de Status:**
```json
[
  {
    "status": "Nova Indicação",
    "data": "2024-12-10T14:30:00.000Z",
    "origem": "sistema"
  },
  {
    "status": "Em Contato",
    "data": "2024-12-11T09:15:00.000Z",
    "origem": "sistema"
  }
]
```

## Como Migrar

### 1. Configurar Google Cloud

Siga as instruções em `SETUP.md` para:
- Criar projeto no Google Cloud
- Ativar Google Sheets API
- Criar Service Account
- Baixar credenciais JSON

### 2. Compartilhar Planilha

1. Abra sua planilha do Google Sheets
2. Clique em "Compartilhar"
3. Adicione o email do Service Account (do JSON)
4. Dê permissão de "Editor"

### 3. Configurar .env

Copie `.env.example` para `.env` e preencha:

```env
SPREADSHEET_ID=seu_id_da_planilha
GOOGLE_SERVICE_ACCOUNT_EMAIL=email_do_service_account
GOOGLE_PRIVATE_KEY="chave_privada_completa"
DASHBOARD_PASSWORD=admin123
```

### 4. Instalar e Rodar

```bash
npm install
npm start
```

### 5. Atualizar URLs do Frontend

Adicione no `<head>` de cada HTML:

```html
<script>
  window.API_BASE_URL = 'http://localhost:3000'; // Ou sua URL de produção
</script>
```

## Diferenças de Funcionamento

### Antes (Apps Script)
- Endpoint: `https://script.google.com/macros/s/.../exec`
- Limitações de tempo de execução
- Hospedado no Google
- Difícil de debugar

### Agora (Node.js)
- Endpoint: `http://localhost:3000/api/...`
- Sem limitações de tempo
- Pode hospedar em VPS
- Logs completos
- Mais controle

## Novas Funcionalidades

### 1. Filtro de Período no Dashboard

Agora você pode filtrar por:
- Data inicial
- Data final
- Ou ambos

**Antes**: Apenas uma data específica
**Agora**: Período completo (ex: todo o mês de dezembro)

### 2. Filtro de Promotor no CRM

- Dropdown com busca
- Digite para filtrar
- Mostra ID e nome
- Opção "Todos os Promotores"

### 3. Timeline do Lead

Cada lead agora tem uma timeline completa mostrando:
- Quando foi criado
- Todas as mudanças de status
- Data/hora de cada mudança
- Formato ISO de São Paulo

### 4. Log Automático

Todas as mudanças são registradas automaticamente:
- Status anterior
- Status novo
- Data/hora
- Origem (sistema)

## Endpoints da API

### POST `/api/leads`
Cadastra novo lead

### GET `/api/dashboard?dataInicio=2024-01-01&dataFim=2024-12-31`
Busca dados do dashboard (com filtros opcionais)

### POST `/api/leads/:leadId/status`
Atualiza status do lead

### GET `/api/leads/:leadId/timeline`
Busca timeline (histórico) do lead

## Hospedagem em VPS

Agora você pode hospedar em qualquer VPS:

1. **DigitalOcean**
2. **AWS EC2**
3. **Google Cloud Compute Engine**
4. **Azure**
5. **Qualquer VPS com Node.js**

Recomendado usar PM2 para gerenciar o processo:
```bash
npm install -g pm2
pm2 start server.js --name cartaodetodos
pm2 save
pm2 startup
```

## Compatibilidade

- ✅ Mesma estrutura de planilha
- ✅ Mesmos dados
- ✅ Mesma interface visual
- ✅ Funcionalidades mantidas
- ✅ Novas funcionalidades adicionadas

## Suporte

Se tiver problemas:
1. Verifique os logs: `pm2 logs` ou `npm start`
2. Verifique o console do navegador (F12)
3. Verifique se a planilha está compartilhada corretamente
4. Verifique se as credenciais estão corretas no `.env`



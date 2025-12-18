# ✅ Projeto Configurado - Cartão de Todos

## 🎉 Tudo Pronto!

Seu projeto foi recriado e está configurado para usar a planilha existente com Google Sheets API.

## 📋 Informações da Configuração

### Planilha
- **ID**: `1LEUBhIGrXZ5A_WUyvof-47iwd1P-5-DpIw2BcO-k9yY`
- **URL**: https://docs.google.com/spreadsheets/d/1LEUBhIGrXZ5A_WUyvof-47iwd1P-5-DpIw2BcO-k9yY/edit

### Service Account
- **Email**: `robocartaodetodos@cartaodetodos-478014.iam.gserviceaccount.com`
- **Project**: `cartaodetodos-478014`

## 🚀 Passos para Iniciar

### 1. Compartilhar Planilha (OBRIGATÓRIO)

**Este é o passo mais importante!**

1. Abra: https://docs.google.com/spreadsheets/d/1LEUBhIGrXZ5A_WUyvof-47iwd1P-5-DpIw2BcO-k9yY/edit
2. Clique em **"Compartilhar"** (botão azul, canto superior direito)
3. Cole este email: `robocartaodetodos@cartaodetodos-478014.iam.gserviceaccount.com`
4. Dê permissão de **"Editor"**
5. Clique em **"Enviar"**

### 2. Criar Arquivo .env

Crie um arquivo `.env` na raiz do projeto com este conteúdo:

```env
SPREADSHEET_ID=1LEUBhIGrXZ5A_WUyvof-47iwd1P-5-DpIw2BcO-k9yY
GOOGLE_SHEETS_LEADS_SHEET=Leads
GOOGLE_SHEETS_PROMOTOR_SHEET=Promotor
GOOGLE_SERVICE_ACCOUNT_EMAIL=robocartaodetodos@cartaodetodos-478014.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDRvPtEui2bc8jh\nnNAe8dcZxZPxruClBs7MtIsHffhvFicB4ZUa7MViMHG+X2D0RzBrv3j6Ocz2sraL\nkZZcg/8wRq0CRP31PJQE6bPxozBH0+v8PN7Oolp1soDLfW1EJxOhZ7j6D9KbY5cG\nNCx4LijeIH9lLnXWW8wHQDtZ8rYYuaERGp47i7331Fa6xL/7ZUoVSTdPiewuVr9s\nk3KkhVqzAwvFyo7WxRam07mu9NFCDVi7rtGDR4qdUemiUO0kv6TN+O4NYCD8aDpW\n0/o6B/c6L9SahL31x7/kX8bJqxnRUdW1ib1kD60XBtp0LnTu/9CvAN8xcTaWQNmD\nEWzpS7K3AgMBAAECggEAAQzcCeiQFjwFW1KF3O8jahl0rQb4pgA7jzKE6F6HnMV0\nyuFzyy+N/3i0S8U+KYr6YZe9sIG969Wnl1mnx0J78nnFdQJJGUNv5E8Sm8OlmBPQ\nwIcXgIZh7elHvtJxISBm90MbMy6wGcoXtVa+iu2EPonVdCQVlU4JXqyXf32jzso2\nLlkVOts/NgutrVttCzCbyvPeLge+hCGo9nxs03hlLVld2hunZUWHQcxpaapEJR6C\nXQH4vGpxdi1DfxuQMdpIFz/LGlozmKWY9mGStJW+ilt6YAntlj7RknPdgL49zvlS\nDCyKu033mY0FSNdEglFDIa1vWPYehxscMHWD8dUbGQKBgQDoJzaCcpkrg4gbAIO5\n2GFKU1S/NSHf/G6A9OaZtYY75A/aSXMFk41aQydzW/R1B9yZ84VIIDhWeM8NdkgB\n7r7KeBd3D7QDrND4ze/MkKP4Ua7oY4im6ZSQvl/E+O0oEAIh/unZi6hIdACEmmQz\nzqDk8lf9TnaWxJbu9g9ZmLrlrwKBgQDnSFYSNgxkdfGy7H1MYnlqlRq4aP6y+LFv\nG/jK+TmkZ0sv0LedV9HIGIXBY4D2pRKYagesMFf6Un2nfHe3RTvLOsxB9gYgB4qP\nK6SIjJEDYSSwyOKjlr1nGnpBkX505wuOqdAzA6yBfHI/E3nkW/dWqBC+u72GjOh7\nuVBKK3jNeQKBgF7PbO6XeMCRpitI6YMjwJAHOkwgmeYNBOA7pFXQEbMx79t5NbVo\nTkk3tcviGRMWk9x33M3ZAskl64GW9c98PoUXyJWCX0VE9c8246FKzPxj96fGxo9M\nQ7VdWmVqOAitiQFzRvPmmmKEpZWCLDwQPhticdbsjXgDb5TF/vzbaDDXAoGAL65L\nCFAaN+/U12VH46J9k4qPyqrir3Tz54slvHqq9ojRCFeIMyjyt8TOdnMUGEUp00Aw\nur/ws0ukWg4gBCmCzUAe8g5Nbvb/CssdjYUlNEQns0aG6uDdxU7BG5lqL6GeUVgS\n8yFzw/Iq/3P9ciW/lR7q7Nd5mC6ekzs+ITxbGEkCgYANsdCFFFr/VoKb9o1ijkuz\n3+YxSlP3DQBsuKeW5TzAtTy884EKBZWX71hMz+6OEoaRZXuFXIuLEe/uukAmf0yS\nk3WAHCAiIYvzkwzfS0Wl2rqJWofbV/ozBkxJfKeX2lQSl9ZAoolovI3sMMbMi/Zd\nHkEi8rY1Xm/uyqfONBUxJA==\n-----END PRIVATE KEY-----\n"
PORT=3000
NODE_ENV=production
DASHBOARD_PASSWORD=admin123
WEBHOOK_URL=https://backend.kukuna.com.br/webhook/87/Gqj9E1Vm5zv9o7PULYMDuv78P9pNHXyClyKQFkcb6r
```

### 3. Instalar Dependências

```bash
npm install
```

### 4. Testar Conexão

```bash
npm test
```

Este comando vai verificar se:
- ✅ As credenciais estão corretas
- ✅ A planilha está acessível
- ✅ As abas existem

### 5. Iniciar Servidor

```bash
npm start
```

Você deve ver:
```
✅ Google Sheets API conectada com sucesso
✅ Colunas adicionadas: Log de Status, Última Mudança de Status, Data Última Mudança
🚀 Servidor rodando na porta 3000
📊 Planilha: 1LEUBhIGrXZ5A_WUyvof-47iwd1P-5-DpIw2BcO-k9yY
```

### 6. Configurar Frontend

Adicione no `<head>` de `index.html`, `dashboard.html` e `crm.html`:

```html
<script>
  window.API_BASE_URL = 'http://localhost:3000';
</script>
```

## ✨ Funcionalidades Implementadas

### Dashboard
- ✅ Filtro de período (data inicial e final)
- ✅ Estatísticas de indicações
- ✅ Ranking de promotores

### CRM Kanban
- ✅ Drag and drop de leads
- ✅ Filtro de promotor (dropdown com busca)
- ✅ Filtro de período (data inicial e final)
- ✅ Timeline do lead (botão "Ver Timeline" em cada card)
- ✅ Log automático de mudanças

### Sistema de Log
- ✅ Todas as mudanças são registradas automaticamente
- ✅ Data/hora em formato ISO de São Paulo
- ✅ Colunas criadas automaticamente na planilha

## 📝 Estrutura da Planilha

### Aba "Leads" - Colunas Existentes
- A: Data e Hora
- B: Nome
- C: Telefone
- D: Código de Indicação
- E: Origem
- F: Site
- G: Status

### Aba "Leads" - Colunas Adicionadas Automaticamente
- H: Log de Status (JSON com histórico)
- I: Última Mudança de Status
- J: Data Última Mudança

## 🔗 URLs

- **API Health**: http://localhost:3000/api/health
- **Dashboard**: http://localhost:3000/dashboard.html
- **CRM**: http://localhost:3000/crm.html
- **Landing Page**: http://localhost:3000/index.html

## 🐛 Troubleshooting

### Erro: "Permission denied"
**Solução**: Compartilhe a planilha com `robocartaodetodos@cartaodetodos-478014.iam.gserviceaccount.com`

### Erro: "Invalid credentials"
**Solução**: Verifique se copiou a chave privada completa no `.env` (com `\n` e entre aspas)

### Leads não aparecem
**Solução**: 
1. Verifique se a aba se chama "Leads" (case-sensitive)
2. Verifique os logs do servidor
3. Execute `npm test` para diagnosticar

## 📚 Documentação

- `CONFIGURACAO.md` - Guia de configuração detalhado
- `SETUP.md` - Passo a passo completo
- `README_API.md` - Documentação da API
- `INSTRUCOES_MIGRACAO.md` - Guia de migração

## ✅ Checklist Final

- [ ] Planilha compartilhada com Service Account
- [ ] Arquivo `.env` criado e preenchido
- [ ] Dependências instaladas (`npm install`)
- [ ] Conexão testada (`npm test`)
- [ ] Servidor iniciado (`npm start`)
- [ ] Frontend configurado (`window.API_BASE_URL`)
- [ ] Senha do dashboard alterada

---

**Pronto para usar!** 🚀








# 🚀 Como Publicar no Vercel

Este guia vai te ajudar a publicar o aplicativo Cartão de Todos no Vercel.

## 📋 Pré-requisitos

1. Conta no [Vercel](https://vercel.com) (grátis)
2. Conta no [GitHub](https://github.com) (para conectar o repositório)
3. Projeto já configurado localmente

## 🔧 Passo a Passo

### 1. Preparar o Projeto

Certifique-se de que:
- ✅ O arquivo `vercel.json` está na raiz do projeto
- ✅ O arquivo `.env` está no `.gitignore` (não será commitado)
- ✅ Todas as dependências estão no `package.json`

### 2. Criar Repositório no GitHub

Se ainda não tem o projeto no GitHub:

```bash
# Inicializar git (se ainda não fez)
git init

# Adicionar todos os arquivos
git add .

# Fazer commit inicial
git commit -m "Initial commit"

# Criar repositório no GitHub e depois:
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git branch -M main
git push -u origin main
```

### 3. Conectar no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"Add New Project"** ou **"Import Project"**
3. Conecte seu repositório do GitHub
4. Selecione o repositório do projeto

### 4. Configurar Variáveis de Ambiente

No Vercel, vá em **Settings > Environment Variables** e adicione:

#### Variáveis Obrigatórias:

```
SPREADSHEET_ID=1LEUBhIGrXZ5A_WUyvof-47iwd1P-5-DpIw2BcO-k9yY
GOOGLE_SHEETS_LEADS_SHEET=Leads
GOOGLE_SHEETS_PROMOTOR_SHEET=Promotor
GOOGLE_SERVICE_ACCOUNT_EMAIL=robocartaodetodos@cartaodetodos-478014.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDRvPtEui2bc8jh\nnNAe8dcZxZPxruClBs7MtIsHffhvFicB4ZUa7MViMHG+X2D0RzBrv3j6Ocz2sraL\nkZZcg/8wRq0CRP31PJQE6bPxozBH0+v8PN7Oolp1soDLfW1EJxOhZ7j6D9KbY5cG\nNCx4LijeIH9lLnXWW8wHQDtZ8rYYuaERGp47i7331Fa6xL/7ZUoVSTdPiewuVr9s\nk3KkhVqzAwvFyo7WxRam07mu9NFCDVi7rtGDR4qdUemiUO0kv6TN+O4NYCD8aDpW\n0/o6B/c6L9SahL31x7/kX8bJqxnRUdW1ib1kD60XBtp0LnTu/9CvAN8xcTaWQNmD\nEWzpS7K3AgMBAAECggEAAQzcCeiQFjwFW1KF3O8jahl0rQb4pgA7jzKE6F6HnMV0\nyuFzyy+N/3i0S8U+KYr6YZe9sIG969Wnl1mnx0J78nnFdQJJGUNv5E8Sm8OlmBPQ\nwIcXgIZh7elHvtJxISBm90MbMy6wGcoXtVa+iu2EPonVdCQVlU4JXqyXf32jzso2\nLlkVOts/NgutrVttCzCbyvPeLge+hCGo9nxs03hlLVld2hunZUWHQcxpaapEJR6C\nXQH4vGpxdi1DfxuQMdpIFz/LGlozmKWY9mGStJW+ilt6YAntlj7RknPdgL49zvlS\nDCyKu033mY0FSNdEglFDIa1vWPYehxscMHWD8dUbGQKBgQDoJzaCcpkrg4gbAIO5\n2GFKU1S/NSHf/G6A9OaZtYY75A/aSXMFk41aQydzW/R1B9yZ84VIIDhWeM8NdkgB\n7r7KeBd3D7QDrND4ze/MkKP4Ua7oY4im6ZSQvl/E+O0oEAIh/unZi6hIdACEmmQz\nzqDk8lf9TnaWxJbu9g9ZmLrlrwKBgQDnSFYSNgxkdfGy7H1MYnlqlRq4aP6y+LFv\nG/jK+TmkZ0sv0LedV9HIGIXBY4D2pRKYagesMFf6Un2nfHe3RTvLOsxB9gYgB4qP\nK6SIjJEDYSSwyOKjlr1nGnpBkX505wuOqdAzA6yBfHI/E3nkW/dWqBC+u72GjOh7\nuVBKK3jNeQKBgF7PbO6XeMCRpitI6YMjwJAHOkwgmeYNBOA7pFXQEbMx79t5NbVo\nTkk3tcviGRMWk9x33M3ZAskl64GW9c98PoUXyJWCX0VE9c8246FKzPxj96fGxo9M\nQ7VdWmVqOAitiQFzRvPmmmKEpZWCLDwQPhticdbsjXgDb5TF/vzbaDDXAoGAL65L\nCFAaN+/U12VH46J9k4qPyqrir3Tz54slvHqq9ojRCFeIMyjyt8TOdnMUGEUp00Aw\nur/ws0ukWg4gBCmCzUAe8g5Nbvb/CssdjYUlNEQns0aG6uDdxU7BG5lqL6GeUVgS\n8yFzw/Iq/3P9ciW/lR7q7Nd5mC6ekzs+ITxbGEkCgYANsdCFFFr/VoKb9o1ijkuz\n3+YxSlP3DQBsuKeW5TzAtTy884EKBZWX71hMz+6OEoaRZXuFXIuLEe/uukAmf0yS\nk3WAHCAiIYvzkwzfS0Wl2rqJWofbV/ozBkxJfKeX2lQSl9ZAoolovI3sMMbMi/Zd\nHkEi8rY1Xm/uyqfONBUxJA==\n-----END PRIVATE KEY-----\n"
DASHBOARD_PASSWORD=admin123
WEBHOOK_URL=https://backend.kukuna.com.br/webhook/87/Gqj9E1Vm5zv9o7PULYMDuv78P9pNHXyClyKQFkcb6r
```

⚠️ **IMPORTANTE**: 
- Substitua os valores acima pelos seus valores reais
- Para `GOOGLE_PRIVATE_KEY`, copie a chave completa do seu arquivo JSON
- Mantenha as aspas duplas e os `\n` na chave privada

### 5. Configurar Build Settings

No Vercel, em **Settings > General**:

- **Framework Preset**: Other
- **Build Command**: (deixe vazio ou `npm install`)
- **Output Directory**: (deixe vazio)
- **Install Command**: `npm install`
- **Root Directory**: (deixe vazio)

### 6. Deploy

1. Clique em **"Deploy"**
2. Aguarde o processo de build e deploy
3. O Vercel vai gerar uma URL automática (ex: `seu-projeto.vercel.app`)

### 7. Atualizar URLs no Código

Depois do deploy, você precisa atualizar as URLs da API nos arquivos HTML:

1. Abra cada arquivo HTML que tem `window.API_BASE_URL`
2. Substitua `http://localhost:3000` pela URL do Vercel

**Arquivos para atualizar:**
- `dashboard.html`
- `dashboard-promotores.html`
- `promotores.html`
- `promotor-detalhes.html`
- `crm.html`
- `indicadores.html`
- `indicados.html`

**Exemplo:**
```javascript
// Antes:
window.API_BASE_URL = 'http://localhost:3000';

// Depois:
window.API_BASE_URL = 'https://seu-projeto.vercel.app';
```

Ou melhor ainda, use uma variável de ambiente:

```javascript
window.API_BASE_URL = window.location.origin;
```

## 🔄 Deploy Automático

Depois da primeira configuração, todo push no GitHub vai fazer deploy automático!

## 📝 Notas Importantes

1. **Timeout**: O Vercel tem limite de 10 segundos para funções serverless no plano gratuito. Se sua API demorar muito, considere otimizar.

2. **Variáveis de Ambiente**: Sempre configure as variáveis no Vercel, nunca no código!

3. **Domínio Customizado**: Você pode adicionar um domínio customizado nas configurações do Vercel.

4. **Logs**: Acompanhe os logs em tempo real no dashboard do Vercel.

## 🐛 Troubleshooting

### Erro de Build
- Verifique se todas as dependências estão no `package.json`
- Verifique os logs de build no Vercel

### Erro 500 na API
- Verifique se todas as variáveis de ambiente estão configuradas
- Verifique os logs da função no Vercel

### CORS Error
- O código já tem CORS habilitado, mas verifique se a URL está correta

## ✅ Pronto!

Seu aplicativo está no ar! 🎉


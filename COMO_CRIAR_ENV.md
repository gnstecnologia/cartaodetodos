# Como Criar o Arquivo .env

## 📝 Passo a Passo

### 1. Criar o Arquivo

Crie um arquivo chamado `.env` na raiz do projeto (mesma pasta onde está o `package.json`).

### 2. Copiar as Informações do JSON

Do seu arquivo `cartaodetodos-478014-6c752ccee29e.json`, você precisa de:

- **`client_email`** → vai para `GOOGLE_SERVICE_ACCOUNT_EMAIL`
- **`private_key`** → vai para `GOOGLE_PRIVATE_KEY`

### 3. Conteúdo do Arquivo .env

Cole este conteúdo no arquivo `.env`:

```env
# Google Sheets Configuration
SPREADSHEET_ID=1LEUBhIGrXZ5A_WUyvof-47iwd1P-5-DpIw2BcO-k9yY
GOOGLE_SHEETS_LEADS_SHEET=Leads
GOOGLE_SHEETS_PROMOTOR_SHEET=Promotor

# Google Cloud Service Account
# (copie o valor de "client_email" do JSON)
GOOGLE_SERVICE_ACCOUNT_EMAIL=robocartaodetodos@cartaodetodos-478014.iam.gserviceaccount.com

# (copie o valor de "private_key" do JSON, mantendo as quebras de linha \n)
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDRvPtEui2bc8jh\nnNAe8dcZxZPxruClBs7MtIsHffhvFicB4ZUa7MViMHG+X2D0RzBrv3j6Ocz2sraL\nkZZcg/8wRq0CRP31PJQE6bPxozBH0+v8PN7Oolp1soDLfW1EJxOhZ7j6D9KbY5cG\nNCx4LijeIH9lLnXWW8wHQDtZ8rYYuaERGp47i7331Fa6xL/7ZUoVSTdPiewuVr9s\nk3KkhVqzAwvFyo7WxRam07mu9NFCDVi7rtGDR4qdUemiUO0kv6TN+O4NYCD8aDpW\n0/o6B/c6L9SahL31x7/kX8bJqxnRUdW1ib1kD60XBtp0LnTu/9CvAN8xcTaWQNmD\nEWzpS7K3AgMBAAECggEAAQzcCeiQFjwFW1KF3O8jahl0rQb4pgA7jzKE6F6HnMV0\nyuFzyy+N/3i0S8U+KYr6YZe9sIG969Wnl1mnx0J78nnFdQJJGUNv5E8Sm8OlmBPQ\nwIcXgIZh7elHvtJxISBm90MbMy6wGcoXtVa+iu2EPonVdCQVlU4JXqyXf32jzso2\nLlkVOts/NgutrVttCzCbyvPeLge+hCGo9nxs03hlLVld2hunZUWHQcxpaapEJR6C\nXQH4vGpxdi1DfxuQMdpIFz/LGlozmKWY9mGStJW+ilt6YAntlj7RknPdgL49zvlS\nDCyKu033mY0FSNdEglFDIa1vWPYehxscMHWD8dUbGQKBgQDoJzaCcpkrg4gbAIO5\n2GFKU1S/NSHf/G6A9OaZtYY75A/aSXMFk41aQydzW/R1B9yZ84VIIDhWeM8NdkgB\n7r7KeBd3D7QDrND4ze/MkKP4Ua7oY4im6ZSQvl/E+O0oEAIh/unZi6hIdACEmmQz\nzqDk8lf9TnaWxJbu9g9ZmLrlrwKBgQDnSFYSNgxkdfGy7H1MYnlqlRq4aP6y+LFv\nG/jK+TmkZ0sv0LedV9HIGIXBY4D2pRKYagesMFf6Un2nfHe3RTvLOsxB9gYgB4qP\nK6SIjJEDYSSwyOKjlr1nGnpBkX505wuOqdAzA6yBfHI/E3nkW/dWqBC+u72GjOh7\nuVBKK3jNeQKBgF7PbO6XeMCRpitI6YMjwJAHOkwgmeYNBOA7pFXQEbMx79t5NbVo\nTkk3tcviGRMWk9x33M3ZAskl64GW9c98PoUXyJWCX0VE9c8246FKzPxj96fGxo9M\nQ7VdWmVqOAitiQFzRvPmmmKEpZWCLDwQPhticdbsjXgDb5TF/vzbaDDXAoGAL65L\nCFAaN+/U12VH46J9k4qPyqrir3Tz54slvHqq9ojRCFeIMyjyt8TOdnMUGEUp00Aw\nur/ws0ukWg4gBCmCzUAe8g5Nbvb/CssdjYUlNEQns0aG6uDdxU7BG5lqL6GeUVgS\n8yFzw/Iq/3P9ciW/lR7q7Nd5mC6ekzs+ITxbGEkCgYANsdCFFFr/VoKb9o1ijkuz\n3+YxSlP3DQBsuKeW5TzAtTy884EKBZWX71hMz+6OEoaRZXuFXIuLEe/uukAmf0yS\nk3WAHCAiIYvzkwzfS0Wl2rqJWofbV/ozBkxJfKeX2lQSl9ZAoolovI3sMMbMi/Zd\nHkEi8rY1Xm/uyqfONBUxJA==\n-----END PRIVATE KEY-----\n"

# Server Configuration
PORT=3000
NODE_ENV=production

# Dashboard Password (ALTERE ESTA SENHA!)
DASHBOARD_PASSWORD=admin123

# Webhook URL (opcional)
WEBHOOK_URL=https://backend.kukuna.com.br/webhook/87/Gqj9E1Vm5zv9o7PULYMDuv78P9pNHXyClyKQFkcb6r
```

## ⚠️ IMPORTANTE

1. **Mantenha as aspas duplas** ao redor da `GOOGLE_PRIVATE_KEY`
2. **Mantenha os `\n`** - são quebras de linha necessárias
3. **Não commite o arquivo `.env`** no Git (já está no `.gitignore`)
4. **O arquivo JSON pode ficar como está** - não precisa renomear

## ✅ Verificar se Está Correto

Depois de criar o `.env`, teste:

```bash
npm test
```

Se aparecer "✅ Conexão testada com sucesso!", está tudo certo!

## 🔒 Segurança

- O arquivo `.env` está no `.gitignore` (não será commitado)
- O arquivo JSON também deve ser mantido em segurança
- **Nunca compartilhe** esses arquivos publicamente


# 📋 Arquivos que Podem Ser Removidos

Esta lista identifica arquivos que não são mais necessários ou que podem ser removidos do projeto.

## 🗑️ Arquivos para Remover Imediatamente

### 1. Arquivos de Configuração Antigos/Desnecessários

- **`default.php`** ❌
  - Página padrão da Hostinger
  - Não é usada no projeto Node.js
  - Pode ser removida

- **`cartaodetodos-478014-6c752ccee29e.json`** ❌
  - Arquivo de credenciais do Google Cloud
  - Já está no `.gitignore` mas ainda está commitado
  - **IMPORTANTE**: Remover do histórico do Git também
  - Credenciais devem estar apenas no `.env`

### 2. Scripts de Desenvolvimento Local (Opcional)

- **`stop-server.ps1`** ⚠️
  - Script para parar servidor local
  - Útil apenas em desenvolvimento local
  - Pode manter se usar Windows localmente
  - Não necessário em produção

- **`test-connection.js`** ⚠️
  - Script de teste de conexão
  - Útil para debug, mas não essencial
  - Pode manter em desenvolvimento

### 3. Scripts de Setup do GitHub (Uma vez só)

- **`criar-repo-auto.ps1`** ⚠️
  - Script para criar repositório no GitHub
  - Já foi usado, não precisa mais
  - Pode remover

- **`criar-repo.ps1`** ⚠️
  - Script interativo para criar repositório
  - Já foi usado, não precisa mais
  - Pode remover

- **`criar-repositorio-github.ps1`** ⚠️
  - Script alternativo para criar repositório
  - Já foi usado, não precisa mais
  - Pode remover

- **`fazer-push.ps1`** ⚠️
  - Script para fazer push após criar repositório
  - Já foi usado, não precisa mais
  - Pode remover

- **`PUSH_GITHUB.ps1`** ⚠️
  - Script alternativo para push
  - Já foi usado, não precisa mais
  - Pode remover

- **`CRIAR_REPOSITORIO.md`** ⚠️
  - Guia para criar repositório
  - Já foi feito, pode remover

### 4. Código Antigo do Google Apps Script

- **`google-apps-script-dashboard.js`** ⚠️
  - Código antigo do Google Apps Script
  - Ainda é referenciado em alguns docs, mas não é usado
  - O projeto agora usa Node.js diretamente
  - Pode remover se não usar mais Apps Script

## 📚 Documentação (Consolidar)

### Arquivos de Documentação que Podem Ser Consolidados

- **`COMO_ADICIONAR_PROMOTORES.md`** ⚠️
  - Pode ser movido para `README.md` ou `SETUP.md`

- **`COMO_CRIAR_ENV.md`** ⚠️
  - Pode ser movido para `SETUP.md` ou `README.md`

- **`CONFIGURACAO.md`** ⚠️
  - Pode ser consolidado com outros docs

- **`INSTRUCOES_CRM.md`** ⚠️
  - Pode ser movido para `README.md`

- **`INSTRUCOES_DASHBOARD.md`** ⚠️
  - Pode ser movido para `README.md`

- **`INSTRUCOES_MIGRACAO.md`** ⚠️
  - Pode ser consolidado com `SETUP.md`

- **`INSTRUCOES_PLANILHA.md`** ⚠️
  - Pode ser movido para `SETUP.md`

- **`MELHORIAS_IMPLEMENTADAS.md`** ⚠️
  - Histórico de melhorias, pode manter ou mover para CHANGELOG.md

- **`RESUMO_FINAL.md`** ⚠️
  - Pode ser consolidado com README.md

- **`SETUP.md`** ✅
  - Manter - guia principal de setup

- **`README.md`** ✅
  - Manter - arquivo principal

- **`README_API.md`** ✅
  - Manter - documentação da API

- **`DEPLOY_VERCEL.md`** ✅
  - Manter - guia de deploy no Vercel

- **`DEPLOY_VPS.md`** ✅
  - Manter - guia de deploy na VPS

## ✅ Arquivos Essenciais (NÃO REMOVER)

### Código Principal
- `server.js` ✅
- `package.json` ✅
- Todos os arquivos `.html` ✅
- Todos os arquivos em `scripts/` ✅
- `styles.css` ✅

### Configuração
- `.gitignore` ✅
- `.env` (não commitado) ✅
- `vercel.json` ✅
- `Dockerfile` ✅
- `docker-compose.yml` ✅
- `deploy-vps.sh` ✅

### Assets
- `LOGO.webp` ✅
- `faviconV2.png` ✅
- `BACKGROUND-HERO.webp` ✅
- `IMAGEM LADO DA HEADLINE.png` ✅

## 🧹 Script de Limpeza

Execute este comando para remover arquivos desnecessários:

```bash
# Remover arquivos PHP antigos
rm default.php

# Remover scripts de setup do GitHub (já foram usados)
rm criar-repo-auto.ps1
rm criar-repo.ps1
rm criar-repositorio-github.ps1
rm fazer-push.ps1
rm PUSH_GITHUB.ps1
rm CRIAR_REPOSITORIO.md

# Remover arquivo de credenciais (IMPORTANTE: remover do Git também)
git rm --cached cartaodetodos-478014-6c752ccee29e.json
rm cartaodetodos-478014-6c752ccee29e.json

# Remover código antigo do Google Apps Script (se não usar mais)
rm google-apps-script-dashboard.js
```

## ⚠️ IMPORTANTE: Remover Credenciais do Histórico do Git

O arquivo `cartaodetodos-478014-6c752ccee29e.json` contém credenciais e precisa ser removido do histórico do Git:

```bash
# Remover do histórico do Git (cuidado: isso reescreve o histórico)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch cartaodetodos-478014-6c752ccee29e.json" \
  --prune-empty --tag-name-filter cat -- --all

# Ou usar BFG Repo-Cleaner (mais seguro)
# https://rtyley.github.io/bfg-repo-cleaner/
```

## 📊 Resumo

- **Arquivos para remover**: ~10 arquivos
- **Documentação para consolidar**: ~8 arquivos
- **Arquivos essenciais**: Manter todos



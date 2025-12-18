# 🚀 Criar Repositório no GitHub

## Opção 1: Via Script PowerShell (Recomendado)

### 1. Criar Personal Access Token no GitHub

1. Acesse: https://github.com/settings/tokens
2. Clique em "Generate new token" > "Generate new token (classic)"
3. Dê um nome: "Criar Repositório Cartão de Todos"
4. Marque a permissão: **repo** (Full control of private repositories)
5. Clique em "Generate token"
6. **COPIE O TOKEN** (você não verá ele novamente!)

### 2. Executar o Script

No PowerShell, execute:

```powershell
cd C:\Users\GC1\Desktop\PROJETOS\cartaodetodos
.\criar-repositorio-github.ps1 -Token "SEU_TOKEN_AQUI"
```

O script vai:
- ✅ Criar o repositório no GitHub
- ✅ Adicionar o remote
- ✅ Fazer push do código

---

## Opção 2: Via Interface Web do GitHub

### 1. Criar Repositório Manualmente

1. Acesse: https://github.com/new
2. Nome do repositório: `cartaodetodos`
3. Descrição: `Sistema de gestão de leads e promotores - Cartão de Todos`
4. Escolha: Público ou Privado
5. **NÃO** marque "Initialize with README"
6. Clique em "Create repository"

### 2. Conectar e Fazer Push

Depois de criar, execute no PowerShell:

```powershell
cd C:\Users\GC1\Desktop\PROJETOS\cartaodetodos
git remote add origin https://github.com/rafael-rangel/cartaodetodos.git
git branch -M main
git push -u origin main
```

---

## Opção 3: Via GitHub CLI (se instalar)

Se instalar o GitHub CLI:

```powershell
# Instalar GitHub CLI
winget install GitHub.cli

# Fazer login
gh auth login

# Criar repositório e fazer push
cd C:\Users\GC1\Desktop\PROJETOS\cartaodetodos
gh repo create cartaodetodos --public --source=. --remote=origin --push
```

---

## ✅ Próximo Passo

Depois de criar o repositório, siga o guia `DEPLOY_VERCEL.md` para fazer o deploy no Vercel!


# Script automático para criar repositório no GitHub
# Tenta diferentes métodos de autenticação

Write-Host "`n🚀 Criando Repositório no GitHub Automaticamente..." -ForegroundColor Cyan
Write-Host "=" * 60 -ForegroundColor Cyan

$repoName = "cartaodetodos"
$username = "rafael-rangel"

# Método 1: Tentar usar GitHub CLI se disponível
Write-Host "`n📋 Tentando método 1: GitHub CLI..." -ForegroundColor Yellow
$ghPath = Get-Command gh -ErrorAction SilentlyContinue
if ($ghPath) {
    Write-Host "✅ GitHub CLI encontrado!" -ForegroundColor Green
    try {
        # Verifica se está autenticado
        $authStatus = gh auth status 2>&1
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Autenticado no GitHub CLI!" -ForegroundColor Green
            Write-Host "⏳ Criando repositório..." -ForegroundColor Yellow
            
            # Remove remote se existir
            git remote remove origin 2>$null
            
            # Cria repositório e faz push
            gh repo create $repoName --public --source=. --remote=origin --push 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host "`n✅ SUCESSO! Repositório criado e código enviado!" -ForegroundColor Green
                Write-Host "URL: https://github.com/$username/$repoName" -ForegroundColor Cyan
                exit 0
            }
        } else {
            Write-Host "⚠️ Não autenticado no GitHub CLI" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "⚠️ Erro ao usar GitHub CLI" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ GitHub CLI não encontrado" -ForegroundColor Yellow
}

# Método 2: Tentar usar token do ambiente ou credenciais do Git
Write-Host "`n📋 Tentando método 2: Token de ambiente..." -ForegroundColor Yellow
$token = $env:GITHUB_TOKEN
if ($token) {
    Write-Host "✅ Token encontrado nas variáveis de ambiente!" -ForegroundColor Green
    $apiUrl = "https://api.github.com/user/repos"
    $headers = @{
        "Authorization" = "token $token"
        "Accept" = "application/vnd.github.v3+json"
    }
    $body = @{
        name = $repoName
        description = "Sistema de gestão de leads e promotores - Cartão de Todos"
        private = $false
        auto_init = $false
    } | ConvertTo-Json
    
    try {
        Write-Host "⏳ Criando repositório..." -ForegroundColor Yellow
        $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $body -ContentType "application/json"
        
        Write-Host "✅ Repositório criado!" -ForegroundColor Green
        
        # Remove remote se existir
        git remote remove origin 2>$null
        
        # Adiciona remote e faz push
        git remote add origin $response.clone_url
        git push -u origin main
        
        Write-Host "`n✅ SUCESSO! Repositório criado e código enviado!" -ForegroundColor Green
        Write-Host "URL: $($response.html_url)" -ForegroundColor Cyan
        exit 0
    } catch {
        Write-Host "⚠️ Erro ao criar repositório com token" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠️ Token não encontrado nas variáveis de ambiente" -ForegroundColor Yellow
}

# Método 3: Instruções manuais
Write-Host "`n📋 Método 3: Criar manualmente via web" -ForegroundColor Yellow
Write-Host "`nComo não foi possível criar automaticamente, siga estes passos:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Acesse: https://github.com/new" -ForegroundColor Cyan
Write-Host "2. Nome do repositório: $repoName" -ForegroundColor Cyan
Write-Host "3. Descrição: Sistema de gestão de leads e promotores" -ForegroundColor Cyan
Write-Host "4. Escolha: Público" -ForegroundColor Cyan
Write-Host "5. NÃO marque 'Initialize with README'" -ForegroundColor Cyan
Write-Host "6. Clique em 'Create repository'" -ForegroundColor Cyan
Write-Host ""
Write-Host "Depois execute estes comandos:" -ForegroundColor Yellow
Write-Host "git remote add origin https://github.com/$username/$repoName.git" -ForegroundColor White
Write-Host "git push -u origin main" -ForegroundColor White
Write-Host ""

# Abre o navegador na página de criação
Write-Host "⏳ Abrindo página de criação no navegador..." -ForegroundColor Yellow
$url = "https://github.com/new"
Start-Process $url


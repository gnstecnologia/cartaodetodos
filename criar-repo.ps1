# Script interativo para criar repositório no GitHub
Write-Host "`n🚀 Criar Repositório no GitHub" -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

# Verifica se já tem remote
$hasRemote = git remote | Select-String -Pattern "origin"
if ($hasRemote) {
    Write-Host "`n⚠️ Já existe um remote 'origin' configurado." -ForegroundColor Yellow
    $continue = Read-Host "Deseja continuar mesmo assim? (s/n)"
    if ($continue -ne "s") {
        exit
    }
}

Write-Host "`n📋 Você precisa de um Personal Access Token do GitHub" -ForegroundColor Yellow
Write-Host "Crie um em: https://github.com/settings/tokens" -ForegroundColor Cyan
Write-Host "Permissão necessária: repo (Full control)" -ForegroundColor Yellow
Write-Host ""

$token = Read-Host "Cole seu Personal Access Token aqui" -AsSecureString
$tokenPlain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($token))

if ([string]::IsNullOrWhiteSpace($tokenPlain)) {
    Write-Host "`n❌ Token não pode estar vazio!" -ForegroundColor Red
    exit 1
}

$repoName = Read-Host "Nome do repositório (Enter para 'cartaodetodos')"
if ([string]::IsNullOrWhiteSpace($repoName)) {
    $repoName = "cartaodetodos"
}

$isPrivate = Read-Host "Repositório privado? (s/n)"
$private = $isPrivate -eq "s"

$username = "rafael-rangel"
$apiUrl = "https://api.github.com/user/repos"

$headers = @{
    "Authorization" = "token $tokenPlain"
    "Accept" = "application/vnd.github.v3+json"
}

$body = @{
    name = $repoName
    description = "Sistema de gestão de leads e promotores - Cartão de Todos"
    private = $private
    auto_init = $false
} | ConvertTo-Json

try {
    Write-Host "`n⏳ Criando repositório no GitHub..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $body -ContentType "application/json"
    
    Write-Host "✅ Repositório criado com sucesso!" -ForegroundColor Green
    Write-Host "URL: $($response.html_url)" -ForegroundColor Cyan
    
    # Remove remote existente se houver
    $existingRemote = git remote | Select-String -Pattern "origin"
    if ($existingRemote) {
        git remote remove origin 2>$null
    }
    
    # Adiciona remote e faz push
    Write-Host "`n⏳ Configurando remote e fazendo push..." -ForegroundColor Yellow
    git remote add origin $response.clone_url
    git push -u origin main
    
    Write-Host "`n✅ Tudo pronto! Repositório criado e código enviado." -ForegroundColor Green
    Write-Host "Acesse: $($response.html_url)" -ForegroundColor Cyan
    Write-Host "`n📝 Próximo passo: Siga o guia DEPLOY_VERCEL.md para fazer deploy no Vercel!" -ForegroundColor Yellow
    
} catch {
    Write-Host "`n❌ Erro ao criar repositório:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "`n⚠️ Token inválido ou expirado." -ForegroundColor Yellow
        Write-Host "Crie um novo token em: https://github.com/settings/tokens" -ForegroundColor Cyan
        Write-Host "Permissão necessária: repo (Full control of private repositories)" -ForegroundColor Yellow
    } elseif ($_.Exception.Response.StatusCode -eq 422) {
        Write-Host "`n⚠️ Repositório já existe ou nome inválido." -ForegroundColor Yellow
        Write-Host "Tente com outro nome ou delete o repositório existente." -ForegroundColor Yellow
    }
}


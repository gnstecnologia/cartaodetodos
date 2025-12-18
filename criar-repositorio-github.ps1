# Script para criar repositório no GitHub
# Requer um Personal Access Token do GitHub

param(
    [Parameter(Mandatory=$true)]
    [string]$Token,
    
    [Parameter(Mandatory=$false)]
    [string]$RepoName = "cartaodetodos",
    
    [Parameter(Mandatory=$false)]
    [string]$Description = "Sistema de gestão de leads e promotores - Cartão de Todos",
    
    [Parameter(Mandatory=$false)]
    [switch]$Private = $false
)

$username = "rafael-rangel"
$apiUrl = "https://api.github.com/user/repos"

$headers = @{
    "Authorization" = "token $Token"
    "Accept" = "application/vnd.github.v3+json"
}

$body = @{
    name = $RepoName
    description = $Description
    private = $Private.IsPresent
    auto_init = $false
} | ConvertTo-Json

try {
    Write-Host "Criando repositório no GitHub..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri $apiUrl -Method Post -Headers $headers -Body $body -ContentType "application/json"
    
    Write-Host "✅ Repositório criado com sucesso!" -ForegroundColor Green
    Write-Host "URL: $($response.html_url)" -ForegroundColor Cyan
    
    # Adiciona remote e faz push
    Write-Host "`nConfigurando remote e fazendo push..." -ForegroundColor Yellow
    git remote add origin $response.clone_url
    git branch -M main
    git push -u origin main
    
    Write-Host "`n✅ Tudo pronto! Repositório criado e código enviado." -ForegroundColor Green
    Write-Host "Acesse: $($response.html_url)" -ForegroundColor Cyan
    
} catch {
    Write-Host "❌ Erro ao criar repositório:" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    
    if ($_.Exception.Response.StatusCode -eq 401) {
        Write-Host "`n⚠️ Token inválido ou expirado. Crie um novo token em:" -ForegroundColor Yellow
        Write-Host "https://github.com/settings/tokens" -ForegroundColor Cyan
        Write-Host "`nPermissões necessárias: repo (Full control of private repositories)" -ForegroundColor Yellow
    }
}


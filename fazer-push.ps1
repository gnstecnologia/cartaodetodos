# Script para fazer push após criar o repositório manualmente
Write-Host "`n🚀 Configurando Git e fazendo Push..." -ForegroundColor Cyan
Write-Host "=" * 50 -ForegroundColor Cyan

$username = "rafael-rangel"
$repoName = "cartaodetodos"

# Remove remote se existir
Write-Host "`n📋 Configurando remote..." -ForegroundColor Yellow
git remote remove origin 2>$null

# Adiciona remote
git remote add origin "https://github.com/$username/$repoName.git"

Write-Host "✅ Remote configurado!" -ForegroundColor Green

# Verifica se está na branch main
$currentBranch = git branch --show-current
if ($currentBranch -ne "main") {
    Write-Host "`n📋 Renomeando branch para main..." -ForegroundColor Yellow
    git branch -M main
}

# Faz push
Write-Host "`n⏳ Fazendo push para o GitHub..." -ForegroundColor Yellow
git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host "`n✅ SUCESSO! Código enviado para o GitHub!" -ForegroundColor Green
    Write-Host "URL: https://github.com/$username/$repoName" -ForegroundColor Cyan
} else {
    Write-Host "`n❌ Erro ao fazer push. Verifique se:" -ForegroundColor Red
    Write-Host "   1. O repositório foi criado no GitHub" -ForegroundColor Yellow
    Write-Host "   2. Você tem permissões de escrita" -ForegroundColor Yellow
    Write-Host "   3. Suas credenciais estão configuradas" -ForegroundColor Yellow
}


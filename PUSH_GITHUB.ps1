# Script simples para fazer push após criar repositório no GitHub
Write-Host ""
Write-Host "🚀 Fazendo Push para GitHub..." -ForegroundColor Cyan
Write-Host ""

# Verifica se remote está configurado
$remote = git remote get-url origin 2>$null
if ($remote) {
    Write-Host "✅ Remote configurado: $remote" -ForegroundColor Green
} else {
    Write-Host "⚠️ Configurando remote..." -ForegroundColor Yellow
    git remote add origin https://github.com/rafael-rangel/cartaodetodos.git
}

# Faz push
Write-Host ""
Write-Host "⏳ Enviando código para GitHub..." -ForegroundColor Yellow
Write-Host ""

git push -u origin main

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ SUCESSO! Código enviado!" -ForegroundColor Green
    Write-Host "🌐 Acesse: https://github.com/rafael-rangel/cartaodetodos" -ForegroundColor Cyan
} else {
    Write-Host ""
    Write-Host "❌ Erro ao fazer push." -ForegroundColor Red
    Write-Host ""
    Write-Host "Certifique-se de que:" -ForegroundColor Yellow
    Write-Host "1. O repositório foi criado em: https://github.com/new" -ForegroundColor White
    Write-Host "2. Nome do repositório: cartaodetodos" -ForegroundColor White
    Write-Host "3. Você está logado no GitHub" -ForegroundColor White
    Write-Host ""
    Write-Host "Depois execute este script novamente." -ForegroundColor Yellow
}


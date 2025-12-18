# Script para parar o servidor na porta 3000
Write-Host "🛑 Parando servidor na porta 3000..." -ForegroundColor Yellow

$processes = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique

if ($processes) {
    $processes | ForEach-Object {
        $proc = Get-Process -Id $_ -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "   Encerrando processo: $($proc.ProcessName) (PID: $_)" -ForegroundColor Cyan
            Stop-Process -Id $_ -Force
        }
    }
    Write-Host "✅ Servidor parado com sucesso!" -ForegroundColor Green
} else {
    Write-Host "ℹ️  Nenhum processo encontrado na porta 3000" -ForegroundColor Gray
}








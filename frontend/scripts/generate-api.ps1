[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  Генерация типизированного API клиента" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Переходим в корень frontend
Set-Location $PSScriptRoot\..

# 1. Проверка что backend запущен
Write-Host ">>> Проверка доступности API..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method GET -TimeoutSec 5
    Write-Host "✅ Backend доступен" -ForegroundColor Green
} catch {
    Write-Host "❌ Backend не запущен! Запустите сначала:" -ForegroundColor Red
    Write-Host "   cd backend" -ForegroundColor Yellow
    Write-Host "   uvicorn app.main:app --reload" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# 2. Скачиваем OpenAPI спецификацию
Write-Host ">>> Скачивание OpenAPI спецификации..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri "http://localhost:8000/api/openapi.json" -OutFile "openapi.json"
    Write-Host "✅ Спецификация скачана" -ForegroundColor Green
} catch {
    Write-Host "❌ Ошибка скачивания спецификации!" -ForegroundColor Red
    exit 1
}

# 3. Создаём целевую папку если её нет
if (-not (Test-Path "lib/api/generated")) {
    New-Item -ItemType Directory -Path "lib/api/generated" -Force | Out-Null
}

Write-Host ""

# 4. Генерация клиента (в одну строку, чтобы избежать проблем с переносами)
Write-Host ">>> Генерация TypeScript клиента..." -ForegroundColor Yellow
bunx @hey-api/openapi-ts --input ./openapi.json --output ./lib/api/generated --client axios

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Клиент сгенерирован" -ForegroundColor Green
} else {
    Write-Host "❌ Ошибка генерации!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# 5. Удаляем временный файл
if (Test-Path "openapi.json") {
    Remove-Item "openapi.json"
    Write-Host "✅ Временные файлы удалены" -ForegroundColor Green
}

Write-Host ""

# 6. Показываем результат
Write-Host ">>> Сгенерированные файлы:" -ForegroundColor Yellow
Get-ChildItem "lib/api/generated" | ForEach-Object {
    $fileName = $_.Name
    Write-Host "   📄 $fileName" -ForegroundColor Gray
}

Write-Host ""
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  ✅ ГОТОВО!" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Теперь используйте:" -ForegroundColor Yellow
Write-Host '  import { api } from "@/lib/api"' -ForegroundColor White
Write-Host ""
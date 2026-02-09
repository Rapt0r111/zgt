# Migrating ZGT System to Bun
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "   Migration: ZGT System to Bun + Modern Stack" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check Bun
Write-Host ">>> Checking Bun..." -ForegroundColor Yellow

if (!(Get-Command bun -ErrorAction SilentlyContinue)) {
    Write-Host "(!) Bun is not installed!" -ForegroundColor Yellow
    Write-Host "Installing Bun..." -ForegroundColor Yellow
    powershell -c "irm bun.sh/install.ps1 | iex"
    Write-Host "DONE. Please restart PowerShell and run this script again." -ForegroundColor Green
    exit
} else {
    $bunVersion = bun --version
    Write-Host "OK: Bun $bunVersion is installed" -ForegroundColor Green
}

Write-Host ""

# 2. Backup
Write-Host ">>> Creating backup..." -ForegroundColor Yellow
$backupDir = "backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
New-Item -ItemType Directory -Path $backupDir -Force | Out-Null

if (Test-Path "frontend/package.json") {
    Copy-Item "frontend/package.json" "$backupDir/" -ErrorAction SilentlyContinue
    Copy-Item "frontend/package-lock.json" "$backupDir/" -ErrorAction SilentlyContinue
}
Write-Host "OK: Backup created in $backupDir" -ForegroundColor Green

# 3. Cleanup
Write-Host ">>> Cleaning old dependencies..." -ForegroundColor Yellow
if (Test-Path "frontend") {
    Push-Location frontend
} else {
    Write-Host "ERROR: Folder 'frontend' not found!" -ForegroundColor Red
    exit 1
}

if (Test-Path "node_modules") {
    Write-Host "   - Removing node_modules..." -ForegroundColor Gray
    Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
}

if (Test-Path "package-lock.json") {
    Write-Host "   - Removing package-lock.json..." -ForegroundColor Gray
    Remove-Item -Force package-lock.json -ErrorAction SilentlyContinue
}

# 4. Install
Write-Host ">>> Installing dependencies with Bun..." -ForegroundColor Yellow
bun install

if ($LASTEXITCODE -eq 0) {
    Write-Host "OK: Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "ERROR: Installation failed" -ForegroundColor Red
    Pop-Location
    exit 1
}

# 5. Update
Write-Host ">>> Updating packages..." -ForegroundColor Yellow
bun update

# 6. Tools
Write-Host ">>> Adding modern tools..." -ForegroundColor Yellow
Write-Host "   - Biome..." -ForegroundColor Gray
bun add --dev @biomejs/biome
Write-Host "   - Bundle Analyzer..." -ForegroundColor Gray
bun add --dev @next/bundle-analyzer
Write-Host "   - Testing Library..." -ForegroundColor Gray
bun add --dev @testing-library/react @testing-library/jest-dom happy-dom

# 7. Config
Write-Host ">>> Configuration..." -ForegroundColor Yellow
if (!(Test-Path ".env.local")) {
    "NEXT_PUBLIC_API_URL=http://localhost:8000" | Out-File -FilePath ".env.local" -Encoding UTF8
    Write-Host "OK: .env.local created" -ForegroundColor Green
}

# 8. Type Check
Write-Host ">>> Running Type Check..." -ForegroundColor Yellow
try {
    bun run type-check
} catch {
    Write-Host "Skipped: type-check script not found" -ForegroundColor Gray
}

# 9. Summary
Write-Host ""
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "SUCCESS: Migration complete!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "   1. Dev server:     bun run dev"
Write-Host "   2. Lint:           bun run lint"
Write-Host "   3. Build:          bun run build"
Write-Host ""
Write-Host "Documentation:" -ForegroundColor Yellow
Write-Host "   - Bun: https://bun.sh/docs"
Write-Host "   - Biome: https://biomejs.dev"
Write-Host "================================================" -ForegroundColor Cyan

Pop-Location
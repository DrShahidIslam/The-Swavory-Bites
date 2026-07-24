Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "THE SWAVORY BITES - PINTEREST DEMO ENGINE" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "[1/3] Initializing connection to Pinterest API..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "[2/3] Generating Premium Pin Content for 'Viral Chocolate Dessert'..." -ForegroundColor Yellow
# Run the pin generator in CLI test mode
# Note: we use --trend to force a single run rather than pulling from a queue
py pin_generator.py --trend "Viral Chocolate Dessert"

Write-Host ""
Write-Host "[3/3] Demo sequence complete!" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan

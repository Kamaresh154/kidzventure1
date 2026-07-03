Write-Host "KidzVenture ERP - Starting..." -ForegroundColor Cyan

# Check Python
try {
    $py = Get-Command python -ErrorAction Stop
    Write-Host "✓ Python found: $($py.Source)" -ForegroundColor Green
} catch {
    Write-Host "✗ Python not found. Please install Python 3.9+" -ForegroundColor Red
    exit 1
}

# Check if MongoDB URI is configured
$envFile = "backend\.env"
if (Test-Path $envFile) {
    $content = Get-Content $envFile
    if ($content -match 'MONGO_URI=mongodb\+srv://') {
        Write-Host "✓ MongoDB Atlas configured" -ForegroundColor Green
    } elseif ($content -match 'MONGO_URI=mongodb://localhost') {
        Write-Host "ℹ Using local MongoDB" -ForegroundColor Yellow
    } else {
        Write-Host "⚠ MongoDB URI not configured. Edit backend\.env" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ No .env file found. Creating from template..." -ForegroundColor Yellow
    @"
MONGO_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/kidzventure?retryWrites=true&w=majority
JWT_SECRET=change-this-to-a-strong-random-secret-key
JWT_ACCESS_TOKEN_EXPIRES=86400
FLASK_ENV=development
FLASK_DEBUG=1
"@ | Out-File -FilePath $envFile -Encoding UTF8
    Write-Host "  Edit backend\.env with your MongoDB Atlas credentials" -ForegroundColor Yellow
}

# Install dependencies
Write-Host "`nInstalling Python dependencies..." -ForegroundColor Cyan
pip install -r backend/requirements.txt
if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Dependencies installed" -ForegroundColor Green
} else {
    Write-Host "✗ Failed to install dependencies" -ForegroundColor Red
    exit 1
}

Write-Host "`nStarting server..." -ForegroundColor Green
Write-Host "Access at: http://localhost:5000" -ForegroundColor Cyan
Write-Host "First time: Open http://localhost:5000 to set up admin account`n" -ForegroundColor Yellow

# Start Flask server
Set-Location -LiteralPath "backend"
python app.py

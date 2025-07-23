Write-Host "Starting Document Processing System..."

# Set PATH to include Tesseract
$env:Path += ";C:\Program Files\Tesseract-OCR"

# Check if Python is installed
try {
    python --version | Out-Null
} catch {
    Write-Host "Python is not installed. Please install Python 3.8 or higher."
    exit 1
}

# Check if Tesseract is installed
if (-not (Test-Path "C:\Program Files\Tesseract-OCR\tesseract.exe")) {
    Write-Host "Tesseract not found. Installing..."
    & .\install_tesseract.bat
    $env:Path += ";C:\Program Files\Tesseract-OCR"
}

# Check if Ollama is running
try {
    $response = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing
} catch {
    Write-Host "Starting Ollama..."
    Start-Process -NoNewWindow ollama -ArgumentList "run mistral"
    Start-Sleep -Seconds 5
}

# Install/update Python dependencies
Write-Host "Installing Python dependencies..."
pip install -r requirements.txt

# Create necessary directories
if (-not (Test-Path "backend\uploads")) { New-Item -ItemType Directory -Path "backend\uploads" }
if (-not (Test-Path "backend\processed")) { New-Item -ItemType Directory -Path "backend\processed" }

# Start backend
Write-Host "Starting backend server..."
Start-Process -NoNewWindow python -ArgumentList "backend/main.py"

# Wait for backend to start
Start-Sleep -Seconds 5

# Test the system
Write-Host "Testing system components..."
python test.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "System test failed. Please check the error messages above."
    exit 1
}

# Test document processing
Write-Host "Testing document processing..."
python test_document.py
if ($LASTEXITCODE -ne 0) {
    Write-Host "Document processing test failed. Please check the error messages above."
    exit 1
}

Write-Host "System is ready!"
Write-Host "Backend is running at http://localhost:8000"
Write-Host "You can now use the frontend to process documents."
Write-Host ""
Write-Host "Press Ctrl+C to stop the server when done."
Read-Host 
Write-Host "Stopping Document Processing System..."

# Stop Ollama
Write-Host "Stopping Ollama..."
Get-Process ollama -ErrorAction SilentlyContinue | Stop-Process -Force

# Stop Python backend
Write-Host "Stopping backend server..."
Get-Process python -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like '*backend/main.py*'} | Stop-Process -Force

Write-Host "System stopped successfully!"
Read-Host 
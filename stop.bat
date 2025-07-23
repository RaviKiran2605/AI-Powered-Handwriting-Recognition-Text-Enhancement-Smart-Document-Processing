@echo off
echo Stopping Document Processing System...

REM Stop Ollama
echo Stopping Ollama...
powershell -Command "Get-Process ollama -ErrorAction SilentlyContinue | Stop-Process -Force"

REM Stop Python backend
echo Stopping backend server...
powershell -Command "Get-Process python -ErrorAction SilentlyContinue | Where-Object {$_.CommandLine -like '*backend/main.py*'} | Stop-Process -Force"

echo System stopped successfully!
pause 
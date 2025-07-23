@echo off
echo Starting Document Processing System...

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo Python is not installed. Please install Python 3.8 or higher.
    pause
    exit /b 1
)

REM Check if Tesseract is installed
if not exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
    echo Tesseract not found. Installing...
    call install_tesseract.bat
)

REM Check if Ollama is running
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo Starting Ollama...
    start /B ollama run mistral
    timeout /t 5 /nobreak
)

REM Install/update Python dependencies
echo Installing Python dependencies...
pip install -r requirements.txt

REM Create necessary directories
if not exist "backend\uploads" mkdir backend\uploads
if not exist "backend\processed" mkdir backend\processed

REM Start backend
echo Starting backend server...
start /B python backend/main.py

REM Wait for backend to start
timeout /t 5 /nobreak

REM Check if backend is running
curl -s http://localhost:8000/health >nul 2>&1
if errorlevel 1 (
    echo Backend failed to start. Please check the error messages above.
    pause
    exit /b 1
)

echo System is ready!
echo Backend is running at http://localhost:8000
echo You can now use the frontend to process documents.
echo.
echo Press Ctrl+C to stop the server when done.
pause 
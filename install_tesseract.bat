@echo off
echo Installing Tesseract OCR...

REM Download Tesseract installer
curl -L -o tesseract-installer.exe https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.3.3.20231005.exe

REM Run installer
echo Running installer...
tesseract-installer.exe /S /D=C:\Program Files\Tesseract-OCR

REM Add to PATH
setx PATH "%PATH%;C:\Program Files\Tesseract-OCR"

REM Clean up
del tesseract-installer.exe

echo Tesseract installation complete!
pause 
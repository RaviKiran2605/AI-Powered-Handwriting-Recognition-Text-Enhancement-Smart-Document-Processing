import os
import sys
import requests
import pytesseract
from PIL import Image
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_tesseract():
    try:
        # Set Tesseract path
        pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
        version = pytesseract.get_tesseract_version()
        logger.info(f"Tesseract version: {version}")
        return True
    except Exception as e:
        logger.error(f"Tesseract test failed: {str(e)}")
        return False

def test_ollama():
    try:
        response = requests.get('http://localhost:11434/api/tags')
        if response.status_code == 200:
            logger.info("Ollama is running and accessible")
            return True
        else:
            logger.error(f"Ollama returned status code: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Ollama test failed: {str(e)}")
        return False

def main():
    logger.info("Testing components...")
    
    # Test Tesseract
    tesseract_ok = test_tesseract()
    if not tesseract_ok:
        logger.error("Tesseract is not properly installed or configured")
        logger.info("Please install Tesseract from: https://github.com/UB-Mannheim/tesseract/wiki")
        logger.info("Install to: C:\\Program Files\\Tesseract-OCR")
    
    # Test Ollama
    ollama_ok = test_ollama()
    if not ollama_ok:
        logger.error("Ollama is not running")
        logger.info("Please start Ollama with: ollama run mistral")
    
    if tesseract_ok and ollama_ok:
        logger.info("All components are working correctly!")
    else:
        logger.error("Some components are not working. Please fix the issues above.")
        sys.exit(1)

if __name__ == "__main__":
    main() 
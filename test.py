import requests
import os
import sys
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_backend():
    try:
        # Test health endpoint
        response = requests.get('http://localhost:8000/health')
        if response.status_code == 200:
            health_data = response.json()
            logger.info("Backend health check:")
            logger.info(f"Status: {health_data['status']}")
            logger.info(f"Tesseract: {health_data['tesseract']}")
            logger.info(f"Ollama: {health_data['ollama']}")
            return True
        else:
            logger.error(f"Health check failed with status code: {response.status_code}")
            return False
    except Exception as e:
        logger.error(f"Failed to connect to backend: {e}")
        return False

def test_ollama():
    try:
        response = requests.get('http://localhost:11434/api/tags')
        if response.status_code == 200:
            logger.info("Ollama is running and accessible")
            return True
        else:
            logger.error("Ollama is not responding properly")
            return False
    except Exception as e:
        logger.error(f"Failed to connect to Ollama: {e}")
        return False

def test_tesseract():
    try:
        import pytesseract
        version = pytesseract.get_tesseract_version()
        logger.info(f"Tesseract version: {version}")
        return True
    except Exception as e:
        logger.error(f"Tesseract test failed: {e}")
        return False

def main():
    logger.info("Testing system components...")
    
    # Test Tesseract
    tesseract_ok = test_tesseract()
    if not tesseract_ok:
        logger.error("Tesseract is not properly installed or configured")
        logger.info("Please run install_tesseract.bat")
        return False
    
    # Test Ollama
    ollama_ok = test_ollama()
    if not ollama_ok:
        logger.error("Ollama is not running")
        logger.info("Please start Ollama with: ollama run mistral")
        return False
    
    # Test Backend
    backend_ok = test_backend()
    if not backend_ok:
        logger.error("Backend is not running")
        logger.info("Please start the backend with: python backend/main.py")
        return False
    
    logger.info("All components are working correctly!")
    return True

if __name__ == "__main__":
    if not main():
        sys.exit(1) 
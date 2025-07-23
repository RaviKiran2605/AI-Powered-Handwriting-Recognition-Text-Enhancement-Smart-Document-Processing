import os
import sys
import subprocess
import platform
import requests
import logging
from pathlib import Path
import shutil

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_python_version():
    if sys.version_info < (3, 8):
        logger.error("Python 3.8 or higher is required")
        sys.exit(1)
    logger.info(f"Python version {sys.version_info.major}.{sys.version_info.minor} detected")

def install_requirements():
    logger.info("Installing Python dependencies...")
    try:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
        logger.info("Python dependencies installed successfully")
    except subprocess.CalledProcessError as e:
        logger.error(f"Failed to install Python dependencies: {e}")
        sys.exit(1)

def install_tesseract():
    system = platform.system()
    if system == "Windows":
        tesseract_path = Path("C:/Program Files/Tesseract-OCR")
        if not tesseract_path.exists():
            logger.info("Tesseract not found. Downloading installer...")
            url = "https://digi.bib.uni-mannheim.de/tesseract/tesseract-ocr-w64-setup-5.3.3.20231005.exe"
            installer_path = Path("tesseract-installer.exe")
            
            try:
                # Download installer
                response = requests.get(url, stream=True)
                response.raise_for_status()
                with open(installer_path, 'wb') as f:
                    for chunk in response.iter_content(chunk_size=8192):
                        f.write(chunk)
                
                logger.info("Download complete. Installing Tesseract...")
                
                # Run installer silently
                install_cmd = [
                    str(installer_path),
                    '/S',  # Silent mode
                    '/D=C:\\Program Files\\Tesseract-OCR'  # Installation directory
                ]
                
                subprocess.run(install_cmd, check=True)
                
                # Add to PATH
                os.environ['PATH'] = f"{tesseract_path};{os.environ['PATH']}"
                
                # Clean up installer
                installer_path.unlink()
                
                logger.info("Tesseract installed successfully")
            except Exception as e:
                logger.error(f"Failed to install Tesseract: {e}")
                sys.exit(1)
        else:
            logger.info("Tesseract is already installed")
    else:
        logger.error(f"Unsupported operating system: {system}")
        sys.exit(1)

def setup_environment():
    # Create necessary directories
    os.makedirs("backend/uploads", exist_ok=True)
    os.makedirs("backend/processed", exist_ok=True)
    
    # Create .env file if it doesn't exist
    env_path = Path(".env")
    if not env_path.exists():
        with open(env_path, "w") as f:
            f.write("""# Environment variables
TESSERACT_PATH=C:/Program Files/Tesseract-OCR/tesseract.exe
OLLAMA_HOST=http://localhost:11434
OLLAMA_MODEL=mistral
""")
        logger.info("Created .env file")

def verify_installation():
    logger.info("Verifying installation...")
    
    # Check Tesseract
    try:
        import pytesseract
        version = pytesseract.get_tesseract_version()
        logger.info(f"Tesseract version: {version}")
    except Exception as e:
        logger.error(f"Tesseract verification failed: {e}")
        return False
    
    # Check Ollama
    try:
        import requests
        response = requests.get("http://localhost:11434/api/tags")
        if response.status_code == 200:
            logger.info("Ollama is accessible")
        else:
            logger.error("Ollama is not responding properly")
            return False
    except Exception as e:
        logger.error(f"Ollama verification failed: {e}")
        return False
    
    return True

def main():
    logger.info("Starting setup...")
    
    # Check Python version
    check_python_version()
    
    # Install Python dependencies
    install_requirements()
    
    # Install Tesseract
    install_tesseract()
    
    # Setup environment
    setup_environment()
    
    # Verify installation
    if verify_installation():
        logger.info("Setup completed successfully!")
        logger.info("\nTo start the application:")
        logger.info("1. Make sure Ollama is running (ollama run mistral)")
        logger.info("2. Run 'python backend/main.py' to start the backend")
        logger.info("3. Run 'npm run dev' to start the frontend")
    else:
        logger.error("Setup verification failed. Please check the error messages above.")
        sys.exit(1)

if __name__ == "__main__":
    main() 
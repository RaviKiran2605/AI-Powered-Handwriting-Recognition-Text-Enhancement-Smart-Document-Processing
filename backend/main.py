from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from PIL import Image
import io
import os
import requests
import base64
import pytesseract
import cv2
import numpy as np
from pdf2image import convert_from_bytes
import logging
from pathlib import Path
from dotenv import load_dotenv
import time
import sys
import traceback
from textblob import TextBlob
import nltk

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('backend.log')
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure paths
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_DIR = BASE_DIR / "uploads"
PROCESSED_DIR = BASE_DIR / "processed"

# Create directories if they don't exist
UPLOAD_DIR.mkdir(exist_ok=True)
PROCESSED_DIR.mkdir(exist_ok=True)

# Configure Tesseract path
TESSERACT_PATH = os.getenv("TESSERACT_PATH", r"C:\Program Files\Tesseract-OCR\tesseract.exe")
if not os.path.exists(TESSERACT_PATH):
    logger.error(f"Tesseract not found at {TESSERACT_PATH}")
    logger.info("Please install Tesseract OCR and set the correct path in .env file")
    sys.exit(1)

pytesseract.pytesseract.tesseract_cmd = TESSERACT_PATH

# Configure Ollama
OLLAMA_HOST = os.getenv("OLLAMA_HOST", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "mistral")

app = FastAPI()

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static directories
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")
app.mount("/processed", StaticFiles(directory=str(PROCESSED_DIR)), name="processed")

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.pdf', '.tiff', '.tif'}

def is_valid_file(filename: str) -> bool:
    return any(filename.lower().endswith(ext) for ext in ALLOWED_EXTENSIONS)

def preprocess_image(image: Image.Image) -> Image.Image:
    """Preprocess image for better OCR results"""
    try:
        # Convert to numpy array
        img_array = np.array(image)
        
        # Convert to grayscale
        if len(img_array.shape) == 3:
            gray = cv2.cvtColor(img_array, cv2.COLOR_RGB2GRAY)
        else:
            gray = img_array
        
        # Apply thresholding
        _, binary = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        
        # Convert back to PIL Image
        return Image.fromarray(binary)
    except Exception as e:
        logger.error(f"Image preprocessing failed: {e}")
        logger.error(traceback.format_exc())
        return image

def extract_text_tesseract(image: Image.Image) -> str:
    """Extract text using Tesseract OCR"""
    try:
        # Preprocess image
        processed_image = preprocess_image(image)
        
        # Extract text
        text = pytesseract.image_to_string(processed_image)
        return text.strip()
    except Exception as e:
        logger.error(f"Tesseract OCR error: {str(e)}")
        logger.error(traceback.format_exc())
        return ""

def process_with_ollama_image(image: Image.Image, prompt: str) -> str:
    """Process image content using Ollama"""
    try:
        # Convert image to bytes
        img_byte_arr = io.BytesIO()
        image.save(img_byte_arr, format='PNG')
        img_byte_arr = img_byte_arr.getvalue()
        
        # Convert to base64
        content_base64 = base64.b64encode(img_byte_arr).decode('utf-8')
        
        # Call Ollama API with a more conversational prompt
        response = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                'model': OLLAMA_MODEL,
                'prompt': f"""You are a helpful assistant that analyzes images and documents. 
                Please analyze this image and provide a detailed summary of its contents.
                If there is any text, please extract and summarize it.
                If there are any diagrams or visual elements, please describe them.
                Format your response in a clear, structured way with bullet points.

                Image data: {content_base64}""",
                'stream': False
            },
            timeout=30
        )
        
        if response.status_code != 200:
            raise Exception(f"Ollama API error: {response.text}")
        
        result = response.json()
        return result.get('response', '')
    except requests.exceptions.ConnectionError:
        logger.error("Could not connect to Ollama")
        return ""
    except Exception as e:
        logger.error(f"Ollama image processing error: {str(e)}")
        logger.error(traceback.format_exc())
        return ""

def process_with_ollama_text(text: str, prompt: str) -> str:
    """Process text content using Ollama"""
    try:
        # Call Ollama API with a more conversational prompt
        response = requests.post(
            f"{OLLAMA_HOST}/api/generate",
            json={
                'model': OLLAMA_MODEL,
                'prompt': f"""You are a helpful assistant that summarizes documents. 
                Please analyze the following text and provide a comprehensive summary.
                Focus on the main points, key arguments, and important details.
                Format your response in a clear, structured way with bullet points.

                Text to summarize:
                {text}

                Please provide a summary that includes:
                1. Main topic and purpose
                2. Key points and arguments
                3. Important details and conclusions
                4. Any notable insights or implications""",
                'stream': False,
                'temperature': 0.7,
                'max_tokens': 1000
            },
            timeout=30
        )
        
        if response.status_code != 200:
            logger.error(f"Ollama API error: {response.text}")
            raise Exception(f"Ollama API error: {response.text}")
        
        result = response.json()
        summary = result.get('response', '')
        
        if not summary:
            logger.error("Empty summary received from Ollama")
            return "Summary generation failed. Please try again."
            
        logger.info(f"Generated summary: {summary}")
        return summary
    except requests.exceptions.ConnectionError:
        logger.error("Could not connect to Ollama")
        return "Could not connect to Ollama. Please check if Ollama is running."
    except Exception as e:
        logger.error(f"Ollama text processing error: {str(e)}")
        logger.error(traceback.format_exc())
        return f"Error generating summary: {str(e)}"

def process_document_content(content: bytes, filename: str) -> str:
    """Process document content using multiple methods"""
    try:
        # Convert PDF to image if needed
        if filename.lower().endswith('.pdf'):
            images = convert_from_bytes(content)
            if not images:
                raise Exception("Could not convert PDF to images")
            content = images[0]  # Use first page
        else:
            content = Image.open(io.BytesIO(content))
        
        # Try Tesseract OCR first
        text = extract_text_tesseract(content)
        
        # If Tesseract fails or returns empty result, try Ollama
        if not text:
            logger.info("Tesseract OCR failed, trying Ollama...")
            text = process_with_ollama_image(content, """Please analyze this image and extract all text content from it. 
            If there are any handwritten notes, please transcribe them as accurately as possible.
            If there are any printed text, please extract it exactly as it appears.
            If there are any numbers or special characters, please include them.
            Please format the output as plain text, maintaining the original structure where possible.""")
        
        return text
    except Exception as e:
        logger.error(f"Document processing error: {str(e)}")
        logger.error(traceback.format_exc())
        raise

def correct_spelling(text: str) -> str:
    """Corrects spelling in the given text using TextBlob."""
    if not text.strip():
        return text
    try:
        blob = TextBlob(text)
        corrected_text = str(blob.correct())
        logger.info("Spelling corrected successfully.")
        return corrected_text
    except Exception as e:
        logger.error(f"Spelling correction failed: {str(e)}")
        logger.error(traceback.format_exc())
        return text # Return original text if correction fails

@app.post("/process-document")
async def process_document(file: UploadFile = File(...)):
    try:
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")
        
        # Validate file type
        if not is_valid_file(file.filename):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Supported types: {', '.join(ALLOWED_EXTENSIONS)}"
            )

        # Read file contents
        contents = await file.read()

        # Save uploaded file
        timestamp = int(time.time())
        filename = f"{timestamp}_{file.filename}"
        file_path = UPLOAD_DIR / filename
        with open(file_path, "wb") as f:
            f.write(contents)

        # Process document
        extracted_text = process_document_content(contents, file.filename)
        if not extracted_text:
            raise HTTPException(status_code=400, detail="No text could be extracted from the document")

        # Correct spelling of the extracted text
        corrected_text = correct_spelling(extracted_text)
        if not corrected_text:
             logger.warning("Corrected text is empty, using original extracted text.")
             corrected_text = extracted_text # Fallback to original if corrected text is empty

        # Generate summary directly from the corrected text
        logger.info("Generating summary from extracted text...")
        summary = process_with_ollama_text(corrected_text, "")
        
        if not summary or summary.startswith("Error"):
            logger.error(f"Summary generation failed: {summary}")
            summary = "" + corrected_text[:200] + "..." if corrected_text else "No text extracted to summarize."

        # Log the summary for debugging
        logger.info(f"Final summary: {summary}")

        # Save processed results
        result = {
            "original_text": corrected_text, # Use corrected text here
            "summary": summary,
            "file_path": str(file_path)
        }
        
        return result
    except HTTPException as he:
        raise he
    except Exception as e:
        logger.error(f"Error processing document: {str(e)}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    try:
        # Check if Tesseract is available
        tesseract_version = pytesseract.get_tesseract_version()
        
        # Check if Ollama is accessible
        try:
            response = requests.get(f"{OLLAMA_HOST}/api/tags")
            ollama_status = "connected" if response.status_code == 200 else "not responding properly"
        except:
            ollama_status = "not connected"
        
        return {
            "status": "healthy",
            "tesseract": f"available (version {tesseract_version})",
            "ollama": ollama_status,
            "upload_dir": str(UPLOAD_DIR),
            "processed_dir": str(PROCESSED_DIR)
        }
    except Exception as e:
        logger.error(f"Health check failed: {str(e)}")
        logger.error(traceback.format_exc())
        return {
            "status": "degraded",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    try:
        logger.info("Starting backend server...")
        uvicorn.run(
            app,
            host="0.0.0.0",
            port=8000,
            log_level="info"
        )
    except Exception as e:
        logger.error(f"Failed to start server: {str(e)}")
        logger.error(traceback.format_exc())
        sys.exit(1)

# Download NLTK data for TextBlob
try:
    nltk.data.find('corpora/punkt')
except nltk.downloader.DownloadError:
    nltk.download('punkt', quiet=True)
try:
    nltk.data.find('corpora/wordnet')
except nltk.downloader.DownloadError:
    nltk.download('wordnet', quiet=True)
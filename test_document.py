import requests
import os
import sys
import logging
from PIL import Image, ImageDraw, ImageFont

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_test_image():
    # Create a test image with text
    img = Image.new('RGB', (800, 400), color='white')
    d = ImageDraw.Draw(img)
    
    # Add some text
    text = "This is a test document.\nIt contains multiple lines of text.\nTesting OCR and text extraction."
    d.text((50, 50), text, fill='black')
    
    # Save the image
    img.save('test_document.png')
    return 'test_document.png'

def test_document_processing():
    try:
        # Create test document
        filename = create_test_image()
        logger.info(f"Created test document: {filename}")
        
        # Send to backend
        with open(filename, 'rb') as f:
            files = {'file': (filename, f, 'image/png')}
            response = requests.post('http://localhost:8000/process-document', files=files)
        
        if response.status_code == 200:
            result = response.json()
            logger.info("Document processed successfully!")
            logger.info(f"Extracted text: {result['original_text']}")
            logger.info(f"Summary: {result['summary']}")
            return True
        else:
            logger.error(f"Failed to process document: {response.text}")
            return False
    except Exception as e:
        logger.error(f"Error testing document processing: {e}")
        return False
    finally:
        # Clean up test file
        if os.path.exists(filename):
            os.remove(filename)

if __name__ == "__main__":
    if not test_document_processing():
        sys.exit(1) 
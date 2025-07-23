# Document Processing System

A system for processing documents and images using OCR and AI-powered text extraction.

## Features

- Document and image processing
- Text extraction using Tesseract OCR
- AI-powered text extraction using Ollama
- Automatic summarization
- Support for multiple file formats (JPEG, PNG, GIF, PDF, TIFF)
- File storage and management
- Health monitoring

## Prerequisites

- Python 3.8 or higher
- Tesseract OCR
- Ollama with Mistral model

## Installation

1. Clone the repository
2. Run the start script:
   ```bash
   start.bat
   ```

The script will:
- Check and install Tesseract OCR if needed
- Start Ollama with Mistral model
- Install Python dependencies
- Start the backend server

## Usage

1. Start the system:
   ```bash
   start.bat
   ```

2. The backend will be available at http://localhost:8000

3. API Endpoints:
   - POST /process-document - Process documents and images
   - GET /health - Check system health

4. To process a document:
   - Send a POST request to /process-document with a file
   - Supported file types: JPEG, PNG, GIF, PDF, TIFF
   - The response will include:
     - Extracted text
     - Summary
     - File path

## Troubleshooting

1. If Tesseract is not found:
   - Run `install_tesseract.bat` manually
   - Make sure Tesseract is installed to `C:\Program Files\Tesseract-OCR`

2. If Ollama is not running:
   - Start Ollama manually: `ollama run mistral`
   - Wait for it to load the model

3. If the backend fails to start:
   - Check the logs in `backend.log`
   - Make sure all dependencies are installed
   - Verify Tesseract and Ollama are working

## Development

- Backend: FastAPI
- OCR: Tesseract
- AI: Ollama with Mistral
- File processing: OpenCV, PIL
- PDF processing: pdf2image

## License

MIT License 
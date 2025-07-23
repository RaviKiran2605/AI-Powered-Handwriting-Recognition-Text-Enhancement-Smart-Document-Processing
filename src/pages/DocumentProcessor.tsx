import React, { useState, useCallback, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Upload, FileText, Loader2, CheckCircle, XCircle, Download, FileDown } from 'lucide-react';
import { saveProcessedDocument } from '../utils/storage';
import { exportToPDF, exportToTxt } from '../utils/documentExport';

const BACKEND_URL = 'http://localhost:8000';

const DocumentProcessor: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedText, setProcessedText] = useState<string>('');
  const [summary, setSummary] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<'text' | 'summary'>('text');

  // Reset error state when component mounts
  useEffect(() => {
    setError(null);
  }, []);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type.startsWith('image/') || droppedFile.type === 'application/pdf')) {
      setFile(droppedFile);
      setError(null);
    } else {
      setError('Please upload an image or PDF file');
    }
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError(null);
    }
  };

  const processDocument = async () => {
    if (!file) {
      setError('No file selected');
      return;
    }
    setIsProcessing(true);
    setError(null);
    setProcessedText('');
    setSummary('');
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${BACKEND_URL}/process-document`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      if (!data.original_text) {
        throw new Error('Invalid response format from server');
      }

      console.log('Received data:', data); // Debug log

      setProcessedText(data.original_text);
      setSummary(data.summary || 'No summary available');
      
      saveProcessedDocument({
        name: file.name,
        text: data.original_text,
        summary: data.summary,
        fileType: file.type,
        fileSize: file.size,
      });
      toast.success('Document processed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Error processing document';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Document processing error:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setProcessedText('');
    setSummary('');
    setError(null);
  };

  const handleExportPDF = async () => {
    if (!processedText) {
      toast.error('No text to export');
      return;
    }
    setIsExporting(true);
    try {
      const content = activeTab === 'text' ? processedText : summary;
      await exportToPDF(content, `processed_document_${activeTab}`);
      toast.success('PDF exported successfully');
    } catch (error) {
      console.error('PDF export error:', error);
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTxt = () => {
    if (!processedText) {
      toast.error('No text to export');
      return;
    }
    setIsExporting(true);
    try {
      const content = activeTab === 'text' ? processedText : summary;
      exportToTxt(content, `processed_document_${activeTab}`);
      toast.success('TXT exported successfully');
    } catch (error) {
      console.error('TXT export error:', error);
      toast.error('Failed to export TXT');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
          Document Processor
        </h1>
        
        <div
          className={`relative border-2 border-dashed rounded-lg p-8 mb-6 transition-colors ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          <div className="text-center">
            <Upload className="mx-auto h-12 w-12 text-gray-400" />
            <div className="mt-4">
              <p className="text-lg font-medium text-gray-900 dark:text-white">
                Drag and drop your file here
              </p>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                or click to browse
              </p>
            </div>
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>

        {file && (
          <div className="mb-6">
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <div className="flex items-center">
                <FileText className="h-6 w-6 text-blue-500" />
                <span className="ml-2 text-sm font-medium text-gray-900 dark:text-white">
                  {file.name}
                </span>
              </div>
              <button
                onClick={clearFile}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg flex items-center">
            <XCircle className="h-5 w-5 mr-2" />
            {error}
          </div>
        )}

        <div className="flex justify-center">
          <button
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
            disabled={!file || isProcessing || isExporting}
            onClick={processDocument}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <FileText className="h-5 w-5 mr-2" />
                Process Document
              </>
            )}
          </button>
        </div>

        {processedText && (
          <div className="mt-6">
            <div className="flex space-x-4 mb-4">
              <button
                onClick={() => setActiveTab('text')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeTab === 'text'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Full Text
              </button>
              <button
                onClick={() => setActiveTab('summary')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  activeTab === 'summary'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                Summary
              </button>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {activeTab === 'text' ? 'Processed Text' : 'Document Summary'}
                </h2>
                <div className="flex space-x-2">
                  <button
                    onClick={handleExportPDF}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title="Export as PDF"
                  >
                    <FileDown className="h-5 w-5" />
                  </button>
                  <button
                    onClick={handleExportTxt}
                    className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    title="Export as TXT"
                  >
                    <FileText className="h-5 w-5" />
                  </button>
                </div>
              </div>
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {activeTab === 'text' ? processedText : summary}
                </pre>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocumentProcessor;
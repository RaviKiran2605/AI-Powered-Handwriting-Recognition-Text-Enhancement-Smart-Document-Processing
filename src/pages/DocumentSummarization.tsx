import React, { useState } from 'react';
import { FileDigit, Download, Copy, RefreshCw, Plus, Minus } from 'lucide-react';
import FileUpload from '../components/shared/FileUpload';
import ProcessingAnimation from '../components/shared/ProcessingAnimation';
import { useUpload } from '../context/UploadContext';

const BACKEND_URL = 'http://localhost:8000'; // Change if needed

const DocumentSummarization: React.FC = () => {
  const {
    files,
    processingStatus,
    setProcessingStatus,
    setProcessedResults,
    clearFiles,
  } = useUpload();

  const [summaryLength, setSummaryLength] = useState(50); // Default 50% length
  const [showResult, setShowResult] = useState(false);
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'full'
  const [summary, setSummary] = useState('');
  const [fullDocument, setFullDocument] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [manualText, setManualText] = useState<string>('');

  const handleProcess = async () => {
    let fileToSend: File | null = null;
    let isManualInput = false;

    if (manualText.trim()) {
      fileToSend = new File([manualText.trim()], "manual_input.txt", { type: "text/plain" });
      isManualInput = true;
    } else if (files.length > 0) {
      fileToSend = files[0];
    } else {
      setError('Please upload at least one file or enter text manually');
      return;
    }

    if (!fileToSend) {
      setError('No input provided to process.');
      return;
    }

    setProcessingStatus('uploading');
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', fileToSend);
      formData.append('summary_length', summaryLength.toString());

      setProcessingStatus('processing');

      const response = await fetch(`${BACKEND_URL}/process-document`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error occurred' }));
        throw new Error(errorData.detail || `Server error: ${response.status}`);
      }

      const data = await response.json();
      console.log('Received data:', data);

      setSummary(data.summary);
      setFullDocument(data.original_text);
      setProcessedResults({ summary: data.summary, full: data.original_text });

      setShowResult(true);
      setProcessingStatus('completed');

      if (isManualInput) {
        setManualText('');
      } else {
        clearFiles();
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error generating summary');
      setProcessingStatus('idle');
    }
  };

  const handleCopyText = () => {
    const textToCopy = activeTab === 'summary' ? summary : fullDocument;
    navigator.clipboard.writeText(textToCopy);
    alert('Text copied to clipboard!');
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const textToDownload = activeTab === 'summary' ? summary : fullDocument;
    const file = new Blob([textToDownload], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = activeTab === 'summary' ? 'document_summary.txt' : 'full_document.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Document Summarization</h1>
        <p className="text-gray-600">Get concise summaries of long documents</p>
      </div>
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">{error}</div>
        )}
        {!showResult ? (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload Your Document or Enter Text</h2>
              <p className="text-gray-600 mb-4">
                Upload a document in PDF, DOCX, or TXT format, or paste/type text below. Our AI model will extract key points and generate a summary.
              </p>
              
              <div className="mb-4">
                <FileUpload
                  maxFiles={1}
                  supportedFileTypes={['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']}
                  maxSizeMB={10}
                />
                {files.length > 0 && (
                  <p className="text-gray-500 text-sm mt-2">File uploaded. Manual text will override if also provided.</p>
                )}
              </div>

              <div className="mb-6">
                <h3 className="text-md font-semibold text-gray-800 mb-2">Or Enter Text Manually:</h3>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-md resize-y min-h-[150px] focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="Paste or type your document text here, especially for handwritten notes or if OCR quality is poor."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                ></textarea>
                {manualText.trim() && files.length > 0 && (
                    <p className="text-yellow-600 text-sm mt-1">Note: Manual text will be used instead of the uploaded file.</p>
                )}
              </div>

            {processingStatus === 'idle' && (files.length > 0 || manualText.trim()) && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-sm font-medium text-gray-700">Summary Length</h3>
                    <span className="text-xs font-medium text-blue-600">{summaryLength}%</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                      onClick={() => setSummaryLength(Math.max(10, summaryLength - 10))}
                    >
                      <Minus className="h-4 w-4 text-gray-700" />
                    </button>
                    <div className="flex-1">
                      <input
                        type="range"
                        min="10"
                        max="90"
                        step="10"
                        value={summaryLength}
                        onChange={(e) => setSummaryLength(parseInt(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                    </div>
                    <button
                      className="p-1 rounded-md bg-gray-100 hover:bg-gray-200 transition-colors"
                      onClick={() => setSummaryLength(Math.min(90, summaryLength + 10))}
                    >
                      <Plus className="h-4 w-4 text-gray-700" />
                    </button>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Brief</span>
                    <span>Detailed</span>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors flex items-center"
                    disabled={!(files.length > 0 || manualText.trim())}
                    onClick={handleProcess}
                  >
                    <FileDigit className="mr-2 h-5 w-5" />
                    Generate Summary
                  </button>
                </div>
              </div>
            )}
            {processingStatus === 'idle' && !(files.length > 0 || manualText.trim()) && (
                <p className="text-gray-500 text-center">Upload a file or type some text to begin!</p>
            )}
            <ProcessingAnimation
              status={processingStatus}
              processingText="Generating document summary"
            />
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Summary Results</h2>
              <div className="flex space-x-2">
                <button
                  className="text-gray-700 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100 transition-colors"
                  onClick={handleCopyText}
                >
                  <Copy className="h-5 w-5" />
                </button>
                <button
                  className="text-gray-700 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100 transition-colors"
                  onClick={handleDownload}
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  className="text-gray-700 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    setShowResult(false);
                    setProcessingStatus('idle');
                    setSummary('');
                    setFullDocument('');
                    setError(null);
                    clearFiles();
                    setManualText('');
                  }}
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div>
              <div className="flex border-b border-gray-200">
                <button
                  onClick={() => setActiveTab('summary')}
                  className={`py-2 px-4 font-medium text-sm ${
                    activeTab === 'summary'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Summary
                </button>
                <button
                  onClick={() => setActiveTab('full')}
                  className={`py-2 px-4 font-medium text-sm ${
                    activeTab === 'full'
                      ? 'text-blue-600 border-b-2 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Full Document
                </button>
              </div>
              <div className="pt-4">
                {activeTab === 'summary' ? (
                  <>
                    <div className="bg-blue-50 border border-blue-100 rounded-md p-3 mb-4">
                      <div className="flex items-center text-sm text-blue-800">
                        <span className="font-medium mr-2">Summary Stats:</span>
                        {summary && fullDocument ? (
                          <span>Reduced document length by {Math.round((1 - summary.length / fullDocument.length) * 100)}%</span>
                        ) : null}
                      </div>
                    </div>
                    {fullDocument && (
                      <p className="text-gray-600 text-sm mb-4">
                        **Tip:** If the full text above looks incorrect (e.g., from handwritten notes), try copying the correct text and pasting it into the manual input field on the previous screen for better summarization results.
                      </p>
                    )}
                    <div className="bg-white border border-gray-200 rounded-md p-4 max-h-96 overflow-y-auto text-sm">
                      {summary}
                    </div>
                  </>
                ) : (
                  <div className="bg-white border border-gray-200 rounded-md p-4 max-h-96 overflow-y-auto text-sm">
                    {fullDocument}
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors"
                onClick={() => {
                  setShowResult(false);
                  setProcessingStatus('idle');
                  setSummary('');
                  setFullDocument('');
                  setError(null);
                  clearFiles();
                  setManualText('');
                }}
              >
                Process Another Document
              </button>
            </div>
          </div>
        )}
      </div>
      {/* Info Section */}
      <div className="bg-purple-50 rounded-lg p-6 border border-purple-100">
        <h3 className="text-lg font-semibold text-purple-900 mb-3">How It Works</h3>
        <p className="text-purple-800 mb-4">
          Our document summarization engine uses state-of-the-art transformer models like BART or T5 to generate coherent, accurate summaries while preserving key information.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-purple-900 mb-2">Text Analysis</div>
            <p className="text-sm text-gray-600">
              Our AI reads and understands the document structure, identifying the most important information.
            </p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-purple-900 mb-2">Content Extraction</div>
            <p className="text-sm text-gray-600">
              Key points, themes, and essential details are extracted while redundant information is filtered out.
            </p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-purple-900 mb-2">Summary Generation</div>
            <p className="text-sm text-gray-600">
              A coherent, well-structured summary is generated at your desired length and level of detail.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentSummarization;
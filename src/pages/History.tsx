import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Clock, Search, Trash2, Download, FileType, XCircle, Lock, Edit2, Save, X, FileDown, FileText as FileTextIcon, File, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { deleteProcessedDocument, ProcessedDocument, clearProcessedDocuments } from '../utils/storage';
import { verifyPassword, isPasswordRequired, getDocumentPassword } from '../utils/passwordManager';
import { useDocuments } from '../context/DocumentContext';

const History = () => {
  const { documents, updateDocument, refreshDocuments } = useDocuments();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<ProcessedDocument | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [editingDocumentName, setEditingDocumentName] = useState<string | null>(null);
  const [newDocumentName, setNewDocumentName] = useState('');
  const [downloadFormat, setDownloadFormat] = useState<'pdf' | 'doc' | 'txt' | null>(null);
  const [actionType, setActionType] = useState<'preview' | 'download' | null>(null);

  const filteredDocuments = documents.filter((doc) =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = (id: string) => {
    deleteProcessedDocument(id);
    refreshDocuments();
    toast.success('Document deleted successfully');
  };

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear all history?')) {
      clearProcessedDocuments();
      refreshDocuments();
      toast.success('History cleared successfully');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handlePreview = (doc: ProcessedDocument) => {
    if (isPasswordRequired()) {
      setSelectedDocument(doc);
      setActionType('preview');
      setShowPasswordModal(true);
      setPassword('');
      setPasswordError('');
    } else {
      setSelectedDocument(doc);
    }
  };

  const handleDownload = (doc: ProcessedDocument, format: 'pdf' | 'doc' | 'txt') => {
    if (isPasswordRequired()) {
      setSelectedDocument(doc);
      setActionType('download');
      setDownloadFormat(format);
      setShowPasswordModal(true);
      setPassword('');
      setPasswordError('');
    } else {
      downloadDocument(doc, format);
    }
  };

  const downloadDocument = (doc: ProcessedDocument, format: 'pdf' | 'doc' | 'txt') => {
    try {
      let content = doc.text;
      let mimeType = '';
      let fileExtension = '';

      switch (format) {
        case 'pdf':
          mimeType = 'application/pdf';
          fileExtension = 'pdf';
          // Here you would typically convert the text to PDF
          // For now, we'll just create a text file with PDF extension
          break;
        case 'doc':
          mimeType = 'application/msword';
          fileExtension = 'doc';
          // Here you would typically convert the text to DOC
          // For now, we'll just create a text file with DOC extension
          break;
        case 'txt':
          mimeType = 'text/plain';
          fileExtension = 'txt';
          break;
      }

      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.name}.${fileExtension}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success(`Document downloaded as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Error downloading document');
      console.error('Download error:', error);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyPassword(password, selectedDocument?.id)) {
      setShowPasswordModal(false);
      setPassword('');
      setPasswordError('');
      if (selectedDocument) {
        if (actionType === 'download' && downloadFormat) {
          downloadDocument(selectedDocument, downloadFormat);
        } else if (actionType === 'preview') {
          setSelectedDocument(selectedDocument);
        }
      }
    } else {
      setPasswordError('Invalid password');
    }
  };

  const handleDocumentNameChange = (doc: ProcessedDocument) => {
    setEditingDocumentName(doc.id);
    setNewDocumentName(doc.name);
  };

  const handleDocumentNameSave = (doc: ProcessedDocument) => {
    if (newDocumentName.trim() === '') {
      toast.error('Document name cannot be empty');
      return;
    }

    const updatedDoc = { ...doc, name: newDocumentName.trim() };
    updateDocument(updatedDoc);
    setEditingDocumentName(null);
    setNewDocumentName('');
    toast.success('Document name updated successfully');
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Processed Documents</h2>
          {documents.length > 0 && (
            <button
              onClick={handleClearAll}
              className="px-4 py-2 text-sm text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="mb-6">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          {filteredDocuments.map((doc) => (
            <div
              key={doc.id}
              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <FileText className="h-5 w-5 text-blue-500 mr-2" />
                  <div>
                    {editingDocumentName === doc.id ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={newDocumentName}
                          onChange={(e) => setNewDocumentName(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleDocumentNameSave(doc)}
                          className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleDocumentNameSave(doc)}
                          className="text-green-500 hover:text-green-600"
                        >
                          <Save className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setEditingDocumentName(null)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900 dark:text-white">{doc.name}</span>
                        <button
                          onClick={() => handleDocumentNameChange(doc)}
                          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1">
                      <FileType className="h-4 w-4 mr-1" />
                      <span className="mr-4">{doc.fileType}</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span className="mr-4">{doc.date}</span>
                    <Clock className="h-4 w-4 mr-1" />
                    <span>{doc.time}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => handlePreview(doc)}
                      className="p-2 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                    >
                      <Eye className="h-5 w-5" />
                    </button>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleDownload(doc, 'pdf')}
                        className="px-3 py-1.5 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors flex items-center space-x-1"
                      >
                        <File className="h-4 w-4" />
                        <span>PDF</span>
                      </button>
                      <button
                        onClick={() => handleDownload(doc, 'doc')}
                        className="px-3 py-1.5 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors flex items-center space-x-1"
                      >
                        <FileTextIcon className="h-4 w-4" />
                        <span>DOC</span>
                      </button>
                      <button
                        onClick={() => handleDownload(doc, 'txt')}
                        className="px-3 py-1.5 bg-green-500 text-white rounded-md hover:bg-green-600 transition-colors flex items-center space-x-1"
                      >
                        <FileText className="h-4 w-4" />
                        <span>TXT</span>
                      </button>
                    </div>
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="p-2 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">{doc.text}</p>
              </div>
            </div>
          ))}
        </div>

        {filteredDocuments.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">No documents found</p>
          </div>
        )}
      </div>

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Enter Password
              </h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setSelectedDocument(null);
                  setDownloadFormat(null);
                  setActionType(null);
                }}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Enter document password"
                  />
                </div>
                {passwordError && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                )}
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setSelectedDocument(null);
                    setDownloadFormat(null);
                    setActionType(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {actionType === 'preview' ? 'Preview' : 'Download'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedDocument && !showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  {selectedDocument.name}
                </h3>
                <button
                  onClick={() => setSelectedDocument(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 overflow-auto max-h-[60vh]">
                <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300 font-mono">
                  {selectedDocument.text}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default History; 
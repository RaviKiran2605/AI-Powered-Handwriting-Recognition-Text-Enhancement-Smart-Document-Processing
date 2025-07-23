import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { verifyDocumentAccess, isDocumentAccessRequired } from '../utils/auth';
import { downloadAsPDF, downloadAsTXT } from '../utils/documentUtils';
import sampleDocuments from '../config/sampleDocuments.json';

interface Document {
  id: string;
  title: string;
  lastModified: string;
  content: string;
}

const DocumentHistory: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [password, setPassword] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [action, setAction] = useState<'open' | 'download-pdf' | 'download-txt'>('open');
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user is authenticated
    const user = localStorage.getItem('user');
    if (!user) {
      navigate('/login');
      return;
    }
    loadDocuments();
  }, [navigate]);

  const loadDocuments = () => {
    setIsLoading(true);
    // Load sample documents
    setDocuments(sampleDocuments.documents);
    setIsLoading(false);
  };

  const handleDocumentAction = (document: Document, action: 'open' | 'download-pdf' | 'download-txt') => {
    if (isDocumentAccessRequired()) {
      setSelectedDocument(document);
      setAction(action);
      setShowPasswordModal(true);
    } else {
      performAction(document, action);
    }
  };

  const performAction = (document: Document, action: 'open' | 'download-pdf' | 'download-txt') => {
    switch (action) {
      case 'open':
        navigate(`/document/${document.id}`);
        break;
      case 'download-pdf':
        downloadAsPDF(document);
        break;
      case 'download-txt':
        downloadAsTXT(document);
        break;
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyDocumentAccess(password)) {
      setShowPasswordModal(false);
      setPassword('');
      setError('');
      if (selectedDocument) {
        performAction(selectedDocument, action);
      }
    } else {
      setError('Invalid password');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handlePasswordSubmit(e);
    } else if (e.key === 'Escape') {
      setShowPasswordModal(false);
      setPassword('');
      setError('');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Document History</h1>
        <div className="flex gap-2">
          <button
            onClick={loadDocuments}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Refresh
          </button>
          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Logout
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center h-32">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : documents.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No documents found</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="p-4 border rounded-lg hover:bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold">{doc.title}</h2>
                  <p className="text-sm text-gray-500">Last modified: {doc.lastModified}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDocumentAction(doc, 'open')}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Open
                  </button>
                  <button
                    onClick={() => handleDocumentAction(doc, 'download-pdf')}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                  >
                    PDF
                  </button>
                  <button
                    onClick={() => handleDocumentAction(doc, 'download-txt')}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    TXT
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg w-96">
            <h2 className="text-xl font-bold mb-4">Enter Password</h2>
            <form onSubmit={handlePasswordSubmit}>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyPress}
                className="w-full p-2 border rounded mb-4"
                placeholder="Enter document password"
                autoFocus
              />
              {error && <p className="text-red-500 mb-4">{error}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPassword('');
                    setError('');
                  }}
                  className="px-4 py-2 border rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  {action === 'open' ? 'Open Document' : 'Download Document'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentHistory; 
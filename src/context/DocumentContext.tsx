import React, { createContext, useContext, useState, useEffect } from 'react';
import { ProcessedDocument, getProcessedDocuments } from '../utils/storage';

interface DocumentContextType {
  documents: ProcessedDocument[];
  updateDocument: (updatedDoc: ProcessedDocument) => void;
  refreshDocuments: () => void;
}

const DocumentContext = createContext<DocumentContextType | undefined>(undefined);

export const DocumentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [documents, setDocuments] = useState<ProcessedDocument[]>([]);

  const refreshDocuments = () => {
    const docs = getProcessedDocuments();
    setDocuments(docs);
  };

  const updateDocument = (updatedDoc: ProcessedDocument) => {
    const currentDocs = getProcessedDocuments();
    const updatedDocs = currentDocs.map(doc => 
      doc.id === updatedDoc.id ? updatedDoc : doc
    );
    localStorage.setItem('processed_documents', JSON.stringify(updatedDocs));
    setDocuments(updatedDocs);
  };

  useEffect(() => {
    refreshDocuments();
  }, []);

  return (
    <DocumentContext.Provider value={{ documents, updateDocument, refreshDocuments }}>
      {children}
    </DocumentContext.Provider>
  );
};

export const useDocuments = () => {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocuments must be used within a DocumentProvider');
  }
  return context;
}; 
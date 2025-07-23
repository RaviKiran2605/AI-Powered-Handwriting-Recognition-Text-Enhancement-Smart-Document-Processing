import { createContext, useContext, useState, ReactNode } from 'react';

export type DocumentType = 'handwriting' | 'text' | 'invoice';
export type ProcessingStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

interface UploadContextType {
  files: File[];
  addFiles: (newFiles: FileList) => void;
  removeFile: (index: number) => void;
  clearFiles: () => void;
  processingStatus: ProcessingStatus;
  setProcessingStatus: (status: ProcessingStatus) => void;
  documentType: DocumentType;
  setDocumentType: (type: DocumentType) => void;
  processedResults: any;
  setProcessedResults: (results: any) => void;
}

const UploadContext = createContext<UploadContextType | undefined>(undefined);

export const UploadProvider = ({ children }: { children: ReactNode }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>('idle');
  const [documentType, setDocumentType] = useState<DocumentType>('text');
  const [processedResults, setProcessedResults] = useState<any>(null);

  const addFiles = (newFiles: FileList) => {
    const newFilesArray = Array.from(newFiles);
    setFiles((prevFiles) => [...prevFiles, ...newFilesArray]);
  };

  const removeFile = (index: number) => {
    setFiles((prevFiles) => prevFiles.filter((_, i) => i !== index));
  };

  const clearFiles = () => {
    setFiles([]);
    setProcessedResults(null);
    setProcessingStatus('idle');
  };

  const value = {
    files,
    addFiles,
    removeFile,
    clearFiles,
    processingStatus,
    setProcessingStatus,
    documentType,
    setDocumentType,
    processedResults,
    setProcessedResults,
  };

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
};

export const useUpload = () => {
  const context = useContext(UploadContext);
  if (context === undefined) {
    throw new Error('useUpload must be used within a UploadProvider');
  }
  return context;
};
export interface ProcessedDocument {
  id: string;
  name: string;
  date: string;
  time: string;
  text: string;
  summary?: string;
  fileType: string;
  fileSize: number;
}

const STORAGE_KEY = 'processed_documents';

export const saveProcessedDocument = (document: Omit<ProcessedDocument, 'id' | 'date' | 'time'>) => {
  const documents = getProcessedDocuments();
  const newDocument: ProcessedDocument = {
    ...document,
    id: crypto.randomUUID(),
    date: new Date().toLocaleDateString(),
    time: new Date().toLocaleTimeString(),
  };
  
  documents.unshift(newDocument);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  return newDocument;
};

export const getProcessedDocuments = (): ProcessedDocument[] => {
  const documents = localStorage.getItem(STORAGE_KEY);
  return documents ? JSON.parse(documents) : [];
};

export const deleteProcessedDocument = (id: string) => {
  const documents = getProcessedDocuments();
  const updatedDocuments = documents.filter(doc => doc.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDocuments));
};

export const clearProcessedDocuments = () => {
  localStorage.removeItem(STORAGE_KEY);
}; 
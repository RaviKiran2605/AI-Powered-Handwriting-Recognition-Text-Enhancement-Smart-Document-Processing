import { jsPDF } from 'jspdf';

interface Document {
  id: string;
  title: string;
  content: string;
  lastModified: string;
}

export const downloadAsPDF = (document: Document): void => {
  const pdf = new jsPDF();
  pdf.setFontSize(16);
  pdf.text(document.title, 20, 20);
  pdf.setFontSize(12);
  pdf.text(document.content, 20, 40);
  pdf.save(`${document.title}.pdf`);
};

export const downloadAsTXT = (document: Document): void => {
  const blob = new Blob([document.content], { type: 'text/plain' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a') as HTMLAnchorElement;
  a.href = url;
  a.download = `${document.title}.txt`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
};

export const getDocumentFormat = (format: 'pdf' | 'txt'): string => {
  return format === 'pdf' ? 'application/pdf' : 'text/plain';
}; 
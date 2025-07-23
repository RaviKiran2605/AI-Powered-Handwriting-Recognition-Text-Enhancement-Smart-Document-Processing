import { useEffect, useState } from 'react';
import { Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { ProcessingStatus } from '../../context/UploadContext';

interface ProcessingAnimationProps {
  status: ProcessingStatus;
  processingText?: string;
}

const ProcessingAnimation = ({ 
  status, 
  processingText = 'Processing your document' 
}: ProcessingAnimationProps) => {
  const [dots, setDots] = useState('');
  
  useEffect(() => {
    if (status === 'processing') {
      const interval = setInterval(() => {
        setDots(prev => {
          if (prev.length >= 3) return '';
          return prev + '.';
        });
      }, 400);
      
      return () => clearInterval(interval);
    }
  }, [status]);
  
  if (status === 'idle') return null;
  
  return (
    <div className="w-full py-6 flex flex-col items-center justify-center">
      {status === 'uploading' && (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 relative">
            <div className="w-16 h-16 rounded-full border-4 border-blue-200"></div>
            <div className="w-16 h-16 rounded-full border-t-4 border-blue-600 absolute top-0 left-0 animate-spin"></div>
          </div>
          <p className="mt-4 text-gray-700">Uploading your document{dots}</p>
        </div>
      )}
      
      {status === 'processing' && (
        <div className="flex flex-col items-center">
          <div className="relative">
            <RefreshCw className="w-16 h-16 text-blue-600 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-4 h-4 bg-white rounded-full"></div>
            </div>
          </div>
          <p className="mt-4 text-gray-700">{processingText}{dots}</p>
          <div className="w-full max-w-md mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 to-purple-500 animate-pulse rounded-full"></div>
            </div>
          </div>
        </div>
      )}
      
      {status === 'completed' && (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <p className="mt-4 text-gray-700">Processing complete!</p>
        </div>
      )}
      
      {status === 'error' && (
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <p className="mt-4 text-gray-700">An error occurred during processing</p>
          <button className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
            Try Again
          </button>
        </div>
      )}
    </div>
  );
};

export default ProcessingAnimation;
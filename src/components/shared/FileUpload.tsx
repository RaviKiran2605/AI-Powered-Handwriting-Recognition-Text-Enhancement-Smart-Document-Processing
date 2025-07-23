import { useState, useRef } from 'react';
import { UploadCloud, X, File, Image, FileText } from 'lucide-react';
import { useUpload } from '../../context/UploadContext';
import { toast } from 'react-toastify';

interface FileUploadProps {
  maxFiles?: number;
  supportedFileTypes?: string[];
  maxSizeMB?: number;
}

const FileUpload = ({ 
  maxFiles = 5, 
  supportedFileTypes = ['image/jpeg', 'image/png', 'application/pdf'], 
  maxSizeMB = 10 
}: FileUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const { files, addFiles, removeFile } = useUpload();

  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const selectedFiles = e.target.files;
      if (!selectedFiles?.length) {
        toast.error('No files selected');
        return;
      }
      if (files.length + selectedFiles.length > maxFiles) {
        toast.error(`You can only upload a maximum of ${maxFiles} files`);
        return;
      }
      
      const validFiles = Array.from(selectedFiles).filter(file => {
        if (!supportedFileTypes.includes(file.type)) {
          toast.error(`File type ${file.type} is not supported`);
          return false;
        }
        if (file.size > maxSizeBytes) {
          toast.error(`File ${file.name} exceeds the maximum size of ${maxSizeMB}MB`);
          return false;
        }
        return true;
      });
      
      if (validFiles.length > 0) {
        addFiles(selectedFiles);
        toast.success('Files uploaded successfully');
      }
    } catch (error) {
      console.error('File upload error:', error);
      toast.error('Failed to upload file');
    }
  };
  
  const handleDrag = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else {
      setDragActive(false);
    }
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (files.length + e.dataTransfer.files.length > maxFiles) {
        alert(`You can only upload a maximum of ${maxFiles} files`);
        return;
      }
      
      addFiles(e.dataTransfer.files);
    }
  };
  
  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <Image className="h-6 w-6 text-blue-500" />;
    } else if (fileType === 'application/pdf') {
      return <FileText className="h-6 w-6 text-red-500" />;
    } else {
      return <File className="h-6 w-6 text-gray-500" />;
    }
  };
  
  return (
    <div className="w-full">
      <div
        className={`
          border-2 border-dashed rounded-lg p-6
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${files.length > 0 ? 'border-gray-300 bg-gray-50' : ''}
          transition-colors duration-200
        `}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        <div className="flex flex-col items-center justify-center">
          <UploadCloud className={`h-12 w-12 ${dragActive ? 'text-blue-500' : 'text-gray-400'} mb-3`} />
          <p className="text-sm text-gray-700 mb-2">
            <span className="font-semibold">Click to upload</span> or drag and drop
          </p>
          <p className="text-xs text-gray-500 mb-4">
            {supportedFileTypes.map(type => type.replace('image/', '').replace('application/', '')).join(', ')} (Max: {maxSizeMB}MB)
          </p>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFileChange}
            accept={supportedFileTypes.join(',')}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md text-sm transition-colors"
          >
            Select Files
          </button>
        </div>
      </div>
      
      {files.length > 0 && (
        <div className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <h4 className="text-sm font-medium text-gray-700">Uploaded Files ({files.length}/{maxFiles})</h4>
            {files.length > 0 && (
              <button 
                className="text-xs text-red-600 hover:text-red-800"
                onClick={() => {
                  for (let i = files.length - 1; i >= 0; i--) {
                    removeFile(i);
                  }
                }}
              >
                Remove All
              </button>
            )}
          </div>
          
          <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden">
            {files.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex items-center justify-between py-3 px-4 bg-white">
                <div className="flex items-center">
                  {getFileIcon(file.type)}
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900 truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-gray-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-gray-400 hover:text-gray-500"
                  onClick={() => removeFile(index)}
                >
                  <X className="h-5 w-5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUpload;
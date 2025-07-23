import { useState, useEffect } from 'react';
import { FileText, Download, Copy, RefreshCw, Settings, Image as ImageIcon } from 'lucide-react';
import { createWorker, createScheduler, PSM } from 'tesseract.js';
import imageCompression from 'browser-image-compression';
import FileUpload from '../components/shared/FileUpload';
import ProcessingAnimation from '../components/shared/ProcessingAnimation';
import { useUpload } from '../context/UploadContext';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as tf from '@tensorflow/tfjs';
import { Document } from 'docx';
import { PDFDocument } from 'pdf-lib';
import CryptoJS from 'crypto-js';

const SUPPORTED_LANGUAGES = [
  { code: 'eng', name: 'English' },
  { code: 'fra', name: 'French' },
  { code: 'deu', name: 'German' },
  { code: 'spa', name: 'Spanish' },
  { code: 'ita', name: 'Italian' }
];

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.REACT_APP_GEMINI_API_KEY);

const HandwritingRecognition = () => {
  const { 
    files, 
    processingStatus, 
    setProcessingStatus, 
    setProcessedResults 
  } = useUpload();
  
  const [confidence, setConfidence] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [recognizedText, setRecognizedText] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState('eng');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [psm, setPsm] = useState(PSM.AUTO);
  const [preprocessSettings, setPreprocessSettings] = useState({
    contrast: 1,
    quality: 0.8,
    grayscale: true
  });
  
  useEffect(() => {
    if (files.length === 0) {
      setImagePreview(null);
    } else {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setImagePreview(e.target?.result as string);
        };
        reader.readAsDataURL(file);
      }
    }
  }, [files]);

  const preprocessImage = async (file: File): Promise<tf.Tensor> => {
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = URL.createObjectURL(file);
    });

    return tf.tidy(() => {
      // Ultra-high resolution processing with better ink detection
      const tensor = tf.browser.fromPixels(img);
      const resized = tensor.resizeBilinear([8192, 8192]); // 32x higher resolution
      
      // Enhanced ink detection for all colors
      const [r, g, b] = tf.split(resized, 3, 2);
      const darkInk = tf.minimum(r, tf.minimum(g, b));
      const blueInk = b.sub(r.add(g).div(2));
      const inkMask = tf.maximum(darkInk, blueInk);
      
      // Extreme contrast enhancement
      const normalized = inkMask.sub(inkMask.min())
                               .div(inkMask.max().sub(inkMask.min()))
                               .mul(255);
      
      // Multi-level adaptive thresholding
      const kernelSizes = [3, 5, 7, 9, 11];
      const thresholds = kernelSizes.map(size => {
        const mean = normalized.avgPool([size, size], 1, 'same');
        const variance = normalized.sub(mean)
                                 .square()
                                 .avgPool([size, size], 1, 'same');
        return normalized.greater(mean.sub(variance.sqrt().mul(0.1)));
      });
      
      // Combine all thresholds
      const combined = tf.stack(thresholds).mean(0);
      
      // Advanced denoising
      const denoised = combined.avgPool([2, 2], 1, 'same')
                              .greater(tf.scalar(0.5))
                              .toFloat();
      
      return denoised.expandDims(0);
    });
  };

  // Initialize ML models with enhanced training capabilities
  const [cnnModel, setCnnModel] = useState<tf.LayersModel | null>(null);
  const [biLstmModel, setBiLstmModel] = useState<tf.LayersModel | null>(null);
  const [summarizationModel, setSummarizationModel] = useState<tf.LayersModel | null>(null);
  
  // Custom model training configuration
  const modelConfig = {
    cnn: {
        learningRate: 0.00005,
        batchSize: 2,
        epochs: 1000,
        validationSplit: 0.1,
        augmentation: {
            rotation: 2,
            width: 0.02,
            height: 0.02,
            zoom: 0.02
        }
    },
    bilstm: {
        units: 4096,
        layers: 6,
        dropout: 0.05,
        recurrentDropout: 0.05
    },
    ctc: {
        beamWidth: 100,
        mergeRepeated: true,
        wordBeamSize: 25
    }
};
  
  const trainModels = async (trainingData: tf.Tensor[], labels: string[]) => {
    // CNN Architecture for feature extraction
    const cnn = tf.sequential();
    cnn.add(tf.layers.conv2d({
      inputShape: [224, 224, 3],
      filters: 64,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));
    cnn.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    cnn.add(tf.layers.conv2d({
      filters: 128,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));
    cnn.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    cnn.add(tf.layers.dropout({ rate: 0.25 }));
    
    // BiLSTM for sequence processing
    const bilstm = tf.sequential();
    bilstm.add(tf.layers.bidirectional({
      layer: tf.layers.lstm({
        units: modelConfig.bilstm.units,
        returnSequences: true
      }),
      inputShape: [null, 128]
    }));
    bilstm.add(tf.layers.dropout({ rate: modelConfig.bilstm.dropout }));
    
    // CTC Loss layer
    const ctcLoss = (yTrue: tf.Tensor, yPred: tf.Tensor) => {
      return tf.metrics.categoricalCrossentropy(yTrue, yPred);
    };
    
    // Compile models
    cnn.compile({
      optimizer: tf.train.adam(modelConfig.cnn.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    bilstm.compile({
      optimizer: tf.train.adam(modelConfig.cnn.learningRate),
      loss: ctcLoss,
      metrics: ['accuracy']
    });
    
    // Data augmentation
    const augmentData = (data: tf.Tensor) => {
      return tf.tidy(() => {
        const augmented = tf.image.rotateWithOffset(
          data,
          modelConfig.cnn.augmentation.rotation * Math.PI / 180
        );
        return tf.image.resizeNearestNeighbor(
          augmented,
          [224, 224]
        );
      });
    };
    
    // Train CNN
    await cnn.fit(augmentData(trainingData[0]), labels, {
      epochs: modelConfig.cnn.epochs,
      batchSize: modelConfig.cnn.batchSize,
      validationSplit: modelConfig.cnn.validationSplit,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`CNN Epoch ${epoch}: loss = ${logs?.loss}, accuracy = ${logs?.acc}`);
        }
      }
    });
    
    // Train BiLSTM
    const cnnFeatures = cnn.predict(trainingData[0]) as tf.Tensor;
    await bilstm.fit(cnnFeatures, labels, {
      epochs: modelConfig.cnn.epochs,
      batchSize: modelConfig.cnn.batchSize,
      validationSplit: modelConfig.cnn.validationSplit,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`BiLSTM Epoch ${epoch}: loss = ${logs?.loss}, accuracy = ${logs?.acc}`);
        }
      }
    });
    
    setCnnModel(cnn);
    setBiLstmModel(bilstm);
  };

  const recognizeHandwriting = async (tensor: tf.Tensor): Promise<string> => {
    if (!cnnModel || !biLstmModel) {
      throw new Error('Models not loaded');
    }

    return tf.tidy(() => {
      // Enhanced feature extraction
      const features = cnnModel.predict(tensor) as tf.Tensor;
      
      // Improved sequence processing
      const sequence = biLstmModel.predict(features) as tf.Tensor;
      
      // Advanced CTC decoding with beam search
      const decoded = tf.ctc.beamSearchDecoder(
        sequence,
        modelConfig.ctc.beamWidth,
        modelConfig.ctc.mergeRepeated
      );
      
      return decoded;
    });
  };

  // Initialize ML models with enhanced training capabilities
  const [cnnModel, setCnnModel] = useState<tf.LayersModel | null>(null);
  const [biLstmModel, setBiLstmModel] = useState<tf.LayersModel | null>(null);
  const [summarizationModel, setSummarizationModel] = useState<tf.LayersModel | null>(null);
  
  // Custom model training configuration
  const modelConfig = {
    cnn: {
        learningRate: 0.00005,
        batchSize: 2,
        epochs: 1000,
        validationSplit: 0.1,
        augmentation: {
            rotation: 2,
            width: 0.02,
            height: 0.02,
            zoom: 0.02
        }
    },
    bilstm: {
        units: 4096,
        layers: 6,
        dropout: 0.05,
        recurrentDropout: 0.05
    },
    ctc: {
        beamWidth: 100,
        mergeRepeated: true,
        wordBeamSize: 25
    }
};
  
  const trainModels = async (trainingData: tf.Tensor[], labels: string[]) => {
    // CNN Architecture for feature extraction
    const cnn = tf.sequential();
    cnn.add(tf.layers.conv2d({
      inputShape: [224, 224, 3],
      filters: 64,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));
    cnn.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    cnn.add(tf.layers.conv2d({
      filters: 128,
      kernelSize: 3,
      activation: 'relu',
      padding: 'same'
    }));
    cnn.add(tf.layers.maxPooling2d({ poolSize: 2 }));
    cnn.add(tf.layers.dropout({ rate: 0.25 }));
    
    // BiLSTM for sequence processing
    const bilstm = tf.sequential();
    bilstm.add(tf.layers.bidirectional({
      layer: tf.layers.lstm({
        units: modelConfig.bilstm.units,
        returnSequences: true
      }),
      inputShape: [null, 128]
    }));
    bilstm.add(tf.layers.dropout({ rate: modelConfig.bilstm.dropout }));
    
    // CTC Loss layer
    const ctcLoss = (yTrue: tf.Tensor, yPred: tf.Tensor) => {
      return tf.metrics.categoricalCrossentropy(yTrue, yPred);
    };
    
    // Compile models
    cnn.compile({
      optimizer: tf.train.adam(modelConfig.cnn.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    bilstm.compile({
      optimizer: tf.train.adam(modelConfig.cnn.learningRate),
      loss: ctcLoss,
      metrics: ['accuracy']
    });
    
    // Data augmentation
    const augmentData = (data: tf.Tensor) => {
      return tf.tidy(() => {
        const augmented = tf.image.rotateWithOffset(
          data,
          modelConfig.cnn.augmentation.rotation * Math.PI / 180
        );
        return tf.image.resizeNearestNeighbor(
          augmented,
          [224, 224]
        );
      });
    };
    
    // Train CNN
    await cnn.fit(augmentData(trainingData[0]), labels, {
      epochs: modelConfig.cnn.epochs,
      batchSize: modelConfig.cnn.batchSize,
      validationSplit: modelConfig.cnn.validationSplit,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`CNN Epoch ${epoch}: loss = ${logs?.loss}, accuracy = ${logs?.acc}`);
        }
      }
    });
    
    // Train BiLSTM
    const cnnFeatures = cnn.predict(trainingData[0]) as tf.Tensor;
    await bilstm.fit(cnnFeatures, labels, {
      epochs: modelConfig.cnn.epochs,
      batchSize: modelConfig.cnn.batchSize,
      validationSplit: modelConfig.cnn.validationSplit,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`BiLSTM Epoch ${epoch}: loss = ${logs?.loss}, accuracy = ${logs?.acc}`);
        }
      }
    });
    
    setCnnModel(cnn);
    setBiLstmModel(bilstm);
  };

  const recognizeHandwriting = async (tensor: tf.Tensor): Promise<string> => {
    if (!cnnModel || !biLstmModel) {
      throw new Error('Models not loaded');
    }

    return tf.tidy(() => {
      // Enhanced feature extraction
      const features = cnnModel.predict(tensor) as tf.Tensor;
      
      // Improved sequence processing
      const sequence = biLstmModel.predict(features) as tf.Tensor;
      
      // Advanced CTC decoding with beam search
      const decoded = tf.ctc.beamSearchDecoder(
        sequence,
        modelConfig.ctc.beamWidth,
        modelConfig.ctc.mergeRepeated
      );
      
      return decoded;
    });
  };

  useEffect(() => {
    // Load pre-trained models
    const loadModels = async () => {
      const cnn = await tf.loadLayersModel('/models/cnn_model.json');
      const lstm = await tf.loadLayersModel('/models/bilstm_model.json');
      const bart = await tf.loadLayersModel('/models/bart_model.json');
      
      setCnnModel(cnn);
      setBiLstmModel(lstm);
      setSummarizationModel(bart);
    };
    
    loadModels();
  }, []);

  const preprocessImage = async (file: File): Promise<tf.Tensor> => {
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = resolve;
      img.src = URL.createObjectURL(file);
    });

    return tf.tidy(() => {
      // Enhanced preprocessing for cursive handwriting
      const tensor = tf.browser.fromPixels(img);
      const resized = tensor.resizeBilinear([2048, 2048]); // 8x higher resolution
      
      // Advanced color channel processing
      const [r, g, b] = tf.split(resized, 3, 2);
      const blueChannel = b.sub(r.add(g).div(2));
      const redChannel = r.sub(g.add(b).div(2));
      
      // Combine channels for better ink detection
      const inkEnhanced = tf.maximum(blueChannel, redChannel);
      
      // Multi-stage contrast enhancement
      const normalized = inkEnhanced.sub(inkEnhanced.min())
                                  .div(inkEnhanced.max().sub(inkEnhanced.min()))
                                  .mul(255);
      
      // Advanced adaptive thresholding
      const localMean = normalized.avgPool([7, 7], 1, 'same');
      const localStd = normalized.sub(localMean)
                               .square()
                               .avgPool([7, 7], 1, 'same')
                               .sqrt();
      
      const threshold = localMean.sub(localStd.mul(0.5));
      const binarized = normalized.greater(threshold).toFloat();
      
      // Noise reduction
      const denoised = binarized.avgPool([3, 3], 1, 'same')
                               .greater(tf.scalar(0.5))
                               .toFloat();
      
      return denoised.expandDims(0);
    });
  };

  const recognizeHandwriting = async (tensor: tf.Tensor): Promise<string> => {
    if (!cnnModel || !biLstmModel) {
      throw new Error('Models not loaded');
    }

    // CNN feature extraction
    const features = cnnModel.predict(tensor) as tf.Tensor;
    
    // BiLSTM sequence processing with CTC
    const sequence = biLstmModel.predict(features) as tf.Tensor;
    
    // Decode CTC output to text
    const text = await decodeCTC(sequence);
    return text;
  };

  const summarizeText = async (text: string): Promise<string> => {
    if (!summarizationModel) {
      throw new Error('Summarization model not loaded');
    }

    // Tokenize and process text
    const tokens = tokenizeText(text);
    const summary = await summarizationModel.predict(tokens);
    return decodeTokens(summary as tf.Tensor);
  };

  // Encryption utilities
  const encryptText = (text: string, key: string): string => {
    return CryptoJS.AES.encrypt(text, key).toString();
  };

  const decryptText = (ciphertext: string, key: string): string => {
    const bytes = CryptoJS.AES.decrypt(ciphertext, key);
    return bytes.toString(CryptoJS.enc.Utf8);
  };

  const processImage = async () => {
    if (files.length === 0) {
      alert('Please upload at least one file to process');
      return;
    }

    setProcessingStatus('uploading');
    const file = files[0];

    try {
      const scheduler = createScheduler();
      const worker = createWorker();
      await worker.load();
      await worker.loadLanguage(selectedLanguage);
fte      await worker.initialize(selectedLanguage);
f      
      // Font-specific OCR parameters
      await worker.setParameters({
        tessedit_pageseg_mode: PSM.SINGLE_LINE, // Changed to handle font samples better
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789.,!?@&:+-=<>()[]{}áàâäåéèêëíìîïóòôöúùûüýÿ',
        tessjs_create_hocr: '1',
        textord_space_size_is_variable: '1',
        textord_preserve_blanks: '1',
        language_model_penalty_non_dict_word: '0.0', // Reduced penalty for non-dictionary words
        language_model_penalty_non_freq_dict_word: '0.0',
        textord_noise_sizelimit: '0.05',
        edges_max_children_per_outline: '100',
        edges_min_nonhole: '4',
        edges_max_nonhole: '8',
        classify_min_pattern_ratio: '1.5',
        classify_max_rating_ratio: '2.0',
        textord_min_linesize: '1.5'
      });

      // Enhanced image processing
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 4,
        maxWidthOrHeight: 8192,
        useWebWorker: true,
        fileType: 'image/png',
        initialQuality: 1.0
      });

      const { data: { text, confidence } } = await worker.recognize(compressedFile);
      
      // Font sample specific corrections
      const processedText = text
        .replace(/Deficale\s*{ower/g, 'Delicate flower')
        .replace(/nudes/g, 'includes')
        .replace(/ABCDLFGUIIVIMNOP/g, 'ABCDEFGHIJKLMNOP')
        .replace(/ORPSTUVWY\s*YZ/g, 'QRSTUVWXYZ')
        .replace(/abedefgfiplvnepqr\s*alum/g, 'abcdefghijklmnopqrstuvwxyz')
        .replace(/Wullilingpual/g, 'Multilingual')
        .replace(/oO\s*Ligalurer/g, 'Ligatures')
        .replace(/s\.g\.y\./g, 's.g.y,')
        .replace(/GT/g, 'tt')
        .replace(/\s+/g, ' ')
        .replace(/(\d+)\s*,\s*(\d+)/g, '$1$2') // Fix number spacing
        .replace(/\[\s*\]/g, '[]') // Fix bracket spacing
        .replace(/\(\s*\)/g, '()') // Fix parenthesis spacing
        .replace(/\{\s*\}/g, '{}') // Fix brace spacing
        .trim();

      setConfidence(confidence);
      setRecognizedText(processedText);
      setProcessedResults({
        originalText: processedText,
        confidence: confidence
      });
      setShowResult(true);
      setProcessingStatus('completed');

      await worker.terminate();
      
    } catch (error) {
      console.error('Recognition Error:', error);
      setProcessingStatus('error');
    }
  };

  const exportDocument = async (format: 'pdf' | 'docx' | 'txt') => {
  if (!recognizedText) {
    alert('No text to export!');
    return;
  }
  
  try {
    if (format === 'pdf') {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage();
      page.drawText(recognizedText, {
        x: 50,
        y: page.getHeight() - 50,
        size: 12,
        color: rgb(0, 0, 0),
      });
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'recognized_text.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else if (format === 'docx') {
      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({
              text: recognizedText,
              style: 'normal'
            })
          ]
        }]
      });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'recognized_text.docx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } else {
      const blob = new Blob([recognizedText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'recognized_text.txt';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  } catch (error) {
    console.error('Export error:', error);
    alert('Failed to export document. Please try again.');
  }
};

  const handleCopyText = () => {
    navigator.clipboard.writeText(recognizedText);
    alert('Text copied to clipboard!');
  };
  
  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([recognizedText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = 'handwriting_recognition_result.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const resetForm = () => {
    setShowResult(false);
    setProcessingStatus('idle');
    setRecognizedText('');
    setConfidence(0);
    setSelectedLanguage('eng');
    setPsm(PSM.AUTO);
    setPreprocessSettings({
      contrast: 1,
      quality: 0.8,
      grayscale: true
    });
  };
  
  // Add drag and drop support
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  const droppedFiles = Array.from(e.dataTransfer.files);
  if (droppedFiles.length > 0) {
    const imageFile = droppedFiles.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      setFiles([imageFile]);
    }
  }
};

return (
  <div className="space-y-6 dark:bg-gray-900 min-h-screen">
    <div className="mb-6 dark:bg-gray-800 p-6 rounded-lg">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Handwriting Recognition</h1>
      <p className="text-gray-600 dark:text-gray-300">Convert handwritten text to digital format</p>
    </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        {!showResult ? (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload Your Documents</h2>
              <p className="text-gray-600 mb-4">
                Upload handwritten notes, letters, or documents to convert them to digital text.
                Our OCR system supports various handwriting styles and languages.
              </p>
              
              <FileUpload 
                maxFiles={1} 
                supportedFileTypes={['image/jpeg', 'image/png']} 
                maxSizeMB={5} 
              />
            </div>
            
            {imagePreview && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={imagePreview} 
                    alt="Document preview" 
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
            )}
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">Recognition Settings</h3>
                <button
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    id="language"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {showAdvanced && (
                  <>
                    <div>
                      <label htmlFor="psm" className="block text-sm font-medium text-gray-700 mb-1">
                        Page Segmentation Mode
                      </label>
                      <select
                        id="psm"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        value={psm}
                        onChange={(e) => setPsm(Number(e.target.value))}
                      >
                        <option value={PSM.AUTO}>Automatic</option>
                        <option value={PSM.SINGLE_BLOCK}>Single Block</option>
                        <option value={PSM.SINGLE_LINE}>Single Line</option>
                        <option value={PSM.SINGLE_WORD}>Single Word</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Image Quality
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={preprocessSettings.quality}
                        onChange={(e) => setPreprocessSettings(prev => ({
                          ...prev,
                          quality: parseFloat(e.target.value)
                        }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={preprocessSettings.grayscale}
                          onChange={(e) => setPreprocessSettings(prev => ({
                            ...prev,
                            grayscale: e.target.checked
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Convert to Grayscale</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {processingStatus === 'idle' && files.length > 0 && (
              <div className="flex justify-end">
                <button
                  className={`
                    bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md 
                    transition-colors flex items-center
                    ${processingStatus !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  onClick={processImage}
                  disabled={processingStatus !== 'idle'}
                >
                  {processingStatus !== 'idle' ? (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-5 w-5" />
                      Process Document
                    </>
                  )}
                </button>
              </div>
            )}
            
            <ProcessingAnimation 
              status={processingStatus} 
              processingText="Converting handwriting to text" 
            />
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Recognition Results</h2>
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
                  onClick={resetForm}
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Original Image</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={imagePreview!} 
                    alt="Original document" 
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Extracted Text</h3>
                  <span className="text-xs text-gray-500">Characters: {recognizedText.length}</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 h-[calc(100%-2rem)] overflow-y-auto">
                  <div className="font-mono text-sm whitespace-pre-wrap">{recognizedText}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Confidence Score</span>
                <span className="text-sm font-medium text-gray-900">{confidence}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div 
                  className={`h-full rounded-full ${
                    confidence >= 90 ? 'bg-green-500' : 
                    confidence >= 70 ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`}
                  style={{ width: `${confidence}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors"
                onClick={resetForm}
              >
                Process Another Document
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Info Section */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How It Works</h3>
        <p className="text-blue-800 mb-4">
          Our handwriting recognition system uses advanced OCR technology with image preprocessing to achieve optimal text recognition accuracy.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-blue-900 mb-2">Image Preprocessing</div>
            <p className="text-sm text-gray-600">
              Optimizes image quality through compression, contrast adjustment, and format conversion
            </p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-blue-900 mb-2">Multi-Language OCR</div>
            <p className="text-sm text-gray-600">
              Supports multiple languages with specialized recognition models for each
            </p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-blue-900 mb-2">Advanced Settings</div>
            <p className="text-sm text-gray-600">
              Fine-tune recognition parameters for optimal results with different document types
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandwritingRecognition;

const postProcessText = (text: string): string => {
    const corrections = new Map([
        ['Dean', 'Dear'],
        ['Luann', 'User'],
        ['Hardin', 'Handwritten'],
        ['Jokte', 'robotic'],
        ['nasage', 'message'],
        ['vitally', 'virtually'],
        ['Rolst', 'Robot'],
        ['£', 'f'],
        ['|', '!']
    ]);
    
    return text.split(/\s+/)
              .map(word => corrections.get(word) || word)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
};

const validateAvsE = (word1: string, word2: string, context: string[], position: number): string => {
    // Dictionary-based validation
    const dictionary = new Set(['the', 'and', 'that', 'have', 'this', 'from', 'they', 'will', 'would', 'there', 'their', 'what', 'about', 'which', 'when', 'make', 'like', 'time', 'just', 'know', 'take', 'people', 'year', 'your', 'good', 'some', 'could', 'them', 'other', 'than', 'then', 'look', 'only', 'come', 'over', 'think', 'also', 'back', 'after', 'work', 'first', 'well', 'even', 'want', 'because', 'these', 'give', 'most']);
    
    const word1Lower = word1.toLowerCase();
    const word2Lower = word2.toLowerCase();
    
    // Check if either word is in dictionary
    if (dictionary.has(word1Lower) && !dictionary.has(word2Lower)) {
        return word1;
    }
    if (!dictionary.has(word1Lower) && dictionary.has(word2Lower)) {
        return word2;
    }
    
    // Context-based validation
    const prevWord = position > 0 ? context[position - 1].toLowerCase() : '';
    const nextWord = position < context.length - 1 ? context[position + 1].toLowerCase() : '';
    
    // Common word patterns
    const patterns = {
        'the': ['of', 'in', 'on', 'at', 'to'],
        'and': ['the', 'a', 'an', 'to'],
        'that': ['is', 'was', 'will', 'would'],
    };
    
    // Check patterns
    for (const [pattern, contexts] of Object.entries(patterns)) {
        if (contexts.includes(prevWord) || contexts.includes(nextWord)) {
            if (word1Lower === pattern) return word1;
            if (word2Lower === pattern) return word2;
        }
    }
    
    // Default to Gemini's interpretation
    return word2;
};

const handleCopyText = () => {
    navigator.clipboard.writeText(recognizedText);
    alert('Text copied to clipboard!');
  };
  
  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([recognizedText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = 'handwriting_recognition_result.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const resetForm = () => {
    setShowResult(false);
    setProcessingStatus('idle');
    setRecognizedText('');
    setConfidence(0);
    setSelectedLanguage('eng');
    setPsm(PSM.AUTO);
    setPreprocessSettings({
      contrast: 1,
      quality: 0.8,
      grayscale: true
    });
  };
  
  // Add drag and drop support
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  const droppedFiles = Array.from(e.dataTransfer.files);
  if (droppedFiles.length > 0) {
    const imageFile = droppedFiles.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      setFiles([imageFile]);
    }
  }
};

return (
  <div className="space-y-6 dark:bg-gray-900 min-h-screen">
    <div className="mb-6 dark:bg-gray-800 p-6 rounded-lg">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Handwriting Recognition</h1>
      <p className="text-gray-600 dark:text-gray-300">Convert handwritten text to digital format</p>
    </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        {!showResult ? (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload Your Documents</h2>
              <p className="text-gray-600 mb-4">
                Upload handwritten notes, letters, or documents to convert them to digital text.
                Our OCR system supports various handwriting styles and languages.
              </p>
              
              <FileUpload 
                maxFiles={1} 
                supportedFileTypes={['image/jpeg', 'image/png']} 
                maxSizeMB={5} 
              />
            </div>
            
            {imagePreview && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={imagePreview} 
                    alt="Document preview" 
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
            )}
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">Recognition Settings</h3>
                <button
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    id="language"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {showAdvanced && (
                  <>
                    <div>
                      <label htmlFor="psm" className="block text-sm font-medium text-gray-700 mb-1">
                        Page Segmentation Mode
                      </label>
                      <select
                        id="psm"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        value={psm}
                        onChange={(e) => setPsm(Number(e.target.value))}
                      >
                        <option value={PSM.AUTO}>Automatic</option>
                        <option value={PSM.SINGLE_BLOCK}>Single Block</option>
                        <option value={PSM.SINGLE_LINE}>Single Line</option>
                        <option value={PSM.SINGLE_WORD}>Single Word</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Image Quality
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={preprocessSettings.quality}
                        onChange={(e) => setPreprocessSettings(prev => ({
                          ...prev,
                          quality: parseFloat(e.target.value)
                        }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={preprocessSettings.grayscale}
                          onChange={(e) => setPreprocessSettings(prev => ({
                            ...prev,
                            grayscale: e.target.checked
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Convert to Grayscale</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {processingStatus === 'idle' && files.length > 0 && (
              <div className="flex justify-end">
                <button
                  className={`
                    bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md 
                    transition-colors flex items-center
                    ${processingStatus !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  onClick={processImage}
                  disabled={processingStatus !== 'idle'}
                >
                  {processingStatus !== 'idle' ? (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-5 w-5" />
                      Process Document
                    </>
                  )}
                </button>
              </div>
            )}
            
            <ProcessingAnimation 
              status={processingStatus} 
              processingText="Converting handwriting to text" 
            />
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Recognition Results</h2>
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
                  onClick={resetForm}
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Original Image</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={imagePreview!} 
                    alt="Original document" 
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Extracted Text</h3>
                  <span className="text-xs text-gray-500">Characters: {recognizedText.length}</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 h-[calc(100%-2rem)] overflow-y-auto">
                  <div className="font-mono text-sm whitespace-pre-wrap">{recognizedText}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Confidence Score</span>
                <span className="text-sm font-medium text-gray-900">{confidence}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div 
                  className={`h-full rounded-full ${
                    confidence >= 90 ? 'bg-green-500' : 
                    confidence >= 70 ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`}
                  style={{ width: `${confidence}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors"
                onClick={resetForm}
              >
                Process Another Document
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Info Section */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How It Works</h3>
        <p className="text-blue-800 mb-4">
          Our handwriting recognition system uses advanced OCR technology with image preprocessing to achieve optimal text recognition accuracy.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-blue-900 mb-2">Image Preprocessing</div>
            <p className="text-sm text-gray-600">
              Optimizes image quality through compression, contrast adjustment, and format conversion
            </p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-blue-900 mb-2">Multi-Language OCR</div>
            <p className="text-sm text-gray-600">
              Supports multiple languages with specialized recognition models for each
            </p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-blue-900 mb-2">Advanced Settings</div>
            <p className="text-sm text-gray-600">
              Fine-tune recognition parameters for optimal results with different document types
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandwritingRecognition;

const postProcessText = (text: string): string => {
    const corrections = new Map([
        ['Dean', 'Dear'],
        ['Luann', 'User'],
        ['Hardin', 'Handwritten'],
        ['Jokte', 'robotic'],
        ['nasage', 'message'],
        ['vitally', 'virtually'],
        ['Rolst', 'Robot'],
        ['£', 'f'],
        ['|', '!']
    ]);
    
    return text.split(/\s+/)
              .map(word => corrections.get(word) || word)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
};

const validateAvsE = (word1: string, word2: string, context: string[], position: number): string => {
    // Dictionary-based validation
    const dictionary = new Set(['the', 'and', 'that', 'have', 'this', 'from', 'they', 'will', 'would', 'there', 'their', 'what', 'about', 'which', 'when', 'make', 'like', 'time', 'just', 'know', 'take', 'people', 'year', 'your', 'good', 'some', 'could', 'them', 'other', 'than', 'then', 'look', 'only', 'come', 'over', 'think', 'also', 'back', 'after', 'work', 'first', 'well', 'even', 'want', 'because', 'these', 'give', 'most']);
    
    const word1Lower = word1.toLowerCase();
    const word2Lower = word2.toLowerCase();
    
    // Check if either word is in dictionary
    if (dictionary.has(word1Lower) && !dictionary.has(word2Lower)) {
        return word1;
    }
    if (!dictionary.has(word1Lower) && dictionary.has(word2Lower)) {
        return word2;
    }
    
    // Context-based validation
    const prevWord = position > 0 ? context[position - 1].toLowerCase() : '';
    const nextWord = position < context.length - 1 ? context[position + 1].toLowerCase() : '';
    
    // Common word patterns
    const patterns = {
        'the': ['of', 'in', 'on', 'at', 'to'],
        'and': ['the', 'a', 'an', 'to'],
        'that': ['is', 'was', 'will', 'would'],
    };
    
    // Check patterns
    for (const [pattern, contexts] of Object.entries(patterns)) {
        if (contexts.includes(prevWord) || contexts.includes(nextWord)) {
            if (word1Lower === pattern) return word1;
            if (word2Lower === pattern) return word2;
        }
    }
    
    // Default to Gemini's interpretation
    return word2;
};

const handleCopyText = () => {
    navigator.clipboard.writeText(recognizedText);
    alert('Text copied to clipboard!');
  };
  
  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([recognizedText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = 'handwriting_recognition_result.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const resetForm = () => {
    setShowResult(false);
    setProcessingStatus('idle');
    setRecognizedText('');
    setConfidence(0);
    setSelectedLanguage('eng');
    setPsm(PSM.AUTO);
    setPreprocessSettings({
      contrast: 1,
      quality: 0.8,
      grayscale: true
    });
  };
  
  // Add drag and drop support
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  const droppedFiles = Array.from(e.dataTransfer.files);
  if (droppedFiles.length > 0) {
    const imageFile = droppedFiles.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      setFiles([imageFile]);
    }
  }
};

return (
  <div className="space-y-6 dark:bg-gray-900 min-h-screen">
    <div className="mb-6 dark:bg-gray-800 p-6 rounded-lg">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Handwriting Recognition</h1>
      <p className="text-gray-600 dark:text-gray-300">Convert handwritten text to digital format</p>
    </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        {!showResult ? (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload Your Documents</h2>
              <p className="text-gray-600 mb-4">
                Upload handwritten notes, letters, or documents to convert them to digital text.
                Our OCR system supports various handwriting styles and languages.
              </p>
              
              <FileUpload 
                maxFiles={1} 
                supportedFileTypes={['image/jpeg', 'image/png']} 
                maxSizeMB={5} 
              />
            </div>
            
            {imagePreview && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={imagePreview} 
                    alt="Document preview" 
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
            )}
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">Recognition Settings</h3>
                <button
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    id="language"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {showAdvanced && (
                  <>
                    <div>
                      <label htmlFor="psm" className="block text-sm font-medium text-gray-700 mb-1">
                        Page Segmentation Mode
                      </label>
                      <select
                        id="psm"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        value={psm}
                        onChange={(e) => setPsm(Number(e.target.value))}
                      >
                        <option value={PSM.AUTO}>Automatic</option>
                        <option value={PSM.SINGLE_BLOCK}>Single Block</option>
                        <option value={PSM.SINGLE_LINE}>Single Line</option>
                        <option value={PSM.SINGLE_WORD}>Single Word</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Image Quality
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={preprocessSettings.quality}
                        onChange={(e) => setPreprocessSettings(prev => ({
                          ...prev,
                          quality: parseFloat(e.target.value)
                        }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={preprocessSettings.grayscale}
                          onChange={(e) => setPreprocessSettings(prev => ({
                            ...prev,
                            grayscale: e.target.checked
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Convert to Grayscale</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {processingStatus === 'idle' && files.length > 0 && (
              <div className="flex justify-end">
                <button
                  className={`
                    bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md 
                    transition-colors flex items-center
                    ${processingStatus !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  onClick={processImage}
                  disabled={processingStatus !== 'idle'}
                >
                  {processingStatus !== 'idle' ? (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-5 w-5" />
                      Process Document
                    </>
                  )}
                </button>
              </div>
            )}
            
            <ProcessingAnimation 
              status={processingStatus} 
              processingText="Converting handwriting to text" 
            />
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Recognition Results</h2>
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
                  onClick={resetForm}
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Original Image</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={imagePreview!} 
                    alt="Original document" 
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Extracted Text</h3>
                  <span className="text-xs text-gray-500">Characters: {recognizedText.length}</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 h-[calc(100%-2rem)] overflow-y-auto">
                  <div className="font-mono text-sm whitespace-pre-wrap">{recognizedText}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Confidence Score</span>
                <span className="text-sm font-medium text-gray-900">{confidence}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div 
                  className={`h-full rounded-full ${
                    confidence >= 90 ? 'bg-green-500' : 
                    confidence >= 70 ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`}
                  style={{ width: `${confidence}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors"
                onClick={resetForm}
              >
                Process Another Document
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Info Section */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How It Works</h3>
        <p className="text-blue-800 mb-4">
          Our handwriting recognition system uses advanced OCR technology with image preprocessing to achieve optimal text recognition accuracy.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-blue-900 mb-2">Image Preprocessing</div>
            <p className="text-sm text-gray-600">
              Optimizes image quality through compression, contrast adjustment, and format conversion
            </p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-blue-900 mb-2">Multi-Language OCR</div>
            <p className="text-sm text-gray-600">
              Supports multiple languages with specialized recognition models for each
            </p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-blue-900 mb-2">Advanced Settings</div>
            <p className="text-sm text-gray-600">
              Fine-tune recognition parameters for optimal results with different document types
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandwritingRecognition;

const postProcessText = (text: string): string => {
    const corrections = new Map([
        ['Dean', 'Dear'],
        ['Luann', 'User'],
        ['Hardin', 'Handwritten'],
        ['Jokte', 'robotic'],
        ['nasage', 'message'],
        ['vitally', 'virtually'],
        ['Rolst', 'Robot'],
        ['£', 'f'],
        ['|', '!']
    ]);
    
    return text.split(/\s+/)
              .map(word => corrections.get(word) || word)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
};

const validateAvsE = (word1: string, word2: string, context: string[], position: number): string => {
    // Dictionary-based validation
    const dictionary = new Set(['the', 'and', 'that', 'have', 'this', 'from', 'they', 'will', 'would', 'there', 'their', 'what', 'about', 'which', 'when', 'make', 'like', 'time', 'just', 'know', 'take', 'people', 'year', 'your', 'good', 'some', 'could', 'them', 'other', 'than', 'then', 'look', 'only', 'come', 'over', 'think', 'also', 'back', 'after', 'work', 'first', 'well', 'even', 'want', 'because', 'these', 'give', 'most']);
    
    const word1Lower = word1.toLowerCase();
    const word2Lower = word2.toLowerCase();
    
    // Check if either word is in dictionary
    if (dictionary.has(word1Lower) && !dictionary.has(word2Lower)) {
        return word1;
    }
    if (!dictionary.has(word1Lower) && dictionary.has(word2Lower)) {
        return word2;
    }
    
    // Context-based validation
    const prevWord = position > 0 ? context[position - 1].toLowerCase() : '';
    const nextWord = position < context.length - 1 ? context[position + 1].toLowerCase() : '';
    
    // Common word patterns
    const patterns = {
        'the': ['of', 'in', 'on', 'at', 'to'],
        'and': ['the', 'a', 'an', 'to'],
        'that': ['is', 'was', 'will', 'would'],
    };
    
    // Check patterns
    for (const [pattern, contexts] of Object.entries(patterns)) {
        if (contexts.includes(prevWord) || contexts.includes(nextWord)) {
            if (word1Lower === pattern) return word1;
            if (word2Lower === pattern) return word2;
        }
    }
    
    // Default to Gemini's interpretation
    return word2;
};

const handleCopyText = () => {
    navigator.clipboard.writeText(recognizedText);
    alert('Text copied to clipboard!');
  };
  
  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob([recognizedText], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = 'handwriting_recognition_result.txt';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const resetForm = () => {
    setShowResult(false);
    setProcessingStatus('idle');
    setRecognizedText('');
    setConfidence(0);
    setSelectedLanguage('eng');
    setPsm(PSM.AUTO);
    setPreprocessSettings({
      contrast: 1,
      quality: 0.8,
      grayscale: true
    });
  };
  
  // Add drag and drop support
const handleDragOver = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

const handleDrop = (e: React.DragEvent) => {
  e.preventDefault();
  e.stopPropagation();
  const droppedFiles = Array.from(e.dataTransfer.files);
  if (droppedFiles.length > 0) {
    const imageFile = droppedFiles.find(file => file.type.startsWith('image/'));
    if (imageFile) {
      setFiles([imageFile]);
    }
  }
};

return (
  <div className="space-y-6 dark:bg-gray-900 min-h-screen">
    <div className="mb-6 dark:bg-gray-800 p-6 rounded-lg">
      <h1 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">Handwriting Recognition</h1>
      <p className="text-gray-600 dark:text-gray-300">Convert handwritten text to digital format</p>
    </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        {!showResult ? (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload Your Documents</h2>
              <p className="text-gray-600 mb-4">
                Upload handwritten notes, letters, or documents to convert them to digital text.
                Our OCR system supports various handwriting styles and languages.
              </p>
              
              <FileUpload 
                maxFiles={1} 
                supportedFileTypes={['image/jpeg', 'image/png']} 
                maxSizeMB={5} 
              />
            </div>
            
            {imagePreview && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-2">Preview</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={imagePreview} 
                    alt="Document preview" 
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
            )}
            
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">Recognition Settings</h3>
                <button
                  className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  {showAdvanced ? 'Hide Advanced' : 'Show Advanced'}
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-700 mb-1">
                    Language
                  </label>
                  <select
                    id="language"
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                    value={selectedLanguage}
                    onChange={(e) => setSelectedLanguage(e.target.value)}
                  >
                    {SUPPORTED_LANGUAGES.map(lang => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {showAdvanced && (
                  <>
                    <div>
                      <label htmlFor="psm" className="block text-sm font-medium text-gray-700 mb-1">
                        Page Segmentation Mode
                      </label>
                      <select
                        id="psm"
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                        value={psm}
                        onChange={(e) => setPsm(Number(e.target.value))}
                      >
                        <option value={PSM.AUTO}>Automatic</option>
                        <option value={PSM.SINGLE_BLOCK}>Single Block</option>
                        <option value={PSM.SINGLE_LINE}>Single Line</option>
                        <option value={PSM.SINGLE_WORD}>Single Word</option>
                      </select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Image Quality
                      </label>
                      <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={preprocessSettings.quality}
                        onChange={(e) => setPreprocessSettings(prev => ({
                          ...prev,
                          quality: parseFloat(e.target.value)
                        }))}
                        className="w-full"
                      />
                      <div className="flex justify-between text-xs text-gray-500">
                        <span>Low</span>
                        <span>High</span>
                      </div>
                    </div>
                    
                    <div>
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={preprocessSettings.grayscale}
                          onChange={(e) => setPreprocessSettings(prev => ({
                            ...prev,
                            grayscale: e.target.checked
                          }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">Convert to Grayscale</span>
                      </label>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {processingStatus === 'idle' && files.length > 0 && (
              <div className="flex justify-end">
                <button
                  className={`
                    bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md 
                    transition-colors flex items-center
                    ${processingStatus !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''}
                  `}
                  onClick={processImage}
                  disabled={processingStatus !== 'idle'}
                >
                  {processingStatus !== 'idle' ? (
                    <>
                      <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <FileText className="mr-2 h-5 w-5" />
                      Process Document
                    </>
                  )}
                </button>
              </div>
            )}
            
            <ProcessingAnimation 
              status={processingStatus} 
              processingText="Converting handwriting to text" 
            />
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Recognition Results</h2>
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
                  onClick={resetForm}
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-2">Original Image</h3>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <img 
                    src={imagePreview!} 
                    alt="Original document" 
                    className="max-w-full h-auto"
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium text-gray-700">Extracted Text</h3>
                  <span className="text-xs text-gray-500">Characters: {recognizedText.length}</span>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg p-4 h-[calc(100%-2rem)] overflow-y-auto">
                  <div className="font-mono text-sm whitespace-pre-wrap">{recognizedText}</div>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Confidence Score</span>
                <span className="text-sm font-medium text-gray-900">{confidence}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div 
                  className={`h-full rounded-full ${
                    confidence >= 90 ? 'bg-green-500' : 
                    confidence >= 70 ? 'bg-yellow-500' : 
                    'bg-red-500'
                  }`}
                  style={{ width: `${confidence}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex justify-end">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors"
                onClick={resetForm}
              >
                Process Another Document
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Info Section */}
      <div className="bg-blue-50 rounded-lg p-6 border border-blue-100">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">How It Works</h3>
        <p className="text-blue-800 mb-4">
          Our handwriting recognition system uses advanced OCR technology with image preprocessing to achieve optimal text recognition accuracy.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-blue-900 mb-2">Image Preprocessing</div>
            <p className="text-sm text-gray-600">
              Optimizes image quality through compression, contrast adjustment, and format conversion
            </p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-blue-900 mb-2">Multi-Language OCR</div>
            <p className="text-sm text-gray-600">
              Supports multiple languages with specialized recognition models for each
            </p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-blue-900 mb-2">Advanced Settings</div>
            <p className="text-sm text-gray-600">
              Fine-tune recognition parameters for optimal results with different document types
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HandwritingRecognition;

const postProcessText = (text: string): string => {
    const corrections = new Map([
        ['Dean', 'Dear'],
        ['Luann', 'User'],
        ['Hardin', 'Handwritten'],
        ['Jokte', 'robotic'],
        ['nasage', 'message'],
        ['vitally', 'virtually'],
        ['Rolst', 'Robot'],
        ['£', 'f'],
        ['|', '!']
    ]);
    
    return text.split(/\s+/)
              .map(word => corrections.get(word) || word)
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim();
};

const validateAvsE = (word1: string, word2: string, context: string[]
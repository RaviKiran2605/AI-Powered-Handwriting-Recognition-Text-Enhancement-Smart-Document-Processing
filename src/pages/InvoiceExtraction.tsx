import { useState } from 'react';
import { FileCheck, Download, Table, FileJson, RefreshCw } from 'lucide-react';
import FileUpload from '../components/shared/FileUpload';
import ProcessingAnimation from '../components/shared/ProcessingAnimation';
import { useUpload } from '../context/UploadContext';

// Mock extracted invoice data
const mockInvoiceData = {
  "invoice_number": "INV-2025-0472",
  "date": "2025-04-15",
  "due_date": "2025-05-15",
  "vendor": {
    "name": "TechSupplies Inc.",
    "address": "123 Business Ave, Suite 200, San Francisco, CA 94107",
    "phone": "(415) 555-7890",
    "email": "billing@techsupplies.example.com"
  },
  "customer": {
    "name": "Acme Corporation",
    "address": "456 Enterprise St, New York, NY 10001",
    "phone": "(212) 555-1234",
    "email": "accounts@acme.example.com"
  },
  "items": [
    {
      "description": "Premium Laptop Pro X5",
      "quantity": 3,
      "unit_price": 1299.99,
      "total": 3899.97
    },
    {
      "description": "27\" 4K Monitor",
      "quantity": 6,
      "unit_price": 499.95,
      "total": 2999.70
    },
    {
      "description": "Wireless Keyboard & Mouse Combo",
      "quantity": 10,
      "unit_price": 89.99,
      "total": 899.90
    },
    {
      "description": "Extended Warranty - 3 Years",
      "quantity": 3,
      "unit_price": 199.99,
      "total": 599.97
    }
  ],
  "subtotal": 8399.54,
  "tax": 755.96,
  "shipping": 125.00,
  "total": 9280.50,
  "payment_terms": "Net 30",
  "notes": "All items include manufacturer warranty. Please refer to our return policy for details."
};

const InvoiceExtraction = () => {
  const { 
    files, 
    processingStatus, 
    setProcessingStatus, 
    setProcessedResults 
  } = useUpload();
  
  const [showResult, setShowResult] = useState(false);
  const [activeView, setActiveView] = useState('table'); // 'table' or 'json'
  
  const handleProcess = () => {
    if (files.length === 0) {
      alert('Please upload at least one file to process');
      return;
    }
    
    // Simulate processing
    setProcessingStatus('uploading');
    
    setTimeout(() => {
      setProcessingStatus('processing');
      
      setTimeout(() => {
        setProcessingStatus('completed');
        setProcessedResults(mockInvoiceData);
        setShowResult(true);
      }, 2500);
    }, 1500);
  };
  
  const handleDownloadJSON = () => {
    const element = document.createElement('a');
    const file = new Blob([JSON.stringify(mockInvoiceData, null, 2)], {type: 'application/json'});
    element.href = URL.createObjectURL(file);
    element.download = 'invoice_data.json';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  const handleDownloadCSV = () => {
    // Simple CSV conversion for the items
    const headers = ['Description', 'Quantity', 'Unit Price', 'Total'];
    const itemRows = mockInvoiceData.items.map(item => 
      `"${item.description}",${item.quantity},${item.unit_price},${item.total}`
    );
    
    const summaryRows = [
      `"Subtotal",,,"${mockInvoiceData.subtotal}"`,
      `"Tax",,,"${mockInvoiceData.tax}"`,
      `"Shipping",,,"${mockInvoiceData.shipping}"`,
      `"Total",,,"${mockInvoiceData.total}"`
    ];
    
    const csvContent = [
      headers.join(','),
      ...itemRows,
      '',
      ...summaryRows
    ].join('\n');
    
    const element = document.createElement('a');
    const file = new Blob([csvContent], {type: 'text/csv'});
    element.href = URL.createObjectURL(file);
    element.download = 'invoice_data.csv';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Invoice Extraction</h1>
        <p className="text-gray-600">Extract structured data from invoices and receipts</p>
      </div>
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
        {!showResult ? (
          <>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Upload Your Invoice</h2>
              <p className="text-gray-600 mb-4">
                Upload invoices or receipts to extract important information into a structured format.
                Our AI model supports various invoice layouts and templates.
              </p>
              
              <FileUpload 
                maxFiles={1} 
                supportedFileTypes={['image/jpeg', 'image/png', 'application/pdf']} 
                maxSizeMB={5} 
              />
            </div>
            
            {processingStatus === 'idle' && files.length > 0 && (
              <div className="flex justify-end">
                <button
                  className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors flex items-center"
                  onClick={handleProcess}
                >
                  <FileCheck className="mr-2 h-5 w-5" />
                  Extract Data
                </button>
              </div>
            )}
            
            <ProcessingAnimation 
              status={processingStatus} 
              processingText="Extracting invoice data" 
            />
          </>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold text-gray-900">Extraction Results</h2>
              <div className="flex space-x-2">
                <button
                  className={`p-2 rounded-md transition-colors ${
                    activeView === 'table' 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveView('table')}
                >
                  <Table className="h-5 w-5" />
                </button>
                <button
                  className={`p-2 rounded-md transition-colors ${
                    activeView === 'json' 
                      ? 'bg-gray-100 text-gray-900' 
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                  onClick={() => setActiveView('json')}
                >
                  <FileJson className="h-5 w-5" />
                </button>
                <button
                  className="text-gray-700 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100 transition-colors"
                  onClick={activeView === 'json' ? handleDownloadJSON : handleDownloadCSV}
                >
                  <Download className="h-5 w-5" />
                </button>
                <button
                  className="text-gray-700 hover:text-gray-900 p-2 rounded-md hover:bg-gray-100 transition-colors"
                  onClick={() => {
                    setShowResult(false);
                    setProcessingStatus('idle');
                  }}
                >
                  <RefreshCw className="h-5 w-5" />
                </button>
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-md overflow-hidden">
              {activeView === 'table' ? (
                <div className="overflow-x-auto">
                  <div className="bg-gray-50 border-b border-gray-200 p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Invoice Information</h3>
                        <table className="min-w-full text-sm">
                          <tbody>
                            <tr>
                              <td className="pr-4 py-1 text-gray-500">Invoice Number:</td>
                              <td className="py-1 font-medium">{mockInvoiceData.invoice_number}</td>
                            </tr>
                            <tr>
                              <td className="pr-4 py-1 text-gray-500">Date:</td>
                              <td className="py-1">{mockInvoiceData.date}</td>
                            </tr>
                            <tr>
                              <td className="pr-4 py-1 text-gray-500">Due Date:</td>
                              <td className="py-1">{mockInvoiceData.due_date}</td>
                            </tr>
                            <tr>
                              <td className="pr-4 py-1 text-gray-500">Payment Terms:</td>
                              <td className="py-1">{mockInvoiceData.payment_terms}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-gray-700 mb-2">Vendor/Customer</h3>
                        <table className="min-w-full text-sm">
                          <tbody>
                            <tr>
                              <td className="pr-4 py-1 text-gray-500">Vendor:</td>
                              <td className="py-1">{mockInvoiceData.vendor.name}</td>
                            </tr>
                            <tr>
                              <td className="pr-4 py-1 text-gray-500">Customer:</td>
                              <td className="py-1">{mockInvoiceData.customer.name}</td>
                            </tr>
                            <tr>
                              <td className="pr-4 py-1 text-gray-500">Customer Address:</td>
                              <td className="py-1">{mockInvoiceData.customer.address}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Unit Price
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {mockInvoiceData.items.map((item, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.description}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            {item.quantity}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            ${item.unit_price.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                            ${item.total.toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                          Subtotal
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                          ${mockInvoiceData.subtotal.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                          Tax
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                          ${mockInvoiceData.tax.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-500">
                          Shipping
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                          ${mockInvoiceData.shipping.toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                          Total
                        </td>
                        <td className="px-6 py-3 text-right text-sm font-bold text-gray-900">
                          ${mockInvoiceData.total.toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                  
                  {mockInvoiceData.notes && (
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                      <p className="text-sm text-gray-600">
                        <span className="font-medium text-gray-700">Notes: </span>
                        {mockInvoiceData.notes}
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 bg-gray-50 h-96 overflow-y-auto font-mono text-sm whitespace-pre">
                  {JSON.stringify(mockInvoiceData, null, 2)}
                </div>
              )}
            </div>
            
            <div className="flex justify-end">
              <button
                className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-6 rounded-md transition-colors"
                onClick={() => {
                  setShowResult(false);
                  setProcessingStatus('idle');
                }}
              >
                Process Another Invoice
              </button>
            </div>
          </div>
        )}
      </div>
      
      {/* Info Section */}
      <div className="bg-teal-50 rounded-lg p-6 border border-teal-100">
        <h3 className="text-lg font-semibold text-teal-900 mb-3">How It Works</h3>
        <p className="text-teal-800 mb-4">
          Our invoice extraction system identifies and extracts key information from invoices and receipts, converting them into structured data formats for easy processing.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-teal-900 mb-2">Document Analysis</div>
            <p className="text-sm text-gray-600">
              AI analyzes document layout to identify invoice fields regardless of template format
            </p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-teal-900 mb-2">Field Extraction</div>
            <p className="text-sm text-gray-600">
              Important data like invoice numbers, line items, amounts, and dates are precisely extracted
            </p>
          </div>
          <div className="bg-white p-4 rounded-md shadow-sm">
            <div className="font-semibold text-teal-900 mb-2">Data Validation</div>
            <p className="text-sm text-gray-600">
              Extracted data is verified for accuracy and formatted for export to various systems
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvoiceExtraction;
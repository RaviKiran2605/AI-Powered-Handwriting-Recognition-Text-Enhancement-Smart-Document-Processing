import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, FileDigit, FileCheck, ChevronRight, PieChart, BarChart } from 'lucide-react';

interface ProcessingStatistics {
  handwriting: number;
  summarization: number;
  invoice: number;
  encrypted: number;
}

const Dashboard = () => {
  const [statistics, setStatistics] = useState<ProcessingStatistics>({
    handwriting: 0,
    summarization: 0,
    invoice: 0,
    encrypted: 0
  });
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Simulate loading statistics
  useEffect(() => {
    const timer = setTimeout(() => {
      // Mock statistics data
      setStatistics({
        handwriting: 143,
        summarization: 87,
        invoice: 62,
        encrypted: 292
      });
      setIsLoading(false);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, []);
  
  const features = [
    {
      title: 'Handwriting Recognition',
      description: 'Convert handwritten documents to digital text',
      icon: FileText,
      color: 'bg-blue-100 text-blue-600',
      path: '/handwriting'
    },
    {
      title: 'Document Summarization',
      description: 'Get concise summaries of long documents',
      icon: FileDigit,
      color: 'bg-purple-100 text-purple-600',
      path: '/summarize'
    },
    {
      title: 'Invoice Extraction',
      description: 'Extract structured data from invoices and receipts',
      icon: FileCheck,
      color: 'bg-teal-100 text-teal-600',
      path: '/invoice'
    }
  ];
  
  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Welcome to DocuAI, your advanced document processing solution</p>
      </div>
      
      {/* Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array(4).fill(0).map((_, index) => (
            <div key={index} className="bg-white p-4 rounded-lg shadow-sm animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))
        ) : (
          <>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-600">Handwriting Conversions</p>
              <p className="text-2xl font-bold mt-1">{statistics.handwriting}</p>
              <div className="mt-2 h-1 w-full bg-blue-100 rounded-full">
                <div className="h-1 bg-blue-600 rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-600">Documents Summarized</p>
              <p className="text-2xl font-bold mt-1">{statistics.summarization}</p>
              <div className="mt-2 h-1 w-full bg-purple-100 rounded-full">
                <div className="h-1 bg-purple-600 rounded-full" style={{ width: '40%' }}></div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-600">Invoices Processed</p>
              <p className="text-2xl font-bold mt-1">{statistics.invoice}</p>
              <div className="mt-2 h-1 w-full bg-teal-100 rounded-full">
                <div className="h-1 bg-teal-600 rounded-full" style={{ width: '30%' }}></div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
              <p className="text-sm font-medium text-gray-600">Encrypted Documents</p>
              <p className="text-2xl font-bold mt-1">{statistics.encrypted}</p>
              <div className="mt-2 h-1 w-full bg-green-100 rounded-full">
                <div className="h-1 bg-green-600 rounded-full" style={{ width: '80%' }}></div>
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          return (
            <Link
              key={index}
              to={feature.path}
              className="group bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className={`w-12 h-12 ${feature.color} rounded-lg flex items-center justify-center mb-4`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600 mb-4">{feature.description}</p>
              <div className="flex items-center text-blue-600 font-medium">
                <span>Get started</span>
                <ChevronRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
      
      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Processing Activity</h3>
            <div className="flex space-x-2">
              <button className="px-3 py-1 text-xs bg-blue-50 text-blue-600 rounded-full">Week</button>
              <button className="px-3 py-1 text-xs text-gray-600 rounded-full">Month</button>
              <button className="px-3 py-1 text-xs text-gray-600 rounded-full">Year</button>
            </div>
          </div>
          <div className="flex items-center justify-center h-64">
            <BarChart className="w-16 h-16 text-gray-300" />
            <p className="text-gray-500 ml-3">Chart visualization (mock)</p>
          </div>
        </div>
        
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Document Types</h3>
            <button className="text-blue-600 text-sm font-medium">View All</button>
          </div>
          <div className="flex items-center justify-center h-64">
            <PieChart className="w-16 h-16 text-gray-300" />
            <p className="text-gray-500 ml-3">Chart visualization (mock)</p>
          </div>
        </div>
      </div>
      
      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Recent Activity</h3>
          <button className="text-blue-600 text-sm font-medium">View All</button>
        </div>
        <div className="divide-y divide-gray-100">
          {isLoading ? (
            Array(3).fill(0).map((_, index) => (
              <div key={index} className="p-4 animate-pulse flex">
                <div className="w-10 h-10 bg-gray-200 rounded-full mr-3"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))
          ) : (
            <>
              <div className="p-4 flex items-start">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Handwriting recognition completed</p>
                  <p className="text-xs text-gray-500 mt-1">2 minutes ago</p>
                </div>
              </div>
              <div className="p-4 flex items-start">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                  <FileDigit className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Document summarization completed</p>
                  <p className="text-xs text-gray-500 mt-1">1 hour ago</p>
                </div>
              </div>
              <div className="p-4 flex items-start">
                <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center mr-3">
                  <FileCheck className="h-5 w-5 text-teal-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Invoice data extraction completed</p>
                  <p className="text-xs text-gray-500 mt-1">3 hours ago</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
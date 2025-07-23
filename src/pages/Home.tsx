import React from 'react';
import { Link } from 'react-router-dom';
import { FileText, Upload, Zap } from 'lucide-react';

const Home = () => {
  return (
    <div className="max-w-7xl mx-auto">
      <div className="text-center py-16">
        <h1 className="text-5xl font-extrabold text-gray-900 dark:text-white mb-4 tracking-tight drop-shadow-lg">
          Welcome to <span className="text-indigo-600 dark:text-indigo-400">DocuAI</span>
        </h1>
        <p className="text-2xl text-gray-600 dark:text-gray-300 mb-10">
          Process your documents with AI-powered precision
        </p>
        <Link
          to="/process"
          className="inline-flex items-center px-8 py-4 border border-transparent text-lg font-semibold rounded-xl shadow-lg text-white bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 transition-colors duration-200"
        >
          <Upload className="mr-3 h-6 w-6" />
          Start Processing
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl border border-gray-100 dark:border-gray-700 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center mb-4">
            <div className="p-4 bg-indigo-100 dark:bg-indigo-900 rounded-full group-hover:scale-110 transition-transform">
              <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-300" />
            </div>
            <h3 className="ml-5 text-2xl font-bold text-gray-900 dark:text-white">Document Processing</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Upload and process your documents with our advanced AI technology.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl border border-gray-100 dark:border-gray-700 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center mb-4">
            <div className="p-4 bg-indigo-100 dark:bg-indigo-900 rounded-full group-hover:scale-110 transition-transform">
              <Zap className="h-8 w-8 text-indigo-600 dark:text-indigo-300" />
            </div>
            <h3 className="ml-5 text-2xl font-bold text-gray-900 dark:text-white">Fast & Accurate</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Get quick and accurate results with our state-of-the-art processing.
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl hover:shadow-2xl border border-gray-100 dark:border-gray-700 transition-all duration-300 group cursor-pointer">
          <div className="flex items-center mb-4">
            <div className="p-4 bg-indigo-100 dark:bg-indigo-900 rounded-full group-hover:scale-110 transition-transform">
              <FileText className="h-8 w-8 text-indigo-600 dark:text-indigo-300" />
            </div>
            <h3 className="ml-5 text-2xl font-bold text-gray-900 dark:text-white">History Tracking</h3>
          </div>
          <p className="text-gray-600 dark:text-gray-300 text-lg">
            Keep track of all your processed documents in one place.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Home; 
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from './context/ThemeContext';
import { DocumentProvider } from './context/DocumentContext';
import Navbar from './components/Navbar';
import './index.css';

// Pages
import Home from './pages/Home';
import DocumentProcessor from './pages/DocumentProcessor';
import History from './pages/History';
import Settings from './pages/Settings';

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <DocumentProvider>
      <Router>
          <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 transition-colors duration-500">
          <Navbar />
            <main className="flex-1 container mx-auto px-4 py-8 flex flex-col items-center justify-center">
              <div className="w-full max-w-5xl">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/process" element={<DocumentProcessor />} />
              <Route path="/history" element={<History />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
              </div>
          </main>
          <Toaster 
            position="top-right" 
            toastOptions={{
              style: {
                background: 'var(--toaster-bg)',
                color: 'var(--toaster-color)',
              },
              duration: 4000,
            }}
          />
        </div>
      </Router>
      </DocumentProvider>
    </ThemeProvider>
  );
};

export default App;
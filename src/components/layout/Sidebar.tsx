import { FileText, FileDigit, FileCheck, Settings, X, Home } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar = ({ isOpen, onClose }: SidebarProps) => {
  const location = useLocation();
  
  const navigationItems = [
    { name: 'Dashboard', path: '/', icon: Home },
    { name: 'Handwriting Recognition', path: '/handwriting', icon: FileText },
    { name: 'Document Summarization', path: '/summarize', icon: FileDigit },
    { name: 'Invoice Extraction', path: '/invoice', icon: FileCheck },
    { name: 'Settings', path: '/settings', icon: Settings }
  ];
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className={`
      fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform 
      ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      md:relative md:translate-x-0 transition-transform duration-300 ease-in-out
    `}>
      <div className="h-16 flex items-center justify-between px-4 md:hidden">
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-900 rounded-md">
            <div className="text-white font-bold text-lg">D</div>
          </div>
          <span className="text-xl font-bold">DocuAI</span>
        </div>
        <button className="p-1.5" onClick={onClose}>
          <X className="h-5 w-5" />
        </button>
      </div>
      
      <nav className="px-2 py-4">
        <ul className="space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            return (
              <li key={item.path}>
                <Link
                  to={item.path}
                  className={`
                    flex items-center px-3 py-2 rounded-md transition-colors
                    ${isActive(item.path) 
                      ? 'bg-blue-100 text-blue-900' 
                      : 'text-gray-700 hover:bg-gray-100'}
                  `}
                  onClick={onClose}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  <span>{item.name}</span>
                  {isActive(item.path) && (
                    <span className="ml-auto w-1.5 h-5 bg-blue-900 rounded-full"></span>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="bg-blue-50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-blue-900">Documents Processed</h4>
          <div className="mt-1 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Today</span>
              <span className="text-xs font-medium text-gray-800">12</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">This month</span>
              <span className="text-xs font-medium text-gray-800">143</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
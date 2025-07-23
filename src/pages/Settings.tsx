import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, X, RefreshCw, Lock, Eye, EyeOff, Shield, FileText, Edit2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';
import { useDocuments } from '../context/DocumentContext';
import { getPasswordConfig, updatePassword, togglePasswordRequirement, updateDocumentPassword, getDocumentPassword } from '../utils/passwordManager';
import { ProcessedDocument } from '../utils/storage';

const defaultSettings = {
  language: 'eng',
  autoSave: true,
  darkMode: false,
  notifications: true,
  fontSize: 'medium',
  motto: '',
  accentColor: '#6366f1', // indigo-500
};

const fontSizes = [
  { value: 'small', label: 'Small' },
  { value: 'medium', label: 'Medium' },
  { value: 'large', label: 'Large' },
];

const Settings = () => {
  const { documents, updateDocument, refreshDocuments } = useDocuments();
  const [settings, setSettings] = useState({ ...defaultSettings });
  const { isDarkMode, toggleDarkMode } = useTheme();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordRequired, setIsPasswordRequired] = useState(true);
  const [selectedDocument, setSelectedDocument] = useState<ProcessedDocument | null>(null);
  const [documentPassword, setDocumentPassword] = useState('');
  const [showDocumentPassword, setShowDocumentPassword] = useState(false);
  const [editingDocumentName, setEditingDocumentName] = useState<string | null>(null);
  const [newDocumentName, setNewDocumentName] = useState('');

  // Load settings from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('settings');
    if (saved) {
      const parsed = JSON.parse(saved);
      setSettings({ ...defaultSettings, ...parsed });
    }
  }, []);

  // Sync ThemeContext with settings.darkMode on mount
  useEffect(() => {
    if (settings.darkMode !== isDarkMode) {
      toggleDarkMode();
    }
    // eslint-disable-next-line
  }, []);

  // Save settings to localStorage on change
  useEffect(() => {
    localStorage.setItem('settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const config = getPasswordConfig();
    setIsPasswordRequired(config.documentAccess.requirePassword);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    let newValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;

    // If darkMode is toggled, update ThemeContext
    if (name === 'darkMode' && newValue !== isDarkMode) {
      toggleDarkMode();
    }

    setSettings((prev) => ({
      ...prev,
      [name]: newValue,
    }));
  };

  const handleFontSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSettings((prev) => ({ ...prev, fontSize: e.target.value }));
  };

  const handleAccentColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings((prev) => ({ ...prev, accentColor: e.target.value }));
  };

  const handleSave = () => {
    localStorage.setItem('settings', JSON.stringify(settings));
    toast.success('Settings saved successfully');
  };

  const handleReset = () => {
    setSettings({ ...defaultSettings });
    if (isDarkMode !== defaultSettings.darkMode) {
      toggleDarkMode();
    }
    toast.success('Settings reset to default');
  };

  const handlePasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (currentPassword !== getPasswordConfig().documentAccess.defaultPassword) {
      toast.error('Current password is incorrect');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    updatePassword(newPassword);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Password updated successfully');
  };

  const handleTogglePasswordRequirement = () => {
    togglePasswordRequirement();
    setIsPasswordRequired(!isPasswordRequired);
    toast.success(`Password requirement ${!isPasswordRequired ? 'enabled' : 'disabled'}`);
  };

  const handleDocumentPasswordChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocument) return;

    if (documentPassword.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    updateDocumentPassword(selectedDocument.id, documentPassword);
    setDocumentPassword('');
    setSelectedDocument(null);
    toast.success('Document password updated successfully');
  };

  const handleDocumentNameChange = (doc: ProcessedDocument) => {
    setEditingDocumentName(doc.id);
    setNewDocumentName(doc.name);
  };

  const handleDocumentNameSave = (doc: ProcessedDocument) => {
    if (newDocumentName.trim() === '') {
      toast.error('Document name cannot be empty');
      return;
    }

    const updatedDoc = { ...doc, name: newDocumentName.trim() };
    updateDocument(updatedDoc);
    setEditingDocumentName(null);
    setNewDocumentName('');
    toast.success('Document name updated successfully');
  };

  // Theme preview logic
  const themePreviewClass = settings.darkMode ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-900';
  const fontSizeClass = settings.fontSize === 'small' ? 'text-sm' : settings.fontSize === 'large' ? 'text-lg' : 'text-base';

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-blue-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 py-10 px-2">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700">
          <div className="flex items-center mb-6">
            <SettingsIcon className="h-7 w-7 text-indigo-500 dark:text-indigo-400 mr-3" />
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Settings</h2>
          </div>

          {/* Document Settings Section */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Document Settings</h3>
            <div className="space-y-4">
              {documents.map((doc) => (
                <div key={doc.id} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-blue-500 mr-2" />
                      {editingDocumentName === doc.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={newDocumentName}
                            onChange={(e) => setNewDocumentName(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleDocumentNameSave(doc)}
                            className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                            autoFocus
                          />
                          <button
                            onClick={() => handleDocumentNameSave(doc)}
                            className="text-green-500 hover:text-green-600"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingDocumentName(null)}
                            className="text-red-500 hover:text-red-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className="text-gray-900 dark:text-white">{doc.name}</span>
                          <button
                            onClick={() => handleDocumentNameChange(doc)}
                            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedDocument(doc);
                        setDocumentPassword(getDocumentPassword(doc.id) || '');
                      }}
                      className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Set Password
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Document Password Modal */}
          {selectedDocument && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    Set Password for {selectedDocument.name}
                  </h3>
                  <button
                    onClick={() => {
                      setSelectedDocument(null);
                      setDocumentPassword('');
                    }}
                    className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>
                <form onSubmit={handleDocumentPasswordChange} className="space-y-4">
                  <div>
                    <label htmlFor="documentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Document Password
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Lock className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type={showDocumentPassword ? 'text' : 'password'}
                        id="documentPassword"
                        value={documentPassword}
                        onChange={(e) => setDocumentPassword(e.target.value)}
                        className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-md leading-5 bg-white dark:bg-gray-700 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                        placeholder="Enter document password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowDocumentPassword(!showDocumentPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showDocumentPassword ? (
                          <EyeOff className="h-5 w-5 text-gray-400" />
                        ) : (
                          <Eye className="h-5 w-5 text-gray-400" />
                        )}
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDocument(null);
                        setDocumentPassword('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-md"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Save Password
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Motto Input */}
          <div className="mb-8">
            <label htmlFor="motto" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              Personal Motto
            </label>
            <input
              id="motto"
              name="motto"
              type="text"
              value={settings.motto}
              onChange={handleChange}
              placeholder="e.g. 'Stay curious!'"
              className="mt-1 block w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-base px-4 py-2 transition-all"
              maxLength={60}
            />
            <div className="text-xs text-gray-400 mt-1">This will be shown in your theme preview.</div>
          </div>

          {/* Accent Color Picker */}
          <div className="mb-8">
            <label htmlFor="accentColor" className="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-1">
              Accent Color
            </label>
            <div className="flex items-center space-x-3">
              <input
                id="accentColor"
                name="accentColor"
                type="color"
                value={settings.accentColor}
                onChange={handleAccentColorChange}
                className="w-10 h-10 p-0 border-0 bg-transparent cursor-pointer rounded-full shadow"
                style={{ verticalAlign: 'middle' }}
              />
              <span className="text-sm font-mono" style={{ color: settings.accentColor }}>{settings.accentColor}</span>
            </div>
          </div>

          {/* Theme Preview */}
          <div className="mb-10">
            <div className="font-semibold text-gray-900 dark:text-gray-200 mb-2">Theme Preview</div>
            <div
              className={`rounded-xl p-6 ${themePreviewClass} ${fontSizeClass} border-2 border-dashed transition-all duration-300 shadow-inner`}
              style={{ borderColor: settings.accentColor, boxShadow: `0 2px 16px 0 ${settings.accentColor}22` }}
            >
              <div>This is a live preview of your theme and font size.</div>
              {settings.motto && (
                <div className="mt-2 italic font-medium" style={{ color: settings.accentColor }}>
                  {settings.motto}
                </div>
              )}
            </div>
          </div>

          <hr className="my-8 border-gray-200 dark:border-gray-700" />

          {/* Settings Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
            <div className="space-y-6">
              <div>
                <label htmlFor="language" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  OCR Language
                </label>
                <select
                  id="language"
                  name="language"
                  value={settings.language}
                  onChange={handleChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg shadow-sm"
                >
                  <option value="eng">English</option>
                  <option value="fra">French</option>
                  <option value="deu">German</option>
                  <option value="spa">Spanish</option>
                </select>
              </div>
              <div>
                <label htmlFor="fontSize" className="block text-sm font-semibold text-gray-700 dark:text-gray-200">
                  Font Size
                </label>
                <select
                  id="fontSize"
                  name="fontSize"
                  value={settings.fontSize}
                  onChange={handleFontSizeChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-lg shadow-sm"
                >
                  {fontSizes.map((size) => (
                    <option key={size.value} value={size.value}>{size.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-6">
              <div className="flex items-center">
                <input
                  id="autoSave"
                  name="autoSave"
                  type="checkbox"
                  checked={settings.autoSave}
                  onChange={handleChange}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded shadow-sm transition-all"
                />
                <label htmlFor="autoSave" className="ml-3 block text-sm text-gray-900 dark:text-gray-200 font-semibold">
                  Auto-save processed documents
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="darkMode"
                  name="darkMode"
                  type="checkbox"
                  checked={settings.darkMode}
                  onChange={handleChange}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded shadow-sm transition-all"
                />
                <label htmlFor="darkMode" className="ml-3 block text-sm text-gray-900 dark:text-gray-200 font-semibold">
                  Dark Mode
                </label>
              </div>
              <div className="flex items-center">
                <input
                  id="notifications"
                  name="notifications"
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={handleChange}
                  className="h-5 w-5 text-indigo-600 focus:ring-indigo-500 border-gray-300 dark:border-gray-600 rounded shadow-sm transition-all"
                />
                <label htmlFor="notifications" className="ml-3 block text-sm text-gray-900 dark:text-gray-200 font-semibold">
                  Enable Notifications
                </label>
              </div>
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t pt-6">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center px-5 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-base font-semibold rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              Reset to Defaults
            </button>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => window.history.back()}
                className="inline-flex items-center px-5 py-2 border border-gray-300 dark:border-gray-600 shadow-sm text-base font-semibold rounded-lg text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
              >
                <X className="h-5 w-5 mr-2" />
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="inline-flex items-center px-6 py-2 border border-transparent shadow-lg text-base font-bold rounded-lg text-white bg-gradient-to-r from-indigo-500 to-blue-500 hover:from-indigo-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all"
              >
                <Save className="h-5 w-5 mr-2" />
                Save Changes
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t pt-6">
            <button
              type="button"
              onClick={handleTogglePasswordRequirement}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                isPasswordRequired ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isPasswordRequired ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className="mt-8 flex flex-col md:flex-row justify-between items-center gap-4 border-t pt-6">
            <button
              type="submit"
              form="password-form"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
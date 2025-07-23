import passwordsConfig from '../config/passwords.json';

interface PasswordConfig {
  documentAccess: {
    defaultPassword: string;
    requirePassword: boolean;
  };
  documentPasswords: {
    [documentId: string]: string;
  };
}

export const getPasswordConfig = (): PasswordConfig => {
  const config = localStorage.getItem('passwordConfig');
  if (config) {
    return JSON.parse(config);
  }
  return {
    ...passwordsConfig,
    documentPasswords: {}
  };
};

export const updatePassword = (newPassword: string): void => {
  const config = getPasswordConfig();
  config.documentAccess.defaultPassword = newPassword;
  localStorage.setItem('passwordConfig', JSON.stringify(config));
};

export const updateDocumentPassword = (documentId: string, password: string): void => {
  const config = getPasswordConfig();
  config.documentPasswords[documentId] = password;
  localStorage.setItem('passwordConfig', JSON.stringify(config));
};

export const getDocumentPassword = (documentId: string): string | undefined => {
  const config = getPasswordConfig();
  return config.documentPasswords[documentId];
};

export const verifyPassword = (password: string, documentId?: string): boolean => {
  const config = getPasswordConfig();
  if (documentId && config.documentPasswords[documentId]) {
    return password === config.documentPasswords[documentId];
  }
  return password === config.documentAccess.defaultPassword;
};

export const isPasswordRequired = (): boolean => {
  const config = getPasswordConfig();
  return config.documentAccess.requirePassword;
};

export const togglePasswordRequirement = (): void => {
  const config = getPasswordConfig();
  config.documentAccess.requirePassword = !config.documentAccess.requirePassword;
  localStorage.setItem('passwordConfig', JSON.stringify(config));
}; 
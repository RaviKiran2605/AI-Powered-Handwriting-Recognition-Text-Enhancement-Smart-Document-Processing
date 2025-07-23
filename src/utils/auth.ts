import usersConfig from '../config/users.json';

interface User {
  username: string;
  password: string;
  role: string;
}

interface DocumentAccess {
  defaultPassword: string;
  requirePassword: boolean;
}

interface AuthConfig {
  users: User[];
  documentAccess: DocumentAccess;
}

const config = usersConfig as AuthConfig;

export const authenticateUser = (username: string, password: string): boolean => {
  const user = config.users.find(u => u.username === username && u.password === password);
  return !!user;
};

export const getUserRole = (username: string): string | undefined => {
  const user = config.users.find(u => u.username === username);
  return user?.role;
};

export const verifyDocumentAccess = (password: string): boolean => {
  if (!config.documentAccess.requirePassword) {
    return true;
  }
  return password === config.documentAccess.defaultPassword;
};

export const isDocumentAccessRequired = (): boolean => {
  return config.documentAccess.requirePassword;
};

export const getDefaultDocumentPassword = (): string => {
  return config.documentAccess.defaultPassword;
}; 
import React, { createContext, useContext, useState, ReactNode } from 'react';
import { UserRole, ROLE_PERMISSIONS } from '@/types/user';
import { userService } from '@/services/userService';

export interface User {
  email: string;
  name: string;
  picture?: string;
  role?: UserRole;
}

interface UserContextType {
  user: User | null;
  setUser: (user: User | null) => void;
  hasPermission: (permission: 'upload' | 'delete' | 'view' | 'rename') => boolean;
  isLoading: boolean;
  error: string | null;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasPermission = (permission: 'upload' | 'delete' | 'view' | 'rename'): boolean => {
    if (!user?.role) return false;
    const rolePermissions = ROLE_PERMISSIONS[user.role];
    return rolePermissions?.permissions?.[permission] || false;
  };

  return (
    <UserContext.Provider value={{ user, setUser, hasPermission, isLoading, error, setIsLoading }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

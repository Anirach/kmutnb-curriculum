import React, { createContext, useContext, ReactNode } from 'react';

interface AuthActionsContextType {
  handleGoogleLogin: () => Promise<void>;
}

const AuthActionsContext = createContext<AuthActionsContextType | undefined>(undefined);

export const AuthActionsProvider = ({ children, handleGoogleLogin }: { children: ReactNode; handleGoogleLogin: () => Promise<void> }) => {
  return (
    <AuthActionsContext.Provider value={{ handleGoogleLogin }}>
      {children}
    </AuthActionsContext.Provider>
  );
};

export const useAuthActions = () => {
  const context = useContext(AuthActionsContext);
  if (context === undefined) {
    throw new Error('useAuthActions must be used within an AuthActionsProvider');
  }
  return context;
}; 
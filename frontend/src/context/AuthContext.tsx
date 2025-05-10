import React, { createContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);

  // On mount, read any existing token
  useEffect(() => {
    const stored = localStorage.getItem('access_token');
    if (stored) setToken(stored);
  }, []);

  return (
    <AuthContext.Provider value={{ token, setToken }}>
      {children}
    </AuthContext.Provider>
  );
};
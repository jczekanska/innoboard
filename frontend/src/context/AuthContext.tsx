import React, { createContext, useState, useEffect, ReactNode } from 'react';

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  token: null,
  setToken: () => {},
  logout: () => {},
});

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem('access_token');
    if (stored) setToken(stored);
  }, []);

  const logout = () => {
    localStorage.removeItem('access_token');
    setToken(null);
  };

  const setTokenAndStore = (newToken: string | null) => {
    if (newToken) {
      localStorage.setItem('access_token', newToken);
    } else {
      localStorage.removeItem('access_token');
    }
    setToken(newToken);
  };

  return (
    <AuthContext.Provider value={{ token, setToken: setTokenAndStore, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// src/lib/api.ts
export interface AuthContext {
  token: string | null;
  logout: () => void;
}

export const createApiCall = (authContext: AuthContext) => {
  return async (url: string, options: RequestInit = {}) => {
    const { token, logout } = authContext;
    
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // If we get a 401, the token is invalid - logout the user
    if (response.status === 401) {
      logout();
      throw new Error('Session expired. Please log in again.');
    }

    return response;
  };
};

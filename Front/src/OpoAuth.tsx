import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {API_URL} from './components/settings';

// Read CSRF token sent in a cookie named "XSRF-TOKEN"
const getCsrfToken = (): string => {
  const match = document.cookie.match(/XSRF-TOKEN=([^;]+)/);
  return match ? match[1] : '';
};

type User = {
  id: string;
  email: string;
  role: string;
  agentName: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message: string; user?: User }>;
  logout: () => void;
  checkAuthStatus: () => Promise<boolean>;
};

const OpoAuthContext = createContext<AuthContextType | undefined>(undefined);

export const OpoAuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const init = async () => {
      console.log('🔧 Initializing auth...');
      const isAuth = await checkAuthStatus();
      setIsAuthenticated(isAuth);
      setIsLoading(false);
      console.log('🔧 Auth initialization complete. Authenticated:', isAuth);
    };
    init();
  }, []);

  const checkAuthStatus = async (): Promise<boolean> => {
    try {
      console.log('🔧 Checking auth status...');

      const resp = await fetch(`${API_URL}/me`, {
        method: 'GET',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
      });

      console.log('🔧 Auth check response:', resp.status);

      if (!resp.ok) {
        // Don't log this as an error - 401 is expected when not logged in
        if (resp.status !== 401) {
          console.warn('🔧 Unexpected auth check status:', resp.status);
        }
        setUser(null);
        setIsAuthenticated(false);
        localStorage.removeItem('user');
        return false;
      }

      const { user: fetchedUser } = await resp.json();
      console.log('🔧 Auth check success:', fetchedUser.email);

      setUser(fetchedUser);
      setIsAuthenticated(true);
      localStorage.setItem('user', JSON.stringify(fetchedUser));
      return true;
    } catch (err) {
      console.error('🔧 Auth check error:', err);
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
      return false;
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('🔧 Attempting login for:', email);

      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
        body: JSON.stringify({ email, password }),
      });

      console.log('🔧 Login response:', response.status);

      const result = await response.json();

      if (response.ok) {
        console.log('🔧 Login successful for:', result.user.email);
        setUser(result.user);
        setIsAuthenticated(true);
        localStorage.setItem('user', JSON.stringify(result.user));
        setIsLoading(false);
        return {
          success: true,
          message: 'Login successful',
          user: result.user,
        };
      } else {
        console.log('🔧 Login failed:', result.message);
        setIsLoading(false);
        return { success: false, message: result.message || 'Login failed' };
      }
    } catch (error) {
      console.error('🔧 Login error:', error);
      setIsLoading(false);
      return { success: false, message: 'Connection error. Please try again later.' };
    }
  };

  const logout = async () => {
    try {
      console.log('🔧 Logging out...');

      await fetch(`${API_URL}/logout`, {
        method: 'POST',
        credentials: 'include',
        mode: 'cors',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-Token': getCsrfToken(),
        },
      });

      console.log('🔧 Logout successful');
    } catch (error) {
      console.error('🔧 Logout error:', error);
    } finally {
      setUser(null);
      setIsAuthenticated(false);
      localStorage.removeItem('user');
    }
  };

  const value = {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout,
    checkAuthStatus,
  };

  return <OpoAuthContext.Provider value={value}>{children}</OpoAuthContext.Provider>;
};

export const useOpoAuth = () => {
  const context = useContext(OpoAuthContext);
  if (context === undefined) {
    throw new Error('useOpoAuth must be used within an OpoAuthProvider');
  }
  return context;
};
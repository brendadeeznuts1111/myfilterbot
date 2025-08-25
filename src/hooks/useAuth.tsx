import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAPI } from './useAPI';

interface User {
  customer_id: string;
  username?: string;
  telegram_id?: number;
  balance: number;
  weekly_pnl: number;
  active: boolean;
}

interface AuthContextType {
  user: User | null;
  login: (customerId: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Get customer profile data
  const { data: profileData, error } = useAPI<User>('/customer/profile', {
    customerId: user?.customer_id,
    immediate: false,
  });

  useEffect(() => {
    // Check for stored authentication
    const storedCustomerId = localStorage.getItem('customer_id');
    if (storedCustomerId) {
      login(storedCustomerId);
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (profileData && !error) {
      setUser(profileData);
      setIsAuthenticated(true);
    }
    setLoading(false);
  }, [profileData, error]);

  const login = async (customerId: string): Promise<boolean> => {
    setLoading(true);
    try {
      // For this demo, we'll use the API to validate the customer
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3003'}/api/customer/profile`,
        {
          headers: {
            'X-Customer-ID': customerId,
            'X-User-ID': customerId,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const userData = await response.json();
        const customer = userData.success ? userData.data : userData;

        localStorage.setItem('customer_id', customerId);
        setUser(customer);
        setIsAuthenticated(true);
        setLoading(false);
        return true;
      } else {
        setLoading(false);
        return false;
      }
    } catch (error) {
      console.error('Login error:', error);
      setLoading(false);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('customer_id');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        logout,
        isAuthenticated,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

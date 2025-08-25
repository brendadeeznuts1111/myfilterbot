/**
 * Customer Context Provider
 * Manages customer ID and API client instance throughout the application
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  EnhancedApiClient,
  createApiClient,
  customerAPI,
} from '../lib/api-client';

interface CustomerContextType {
  customerId: string | null;
  apiClient: EnhancedApiClient | null;
  setCustomerId: (id: string) => void;
  clearCustomer: () => void;
  isReady: boolean;
}

const CustomerContext = createContext<CustomerContextType | undefined>(
  undefined
);

interface CustomerProviderProps {
  children: React.ReactNode;
  defaultCustomerId?: string;
}

export function CustomerProvider({
  children,
  defaultCustomerId,
}: CustomerProviderProps) {
  const [customerId, setCustomerIdState] = useState<string | null>(
    defaultCustomerId || null
  );
  const [apiClient, setApiClient] = useState<EnhancedApiClient | null>(null);
  const [isReady, setIsReady] = useState(false);

  // Create API client when customer ID changes
  useEffect(() => {
    if (customerId) {
      const client = createApiClient(customerId);
      setApiClient(client);

      // Also update the global API client for backward compatibility
      customerAPI.setCustomerId(customerId);

      setIsReady(true);

      console.log(`🔗 API Client initialized for customer: ${customerId}`);
    } else {
      setApiClient(null);
      setIsReady(false);
    }
  }, [customerId]);

  const setCustomerId = (id: string) => {
    console.log(`👤 Setting customer ID: ${id}`);
    setCustomerIdState(id);
  };

  const clearCustomer = () => {
    console.log(`🚪 Clearing customer session`);
    setCustomerIdState(null);
    setApiClient(null);
    setIsReady(false);
  };

  const value: CustomerContextType = {
    customerId,
    apiClient,
    setCustomerId,
    clearCustomer,
    isReady,
  };

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  );
}

// Hook to use customer context
export function useCustomer(): CustomerContextType {
  const context = useContext(CustomerContext);
  if (!context) {
    throw new Error('useCustomer must be used within a CustomerProvider');
  }
  return context;
}

// Hook to get the current API client
export function useApiClient(): EnhancedApiClient {
  const { apiClient, isReady, customerId } = useCustomer();

  if (!isReady || !apiClient) {
    throw new Error(
      `API client not ready. Customer ID: ${customerId}, Ready: ${isReady}`
    );
  }

  return apiClient;
}

export default CustomerProvider;

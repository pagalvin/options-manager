import { useState, useEffect, useCallback } from 'react';
import { etradeAPI } from '../lib/etradeAPI';

interface ConnectivityState {
  isConnected: boolean;
  lastError: string | null;
  lastCheckTime: Date | null;
  isChecking: boolean;
}

export const useETradeConnectivity = (checkInterval: number = 30000) => {
  const [state, setState] = useState<ConnectivityState>({
    isConnected: true,
    lastError: null,
    lastCheckTime: null,
    isChecking: false,
  });

  const checkConnectivity = useCallback(async () => {
    // Only check if we have an active session
    if (!etradeAPI.getSessionId()) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        lastError: 'No active E*TRADE session',
        lastCheckTime: new Date(),
        isChecking: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, isChecking: true }));

    try {
      // Use AAPL as a test to keep connection warm
      await etradeAPI.getStockQuote('AAPL');
      
      setState(prev => ({
        ...prev,
        isConnected: true,
        lastError: null,
        lastCheckTime: new Date(),
        isChecking: false,
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Connection failed';
      
      setState(prev => ({
        ...prev,
        isConnected: false,
        lastError: errorMessage,
        lastCheckTime: new Date(),
        isChecking: false,
      }));
    }
  }, []);

  const retryConnection = useCallback(() => {
    checkConnectivity();
  }, [checkConnectivity]);

  const clearError = useCallback(() => {
    setState(prev => ({
      ...prev,
      isConnected: true,
      lastError: null,
    }));
  }, []);

  useEffect(() => {
    // Initial check
    checkConnectivity();

    // Set up periodic checks
    const interval = setInterval(checkConnectivity, checkInterval);

    return () => {
      clearInterval(interval);
    };
  }, [checkConnectivity, checkInterval]);

  return {
    ...state,
    retryConnection,
    clearError,
  };
};
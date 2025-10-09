import React from 'react';
import { useETradeConnectivity } from '../hooks/useETradeConnectivity';

interface ETradeConnectivityBannerProps {
  className?: string;
}

export const ETradeConnectivityBanner: React.FC<ETradeConnectivityBannerProps> = ({ 
  className = '' 
}) => {
  const { isConnected, lastError, isChecking, retryConnection, clearError } = useETradeConnectivity();

  // Don't render if connected
  if (isConnected) {
    return null;
  }

  const handleDismiss = () => {
    clearError();
  };

  return (
    <div 
      className={`etrade-connectivity-banner ${className}`}
      role="alert"
      aria-live="polite"
    >
      <div className="etrade-connectivity-banner__content">
        <div className="etrade-connectivity-banner__icon">
          ⚠️
        </div>
        <div className="etrade-connectivity-banner__message">
          <strong>E*TRADE Connection Issue</strong>
          <span className="etrade-connectivity-banner__error">
            {lastError || 'Unable to connect to E*TRADE services'}
          </span>
        </div>
        <div className="etrade-connectivity-banner__actions">
          <a
            href="http://localhost:3000/etrade"
            className="etrade-connectivity-banner__login"
            aria-label="Go to E*TRADE login page"
          >
            Login
          </a>
          <button
            type="button"
            className="etrade-connectivity-banner__retry"
            onClick={retryConnection}
            disabled={isChecking}
            aria-label="Retry connection to E*TRADE"
          >
            {isChecking ? 'Checking...' : 'Retry'}
          </button>
          <button
            type="button"
            className="etrade-connectivity-banner__dismiss"
            onClick={handleDismiss}
            aria-label="Dismiss this alert"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
};
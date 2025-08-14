class ETradeAPI {
  private sessionId: string | null = null;

  constructor() {
    // Try to restore session from localStorage
    this.sessionId = localStorage.getItem('etrade_session_id');
  }

  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
    localStorage.setItem('etrade_session_id', sessionId);
  }

  clearSession() {
    this.sessionId = null;
    localStorage.removeItem('etrade_session_id');
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  async initiateAuth(): Promise<{ sessionId: string; authUrl: string }> {
    const response = await fetch('/api/etrade/auth/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Authentication initiation failed: ${response.status}`);
    }

    return response.json();
  }

  async checkAuthStatus(sessionId: string): Promise<{ authenticated: boolean }> {
    const response = await fetch(`/api/etrade/auth/status/${sessionId}`);
    
    if (!response.ok) {
      throw new Error(`Auth status check failed: ${response.status}`);
    }

    return response.json();
  }

  async logout(): Promise<void> {
    if (!this.sessionId) return;

    const response = await fetch('/api/etrade/auth/logout', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId: this.sessionId }),
    });

    if (!response.ok) {
      throw new Error(`Logout failed: ${response.status}`);
    }

    this.clearSession();
  }

  async completeAuth(sessionId: string, verifier: string): Promise<void> {
    const response = await fetch('/api/etrade/auth/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId, verifier }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Authentication completion failed: ${response.status}`);
    }

    this.setSessionId(sessionId);
  }

  async renewToken(): Promise<void> {
    if (!this.sessionId) {
      throw new Error('No active session. Please authenticate first.');
    }

    const response = await fetch('/api/etrade/auth/renew', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sessionId: this.sessionId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      if (response.status === 401) {
        this.clearSession();
        throw new Error('Session expired. Please re-authenticate.');
      }
      throw new Error(errorData.message || `Token renewal failed: ${response.status}`);
    }
  }

  private async makeAuthenticatedRequest(url: string, options: RequestInit = {}): Promise<Response> {
    if (!this.sessionId) {
      throw new Error('No active session. Please authenticate first.');
    }

    const headers = {
      'X-Session-ID': this.sessionId,
      ...options.headers,
    };

    const response = await fetch(url, { ...options, headers });

    if (response.status === 401) {
      // Try to renew token once
      try {
        await this.renewToken();
        // Retry the request with renewed token
        return await fetch(url, { ...options, headers: { ...headers, 'X-Session-ID': this.sessionId! } });
      } catch (renewError) {
        this.clearSession();
        throw new Error('Session expired. Please re-authenticate.');
      }
    }

    return response;
  }

  async getStockQuote(symbol: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`/api/etrade/quote/${encodeURIComponent(symbol.toUpperCase())}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to get quote: ${response.status}`);
    }

    return response.json();
  }

  async getOptionChain(symbol: string, expiryYear?: string, expiryMonth?: string, expiryDay?: string): Promise<any> {
    let url = `/api/etrade/options/${encodeURIComponent(symbol.toUpperCase())}`;
    const params = new URLSearchParams();
    
    if (expiryYear) params.append('expiryYear', expiryYear);
    if (expiryMonth) params.append('expiryMonth', expiryMonth);
    if (expiryDay) params.append('expiryDay', expiryDay);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await this.makeAuthenticatedRequest(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to get option chain: ${response.status}`);
    }

    return response.json();
  }

  async getOptionExpirationDates(symbol: string, expiryType?: string): Promise<any> {
    let url = `/api/etrade/options/${encodeURIComponent(symbol.toUpperCase())}/expirations`;
    
    if (expiryType) {
      url += `?expiryType=${encodeURIComponent(expiryType)}`;
    }

    const response = await this.makeAuthenticatedRequest(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to get expiration dates: ${response.status}`);
    }

    return response.json();
  }

  async lookupProduct(search: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(`/api/etrade/lookup/${encodeURIComponent(search)}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to lookup product: ${response.status}`);
    }

    return response.json();
  }

  async getEnvironment(): Promise<{ environment: string; baseUrl: string }> {
    const response = await fetch('/api/etrade/environment');
    
    if (!response.ok) {
      throw new Error(`Failed to get environment: ${response.status}`);
    }

    return response.json();
  }

  async setEnvironment(sandbox: boolean): Promise<{ success: boolean; environment: string; baseUrl: string }> {
    const response = await fetch('/api/etrade/environment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sandbox }),
    });

    if (!response.ok) {
      throw new Error(`Failed to set environment: ${response.status}`);
    }

    return response.json();
  }

  async getAccounts(): Promise<any> {
    const response = await this.makeAuthenticatedRequest('/api/etrade/accounts');

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to get accounts: ${response.status}`);
    }

    return response.json();
  }

  async getTransactions(
    accountIdKey: string, 
    options?: {
      symbol?: string;
      startDate?: string;
      endDate?: string;
      count?: number;
      sortOrder?: 'ASC' | 'DESC';
      marker?: string;
    }
  ): Promise<any> {
    let url = `/api/etrade/accounts/${encodeURIComponent(accountIdKey)}/transactions`;
    const params = new URLSearchParams();
    
    if (options?.symbol) params.append('symbol', options.symbol);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.count) params.append('count', options.count.toString());
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    if (options?.marker) params.append('marker', options.marker);
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await this.makeAuthenticatedRequest(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to get transactions: ${response.status}`);
    }

    return response.json();
  }

  async getAllTransactions(
    accountIdKey: string, 
    options?: {
      symbol?: string;
      startDate?: string;
      endDate?: string;
      sortOrder?: 'ASC' | 'DESC';
      maxPages?: number;
      pageDelay?: number;
    }
  ): Promise<any> {
    let url = `/api/etrade/accounts/${encodeURIComponent(accountIdKey)}/transactions/all`;
    const params = new URLSearchParams();
    
    if (options?.symbol) params.append('symbol', options.symbol);
    if (options?.startDate) params.append('startDate', options.startDate);
    if (options?.endDate) params.append('endDate', options.endDate);
    if (options?.sortOrder) params.append('sortOrder', options.sortOrder);
    if (options?.maxPages) params.append('maxPages', options.maxPages.toString());
    if (options?.pageDelay) params.append('pageDelay', options.pageDelay.toString());
    
    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await this.makeAuthenticatedRequest(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to get all transactions: ${response.status}`);
    }

    return response.json();
  }

  async getTransactionDetails(accountIdKey: string, transactionId: string): Promise<any> {
    const response = await this.makeAuthenticatedRequest(
      `/api/etrade/accounts/${encodeURIComponent(accountIdKey)}/transactions/${encodeURIComponent(transactionId)}`
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to get transaction details: ${response.status}`);
    }

    return response.json();
  }
}

export const etradeAPI = new ETradeAPI();

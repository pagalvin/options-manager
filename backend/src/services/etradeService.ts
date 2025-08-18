import crypto from 'crypto';
import axios from 'axios';

interface ETradeConfig {
  consumerKey: string;
  consumerSecret: string;
  baseUrl: string;
  sandboxUrl: string;
  authUrl: string;
  useSandbox: boolean;
}

interface OAuthToken {
  key: string;
  secret: string;
}

interface RequestToken extends OAuthToken {
  oauth_callback_confirmed?: string;
}

interface AccessToken extends OAuthToken {
  oauth_session_handle?: string;
  lastActivity?: number;
  expiresAt?: number;
}

interface OptionGreeks {
  rho: number;
  vega: number;
  theta: number;
  delta: number;
  gamma: number;
  iv: number;
  currentValue: boolean;
}

interface OptionDetails {
  optionCategory: string;
  optionRootSymbol: string;
  timeStamp: number;
  adjustedFlag: boolean;
  displaySymbol: string;
  optionType: string;
  strikePrice: number;
  symbol: string;
  bid: number;
  ask: number;
  bidSize: number;
  askSize: number;
  inTheMoney: string;
  volume: number;
  openInterest: number;
  netChange: number;
  lastPrice: number;
  quoteDetail: string;
  osiKey: string;
  optionGreek: OptionGreeks;
}

interface OptionChainPair {
  Call?: OptionDetails;
  Put?: OptionDetails;
  optioncall?: OptionDetails;  // JSON format
  optionPut?: OptionDetails;   // JSON format
  pairType?: string;
}

interface SelectedED {
  month: number;
  year: number;
  day: number;
}

interface OptionChainResponse {
  optionPairs?: OptionChainPair[];
  OptionPair?: OptionChainPair[];   // XML format uses OptionPair
  timeStamp: number;
  quoteType: string;
  nearPrice: number;
  selected?: SelectedED;
  SelectedED?: SelectedED;          // XML format uses SelectedED
}

interface ExpirationDate {
  year: number;
  month: number;
  day: number;
  expiryType: string;
}

interface OptionExpireDateResponse {
  expirationDates?: ExpirationDate[];
  ExpirationDate?: ExpirationDate[];  // XML format uses ExpirationDate
  OptionExpireDateResponse?: {  // Actual API response structure
    ExpirationDate: ExpirationDate[];
  };
}

interface LookupData {
  symbol: string;
  description: string;
  type: string;
}

interface LookupResponse {
  data: LookupData[];
  Data?: LookupData[];
}

interface StockQuote {
  quoteResponse: {
    quoteData: {
      product: {
        symbol: string;
        companyName: string;
      };
      all: {
        lastTrade: number;
        bid: number;
        ask: number;
        bidSize: number;
        askSize: number;
        volume: number;
        open: number;
        high: number;
        low: number;
        close: number;
        changeClose: number;
        changeClosePercentage: number;
        lastTradeTime: number;
      };
    }[];
  };
}

interface AccountInfo {
  accountId: string;
  accountIdKey: string;
  accountName: string;
  accountType: string;
  institutionType: string;
  accountStatus: string;
}

interface AccountListResponse {
  AccountListResponse?: {
    Accounts: {
      Account: AccountInfo[];
    };
  };
  Accounts?: {
    Account: AccountInfo[];
  };
}

interface TransactionProduct {
  symbol?: string;
  securityType?: string;
  securitySubType?: string;
  callPut?: string;
  expiryYear?: number;
  expiryMonth?: number;
  expiryDay?: number;
  strikePrice?: number;
  expiryType?: string;
  productId?: {
    symbol?: string;
    typeCode?: string;
  };
}

interface TransactionBrokerage {
  transactionType: string;
  product?: TransactionProduct;
  quantity: number;
  price: number;
  settlementCurrency: string;
  paymentCurrency: string;
  fee: number;
  memo?: string;
  checkNo?: string;
  orderNo?: string;
  settlementDate?: number;
}

interface TransactionCategory {
  categoryId: string;
  parentId: string;
  categoryName?: string;
  parentName?: string;
}

interface Transaction {
  transactionId: number;
  accountId: string;
  transactionDate: number;
  postDate?: number;
  amount: number;
  description: string;
  description2?: string;
  transactionType?: string;
  memo?: string;
  imageFlag?: boolean;
  instType?: string;
  brokerage?: TransactionBrokerage;
  category?: TransactionCategory;
  detailsURI?: string;
}

interface TransactionListResponse {
  TransactionListResponse?: {
    Transaction?: Transaction[];
    pageMarkers?: string;
    moreTransactions?: boolean;
    transactionCount?: number;
    totalCount?: number;
    next?: string;
    marker?: string;
  };
  Transaction?: Transaction[];
  pageMarkers?: string;
  moreTransactions?: boolean;
  transactionCount?: number;
  totalCount?: number;
  next?: string;
  marker?: string;
}

interface TransactionDetailsResponse {
  TransactionDetailsResponse?: {
    transactionId: number;
    accountId: string;
    transactionDate: number;
    postDate?: number;
    amount: number;
    description: string;
    category?: TransactionCategory;
    brokerage?: TransactionBrokerage;
  };
  transactionId?: number;
  accountId?: string;
  transactionDate?: number;
  postDate?: number;
  amount?: number;
  description?: string;
  category?: TransactionCategory;
  brokerage?: TransactionBrokerage;
}

// Order interfaces based on actual ETrade API response
interface OrderProduct {
  symbol: string;
  securityType: string;
  callPut?: string;
  expiryYear?: number;
  expiryMonth?: number;
  expiryDay?: number;
  strikePrice?: number;
  productId?: {
    symbol: string;
    typeCode: string;
  };
}

interface OrderInstrument {
  symbolDescription: string;
  orderAction: string;
  quantityType: string;
  orderedQuantity: number;
  filledQuantity: number;
  estimatedCommission: number;
  estimatedFees: number;
  Product: OrderProduct;
}

interface OrderDetail {
  placedTime?: number;
  executedTime?: number;
  orderValue?: number;
  status: string;
  orderTerm: string;
  priceType: string;
  limitPrice?: number;
  stopPrice?: number;
  marketSession: string;
  replacesOrderId?: number;
  allOrNone?: boolean;
  netPrice?: number;
  netBid?: number;
  netAsk?: number;
  gcd?: number;
  ratio?: string;
  Instrument?: OrderInstrument[];
}

interface Order {
  orderId: number;
  details: string; // URL to order details
  orderType: string;
  OrderDetail: OrderDetail[];
}

interface OrdersResponse {
  OrdersResponse?: {
    Order?: Order[];
    marker?: string;
    moreOrders?: boolean;
    next?: string;
  };
  Order?: Order[];
  marker?: string;
  moreOrders?: boolean;
  next?: string;
}

export class ETradeService {
  private config: ETradeConfig;
  private requestTokens: Map<string, RequestToken> = new Map();
  private accessTokens: Map<string, AccessToken> = new Map();
  // Add a simple in-memory cache for quotes with a 30s TTL, keyed by environment and symbol
  private quoteCache: Map<string, { data: StockQuote; fetchedAt: number }> = new Map();
  private readonly QUOTE_CACHE_TTL_MS = 30_000;

  constructor() {
    this.config = {
      consumerKey: '', // Will be set dynamically based on environment
      consumerSecret: '', // Will be set dynamically based on environment
      baseUrl: process.env.ETRADE_BASE_URL || 'https://api.etrade.com',
      sandboxUrl: process.env.ETRADE_SANDBOX_URL || 'https://apisb.etrade.com',
      authUrl: 'https://us.etrade.com/e/t/etws/authorize',
      useSandbox: process.env.NODE_ENV !== 'production'
    };

    // Set initial credentials based on default environment
    this.updateCredentials();
  }

  private updateCredentials(): void {
    if (this.config.useSandbox) {
      this.config.consumerKey = process.env.ETRADE_SANDBOX_CONSUMER_KEY || '';
      this.config.consumerSecret = process.env.ETRADE_SANDBOX_CONSUMER_SECRET || '';
    } else {
      this.config.consumerKey = process.env.ETRADE_LIVE_CONSUMER_KEY || '';
      this.config.consumerSecret = process.env.ETRADE_LIVE_CONSUMER_SECRET || '';
    }

    if (!this.config.consumerKey || !this.config.consumerSecret) {
      const env = this.config.useSandbox ? 'SANDBOX' : 'LIVE';
      console.warn(`E*TRADE ${env} credentials not configured. Please set the appropriate environment variables.`);
    }
  }

  // Method to switch between sandbox and live environments
  setEnvironment(sandbox: boolean): void {
    this.config.useSandbox = sandbox;
    
    // Update credentials for the new environment
    this.updateCredentials();
    
    // Clear all authentication tokens when switching environments
    // Sandbox tokens don't work with live environment and vice versa
    this.requestTokens.clear();
    this.accessTokens.clear();
    
    console.log(`E*TRADE environment switched to: ${sandbox ? 'SANDBOX' : 'LIVE'}`);
    console.log('All authentication tokens cleared - re-authentication required');
    
    // Log credential status for debugging
    const hasCredentials = this.config.consumerKey && this.config.consumerSecret;
    console.log(`Credentials available for ${sandbox ? 'SANDBOX' : 'LIVE'} environment: ${hasCredentials}`);
  }

  getEnvironment(): { environment: string; baseUrl: string } {
    return {
      environment: this.config.useSandbox ? 'SANDBOX' : 'LIVE',
      baseUrl: this.getApiBaseUrl()
    };
  }

  hasValidCredentials(): boolean {
    return !!(this.config.consumerKey && this.config.consumerSecret);
  }

  private generateNonce(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  private generateTimestamp(): string {
    return Math.floor(Date.now() / 1000).toString();
  }

  private getApiBaseUrl(): string {
    return this.config.useSandbox ? this.config.sandboxUrl : this.config.baseUrl;
  }

  private getTokenExpirationTime(): number {
    // Access tokens expire at midnight US Eastern time
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const midnight = new Date(easternTime);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime();
  }

  private isTokenExpired(token: AccessToken): boolean {
    const now = Date.now();
    return token.expiresAt ? now > token.expiresAt : false;
  }

  private isTokenInactive(token: AccessToken): boolean {
    // Token becomes inactive after 2 hours of inactivity
    const twoHoursInMs = 2 * 60 * 60 * 1000;
    const now = Date.now();
    return token.lastActivity ? (now - token.lastActivity) > twoHoursInMs : false;
  }

  private generateSignature(
    method: string,
    url: string,
    params: Record<string, string>,
    consumerSecret: string,
    tokenSecret: string = ''
  ): string {
    // Parse URL to separate base URL and query parameters
    const urlObj = new URL(url);
    const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    
    // Combine OAuth parameters with query parameters
    const allParams: Record<string, string> = { ...params };
    
    // Add query parameters to the parameter list for signature
    urlObj.searchParams.forEach((value, key) => {
      allParams[key] = value;
    });

    // Sort parameters
    const sortedParams = Object.keys(allParams)
      .sort()
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(allParams[key])}`)
      .join('&');

    // Create signature base string using the base URL (without query parameters)
    const signatureBaseString = [
      method.toUpperCase(),
      encodeURIComponent(baseUrl),
      encodeURIComponent(sortedParams)
    ].join('&');

    // Create signing key
    const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

    // Generate signature
    return crypto
      .createHmac('sha1', signingKey)
      .update(signatureBaseString)
      .digest('base64');
  }

  private createAuthHeader(
    method: string,
    url: string,
    token?: OAuthToken,
    additionalParams: Record<string, string> = {}
  ): string {
    const nonce = this.generateNonce();
    const timestamp = this.generateTimestamp();

    const oauthParams: Record<string, string> = {
      oauth_consumer_key: this.config.consumerKey,
      oauth_nonce: nonce,
      oauth_signature_method: 'HMAC-SHA1',
      oauth_timestamp: timestamp,
      ...additionalParams
    };

    if (token) {
      oauthParams.oauth_token = token.key;
    }

    const signature = this.generateSignature(
      method,
      url,
      oauthParams,
      this.config.consumerSecret,
      token?.secret || ''
    );

    oauthParams.oauth_signature = signature;

    const authString = Object.keys(oauthParams)
      .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
      .join(', ');

    return `OAuth ${authString}`;
  }

  async getRequestToken(callbackUrl: string = 'oob'): Promise<{ token: RequestToken; authUrl: string; sessionId: string }> {
    const url = `${this.getApiBaseUrl()}/oauth/request_token`;
    const sessionId = crypto.randomUUID();

    try {
      const authHeader = this.createAuthHeader('GET', url, undefined, {
        oauth_callback: 'oob'
      });

      const response = await axios.get(url, {
        headers: {
          Authorization: authHeader
        }
      });

      // Parse response
      const params = new URLSearchParams(response.data);
      const requestToken: RequestToken = {
        key: params.get('oauth_token') || '',
        secret: params.get('oauth_token_secret') || '',
        oauth_callback_confirmed: params.get('oauth_callback_confirmed') || ''
      };

      // Store request token with session ID
      this.requestTokens.set(sessionId, requestToken);

      // Create authorization URL using the correct ETrade authorization endpoint
      const authUrl = `${this.config.authUrl}?key=${encodeURIComponent(this.config.consumerKey)}&token=${encodeURIComponent(requestToken.key)}`;

      return { token: requestToken, authUrl, sessionId };
    } catch (error) {
      console.error('Error getting request token:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get request token: ${error.response?.status} ${error.response?.data || error.message}`);
      }
      throw new Error('Failed to get request token from E*TRADE');
    }
  }

  async getAccessToken(sessionId: string, verifier: string): Promise<AccessToken> {
    const requestToken = this.requestTokens.get(sessionId);
    if (!requestToken) {
      throw new Error('Request token not found. Please restart the authorization process.');
    }

    const url = `${this.getApiBaseUrl()}/oauth/access_token`;

    try {
      const authHeader = this.createAuthHeader('GET', url, requestToken, {
        oauth_verifier: verifier
      });

      const response = await axios.get(url, {
        headers: {
          Authorization: authHeader
        }
      });

      // Parse response
      const params = new URLSearchParams(response.data);
      const accessToken: AccessToken = {
        key: params.get('oauth_token') || '',
        secret: params.get('oauth_token_secret') || '',
        oauth_session_handle: params.get('oauth_session_handle') || '',
        lastActivity: Date.now(),
        expiresAt: this.getTokenExpirationTime()
      };

      // Store access token
      this.accessTokens.set(sessionId, accessToken);

      // Clean up request token
      this.requestTokens.delete(sessionId);

      return accessToken;
    } catch (error) {
      console.error('Error getting access token:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to get access token: ${error.response?.status} ${error.response?.data || error.message}`);
      }
      throw new Error('Failed to get access token from E*TRADE');
    }
  }

  async renewAccessToken(sessionId: string): Promise<AccessToken> {
    const accessToken = this.accessTokens.get(sessionId);
    if (!accessToken) {
      throw new Error('Access token not found. Please authenticate first.');
    }

    if (this.isTokenExpired(accessToken)) {
      throw new Error('Access token has expired. Please re-authenticate.');
    }

    const url = `${this.getApiBaseUrl()}/oauth/renew_access_token`;

    try {
      const authHeader = this.createAuthHeader('GET', url, accessToken);

      const response = await axios.get(url, {
        headers: {
          Authorization: authHeader
        }
      });

      // Update the last activity time
      accessToken.lastActivity = Date.now();
      this.accessTokens.set(sessionId, accessToken);

      return accessToken;
    } catch (error) {
      console.error('Error renewing access token:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Access token renewal failed. Please re-authenticate.');
        }
        throw new Error(`Failed to renew access token: ${error.response?.status} ${error.response?.data || error.message}`);
      }
      throw new Error('Failed to renew access token from E*TRADE');
    }
  }

  private async ensureValidToken(sessionId: string): Promise<AccessToken> {
    const accessToken = this.accessTokens.get(sessionId);
    if (!accessToken) {
      throw new Error('No authentication session found. Please authenticate first.');
    }

    if (this.isTokenExpired(accessToken)) {
      throw new Error('Access token has expired. Please re-authenticate.');
    }

    if (this.isTokenInactive(accessToken)) {
      // Try to renew the token
      return await this.renewAccessToken(sessionId);
    }

    // Update last activity
    accessToken.lastActivity = Date.now();
    this.accessTokens.set(sessionId, accessToken);

    return accessToken;
  }

  async getStockQuote(sessionId: string, symbol: string): Promise<StockQuote> {
    try {
      const accessToken = await this.ensureValidToken(sessionId);

      // Check cache first (cache key includes environment to avoid cross-env contamination)
      const cacheKey = `${this.config.useSandbox ? 'SANDBOX' : 'LIVE'}:${symbol.toUpperCase()}`;
      const cached = this.quoteCache.get(cacheKey);
      if (cached && (Date.now() - cached.fetchedAt) < this.QUOTE_CACHE_TTL_MS) {
        return cached.data;
      }

      const url = `${this.getApiBaseUrl()}/v1/market/quote/${encodeURIComponent(symbol)}?requireEarningsDate=true`;
      const authHeader = this.createAuthHeader('GET', url, accessToken);

      const response = await axios.get(url, {
        headers: {
          Authorization: authHeader
        }
      });

      // Cache the fresh response
      this.quoteCache.set(cacheKey, { data: response.data, fetchedAt: Date.now() });

      return response.data;
    } catch (error) {
      console.error('Error getting stock quote:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please re-authenticate.');
        }
        throw new Error(`Failed to get quote for ${symbol}: ${error.response?.status} ${error.response?.data || error.message}`);
      }
      throw new Error(`Failed to get quote for ${symbol}`);
    }
  }

  async lookupProduct(sessionId: string, search: string): Promise<LookupResponse> {
    try {
      const accessToken = await this.ensureValidToken(sessionId);
      const url = `${this.getApiBaseUrl()}/v1/market/lookup/${encodeURIComponent(search)}`;

      const authHeader = this.createAuthHeader('GET', url, accessToken);

      const response = await axios.get(url, {
        headers: {
          Authorization: authHeader
        }
      });

      return response.data;
    } catch (error) {
      console.error('Error looking up product:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please re-authenticate.');
        }
        throw new Error(`Failed to lookup product ${search}: ${error.response?.status} ${error.response?.data || error.message}`);
      }
      throw new Error(`Failed to lookup product ${search}`);
    }
  }

  async getOptionChain(
    sessionId: string, 
    symbol: string, 
    options?: {
      expirationYear?: string;
      expirationMonth?: string;
      expirationDay?: string;
      strikePriceNear?: number;
      noOfStrikes?: number;
      includeWeekly?: boolean;
      skipAdjusted?: boolean;
      optionCategory?: 'STANDARD' | 'ALL' | 'MINI';
      chainType?: 'CALL' | 'PUT' | 'CALLPUT';
      priceType?: 'ATNM' | 'ALL';
    }
  ): Promise<OptionChainResponse> {
    try {
      const accessToken = await this.ensureValidToken(sessionId);
      
      let url = `${this.getApiBaseUrl()}/v1/market/optionchains?symbol=${encodeURIComponent(symbol)}`;
      
      if (options) {
        if (options.expirationYear) url += `&expiryYear=${options.expirationYear}`;
        if (options.expirationMonth) url += `&expiryMonth=${options.expirationMonth}`;
        if (options.expirationDay) url += `&expiryDay=${options.expirationDay}`;
        if (options.strikePriceNear) url += `&strikePriceNear=${options.strikePriceNear}`;
        if (options.noOfStrikes) url += `&noOfStrikes=${options.noOfStrikes}`;
        if (options.includeWeekly !== undefined) url += `&includeWeekly=${options.includeWeekly}`;
        if (options.skipAdjusted !== undefined) url += `&skipAdjusted=${options.skipAdjusted}`;
        if (options.optionCategory) url += `&optionCategory=${options.optionCategory}`;
        if (options.chainType) url += `&chainType=${options.chainType}`;
        if (options.priceType) url += `&priceType=${options.priceType}`;
      }

      const authHeader = this.createAuthHeader('GET', url, accessToken);

      const response = await axios.get(url, {
        headers: {
          Authorization: authHeader
        }
      });

      const responseData = response.data as OptionChainResponse;
      
      // Normalize response format - handle both JSON and XML response structures
      if (responseData.OptionPair && !responseData.optionPairs) {
        responseData.optionPairs = responseData.OptionPair;
      }
      if (responseData.SelectedED && !responseData.selected) {
        responseData.selected = responseData.SelectedED;
      }

      // Normalize option pairs - handle both formats
      if (responseData.optionPairs) {
        responseData.optionPairs = responseData.optionPairs.map(pair => ({
          ...pair,
          Call: pair.Call || pair.optioncall,
          Put: pair.Put || pair.optionPut
        }));
      }

      return responseData;
    } catch (error) {
      console.error('Error getting option chain:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please re-authenticate.');
        }
        
        // Handle specific E*TRADE error codes
        const errorMessage = error.response?.data || error.message;
        if (typeof errorMessage === 'string') {
          if (errorMessage.includes('10032') || errorMessage.includes('No options are available')) {
            throw new Error(`No options are available for symbol ${symbol}.`);
          }
          if (errorMessage.includes('10044') || errorMessage.includes('no options available for the given symbol')) {
            throw new Error(`No options are available for ${symbol} with the specified expiration date.`);
          }
          if (errorMessage.includes('10033') || errorMessage.includes('invalid')) {
            throw new Error(`Invalid symbol: ${symbol}. Please enter another symbol.`);
          }
        }
        
        throw new Error(`Failed to get option chain for ${symbol}: ${error.response?.status} ${errorMessage}`);
      }
      throw new Error(`Failed to get option chain for ${symbol}`);
    }
  }

  async getOptionExpirationDates(
    sessionId: string, 
    symbol: string, 
    expiryType?: 'UNSPECIFIED' | 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'VIX' | 'ALL' | 'MONTHEND'
  ): Promise<ExpirationDate[]> {
    try {
      const accessToken = await this.ensureValidToken(sessionId);
      let url = `${this.getApiBaseUrl()}/v1/market/optionexpiredate?symbol=${encodeURIComponent(symbol)}`;
      
      if (expiryType) {
        url += `&expiryType=${expiryType}`;
      }

      const authHeader = this.createAuthHeader('GET', url, accessToken);

      const response = await axios.get(url, {
        headers: {
          Authorization: authHeader
        }
      });

      console.log(`Expiration dates API response for ${symbol}:`, JSON.stringify(response.data, null, 2));

      const responseData = response.data;
      
      // Handle the actual response structure - the data is wrapped in OptionExpireDateResponse
      let expirationDates: ExpirationDate[] = [];
      
      if (responseData.OptionExpireDateResponse && responseData.OptionExpireDateResponse.ExpirationDate) {
        // The actual structure from E*TRADE API
        expirationDates = responseData.OptionExpireDateResponse.ExpirationDate;
        console.log(`Using OptionExpireDateResponse.ExpirationDate path`);
      } else if (responseData.expirationDates) {
        // Alternative JSON structure
        expirationDates = responseData.expirationDates;
        console.log(`Using expirationDates path`);
      } else if (responseData.ExpirationDate) {
        // Direct XML structure
        expirationDates = responseData.ExpirationDate;
        console.log(`Using ExpirationDate path`);
      } else {
        console.log(`No matching path found. Available keys:`, Object.keys(responseData));
      }
      
      console.log(`Parsed expiration dates for ${symbol}:`, expirationDates);
      
      return expirationDates;
    } catch (error) {
      console.error('Error getting expiration dates:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please re-authenticate.');
        }
        
        // Handle specific E*TRADE error codes
        const errorMessage = error.response?.data || error.message;
        if (typeof errorMessage === 'string') {
          if (errorMessage.includes('10032') || errorMessage.includes('No options are available')) {
            throw new Error(`No options are available for symbol ${symbol}.`);
          }
          if (errorMessage.includes('10044') || errorMessage.includes('no options available for the given symbol')) {
            throw new Error(`No options are available for ${symbol}.`);
          }
          if (errorMessage.includes('10033') || errorMessage.includes('invalid')) {
            throw new Error(`Invalid symbol: ${symbol}. Please enter another symbol.`);
          }
          if (errorMessage.includes('10036') || errorMessage.includes('Error getting the ExpirationDates')) {
            throw new Error(`Error getting expiration dates for ${symbol}.`);
          }
        }
        
        throw new Error(`Failed to get expiration dates for ${symbol}: ${error.response?.status} ${errorMessage}`);
      }
      throw new Error(`Failed to get expiration dates for ${symbol}`);
    }
  }

  isAuthenticated(sessionId: string): boolean {
    return this.accessTokens.has(sessionId);
  }

  clearSession(sessionId: string): void {
    this.requestTokens.delete(sessionId);
    this.accessTokens.delete(sessionId);
  }

  async getAccountList(sessionId: string): Promise<AccountInfo[]> {
    try {
      const accessToken = await this.ensureValidToken(sessionId);
      const url = `${this.getApiBaseUrl()}/v1/accounts/list`;
      
      const authHeader = this.createAuthHeader('GET', url, accessToken);

      const response = await axios.get(url, {
        headers: {
          Authorization: authHeader
        }
      });

      const responseData = response.data as AccountListResponse;
      
      // Handle both potential response formats
      const accounts = responseData.AccountListResponse?.Accounts?.Account || responseData?.Accounts?.Account || [];
      
      return accounts;
    } catch (error) {
      console.error('Error getting account list:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please re-authenticate.');
        }
        throw new Error(`Failed to get account list: ${error.response?.status} ${error.response?.data || error.message}`);
      }
      throw new Error('Failed to get account list from E*TRADE');
    }
  }

  // Helper method for delay
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Helper method for retry logic with exponential backoff
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Check if it's a rate limit error
        const isRateLimit = axios.isAxiosError(error) && 
          (error.response?.status === 429 || 
           error.response?.status === 400 && 
           error.response?.data?.toString().includes('rate limit'));
        
        if (!isRateLimit || attempt === maxRetries) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Rate limit hit, retrying in ${delay}ms (attempt ${attempt + 1}/${maxRetries + 1})`);
        await this.delay(delay);
      }
    }
    
    throw lastError!;
  }

  async getAllTransactions(
    sessionId: string,
    accountIdKey: string,
    options?: {
      startDate?: string; // MMDDYYYY format
      endDate?: string;   // MMDDYYYY format
      sortOrder?: 'ASC' | 'DESC';
      maxPages?: number; // Maximum pages to fetch (safety limit)
      pageDelay?: number; // Delay between pages in milliseconds
    }
  ): Promise<TransactionListResponse> {
    try {
      const allTransactions: any[] = [];
      let currentMarker: string | undefined = undefined;
      let totalCount = 0;
      let pageCount = 0;
      const maxPages = options?.maxPages || 20; // Safety limit to prevent infinite loops
      const pageDelay = options?.pageDelay || 1500; // Default 1.5 second delay between pages
      
      console.log(`Starting to fetch all transactions (max ${maxPages} pages, ${pageDelay}ms delay)...`);
      
      while (pageCount < maxPages) {
        console.log(`Fetching page ${pageCount + 1}/${maxPages}...`);
        
        // Add delay between requests (except for the first one)
        if (pageCount > 0) {
          console.log(`Waiting ${pageDelay}ms before next request...`);
          await this.delay(pageDelay);
        }
        
        const pageResult = await this.retryWithBackoff(async () => {
          return this.getTransactions(sessionId, accountIdKey, {
            startDate: options?.startDate,
            endDate: options?.endDate,
            sortOrder: options?.sortOrder,
            marker: currentMarker,
            count: 50 // Use max page size for efficiency
          });
        });
        
        if (pageResult.Transaction && pageResult.Transaction.length > 0) {
          allTransactions.push(...pageResult.Transaction);
          console.log(`Page ${pageCount + 1}: Added ${pageResult.Transaction.length} transactions (total: ${allTransactions.length})`);
        } else {
          console.log(`Page ${pageCount + 1}: No transactions returned`);
        }
        
        // Update total count from first page
        if (pageCount === 0) {
          totalCount = pageResult.totalCount || 0;
          console.log(`Expected total transactions: ${totalCount}`);
        }
        
        pageCount++;
        
        // Check if there are more pages
        if (!pageResult.moreTransactions || !pageResult.marker) {
          console.log(`No more pages available after page ${pageCount}`);
          break;
        }
        
        currentMarker = pageResult.marker;
        console.log(`Next page marker: ${currentMarker}`);
      }
      
      console.log(`Completed fetching ${pageCount} pages with ${allTransactions.length} total transactions`);
      
      return {
        Transaction: allTransactions,
        transactionCount: allTransactions.length,
        totalCount: totalCount,
        moreTransactions: false,
        pageMarkers: '',
        next: undefined,
        marker: undefined
      };
    } catch (error) {
      console.error('Error getting all transactions:', error);
      throw error;
    }
  }

  async getTransactions(
    sessionId: string,
    accountIdKey: string,
    options?: {
      startDate?: string; // MMDDYYYY format
      endDate?: string;   // MMDDYYYY format
      sortOrder?: 'ASC' | 'DESC';
      marker?: string;
      count?: number; // 1-50, defaults to 50
    }
  ): Promise<TransactionListResponse> {
    try {
      const accessToken = await this.ensureValidToken(sessionId);
      
      let url = `${this.getApiBaseUrl()}/v1/accounts/${encodeURIComponent(accountIdKey)}/transactions`;
      const queryParams: string[] = [];
      
      if (options) {
        if (options.startDate) queryParams.push(`startDate=${options.startDate}`);
        if (options.endDate) queryParams.push(`endDate=${options.endDate}`);
        if (options.sortOrder) queryParams.push(`sortOrder=${options.sortOrder}`);
        if (options.marker) queryParams.push(`marker=${encodeURIComponent(options.marker)}`);
        if (options.count) queryParams.push(`count=${options.count}`);
      }
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }

      const authHeader = this.createAuthHeader('GET', url, accessToken);

      // Use retry logic for the API call
      const response = await this.retryWithBackoff(async () => {
        return axios.get(url, {
          headers: {
            Authorization: authHeader
          }
        });
      });

      console.log(`Transactions API response for account ${accountIdKey}:`, JSON.stringify(response.data, null, 2));

      const responseData = response.data as TransactionListResponse;
      
      // Normalize response format - handle both JSON and XML response structures
      const normalizedResponse: TransactionListResponse = {};
      
      if (responseData.TransactionListResponse) {
        // XML format wrapper
        normalizedResponse.Transaction = responseData.TransactionListResponse.Transaction || [];
        normalizedResponse.pageMarkers = responseData.TransactionListResponse.pageMarkers;
        normalizedResponse.moreTransactions = responseData.TransactionListResponse.moreTransactions;
        normalizedResponse.transactionCount = responseData.TransactionListResponse.transactionCount;
        normalizedResponse.totalCount = responseData.TransactionListResponse.totalCount;
        normalizedResponse.next = responseData.TransactionListResponse.next;
        normalizedResponse.marker = responseData.TransactionListResponse.marker;
      } else {
        // Direct JSON format
        normalizedResponse.Transaction = responseData.Transaction || [];
        normalizedResponse.pageMarkers = responseData.pageMarkers;
        normalizedResponse.moreTransactions = responseData.moreTransactions;
        normalizedResponse.transactionCount = responseData.transactionCount;
        normalizedResponse.totalCount = responseData.totalCount;
        normalizedResponse.next = responseData.next;
        normalizedResponse.marker = responseData.marker;
      }

      return normalizedResponse;
    } catch (error) {
      console.error('Error getting transactions:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please re-authenticate.');
        }
        if (error.response?.status === 204) {
          // No results
          return { Transaction: [] };
        }
        
        const errorMessage = error.response?.data || error.message;
        throw new Error(`Failed to get transactions: ${error.response?.status} ${errorMessage}`);
      }
      throw new Error('Failed to get transactions from E*TRADE');
    }
  }

  async getTransactionDetails(
    sessionId: string,
    accountIdKey: string,
    transactionId: string,
    storeId?: string
  ): Promise<TransactionDetailsResponse> {
    try {
      const accessToken = await this.ensureValidToken(sessionId);
      
      let url = `${this.getApiBaseUrl()}/v1/accounts/${encodeURIComponent(accountIdKey)}/transactions/${encodeURIComponent(transactionId)}`;
      
      if (storeId) {
        url += `?storeId=${encodeURIComponent(storeId)}`;
      }

      const authHeader = this.createAuthHeader('GET', url, accessToken);

      const response = await axios.get(url, {
        headers: {
          Authorization: authHeader
        }
      });

      console.log(`Transaction details API response for transaction ${transactionId}:`, JSON.stringify(response.data, null, 2));

      const responseData = response.data as TransactionDetailsResponse;
      
      // Normalize response format - handle both JSON and XML response structures
      if (responseData.TransactionDetailsResponse) {
        // XML format wrapper
        return responseData.TransactionDetailsResponse;
      } else {
        // Direct JSON format
        return responseData;
      }
    } catch (error) {
      console.error('Error getting transaction details:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please re-authenticate.');
        }
        if (error.response?.status === 204) {
          throw new Error('No transaction details found for the specified transaction ID.');
        }
        
        const errorMessage = error.response?.data || error.message;
        throw new Error(`Failed to get transaction details: ${error.response?.status} ${errorMessage}`);
      }
      throw new Error('Failed to get transaction details from E*TRADE');
    }
  }

  async getOrders(
    sessionId: string,
    accountIdKey: string,
    options?: {
      marker?: string;
      count?: number; // 1-25, defaults to 25
      status?: 'OPEN' | 'EXECUTED' | 'CANCELLED' | 'INDIVIDUAL_FILLS' | 'CANCEL_REQUESTED' | 'EXPIRED' | 'REJECTED';
      fromDate?: string; // MMDDYYYY format
      toDate?: string;   // MMDDYYYY format
      symbol?: string;
      securityType?: 'EQ' | 'OPTN' | 'MMF' | 'BOND';
      transactionType?: 'ATNM' | 'BUY' | 'SELL' | 'BUY_TO_COVER' | 'SELL_SHORT';
      marketSession?: 'REGULAR' | 'EXTENDED';
    }
  ): Promise<OrdersResponse> {
    try {
      const accessToken = await this.ensureValidToken(sessionId);
      
      let url = `${this.getApiBaseUrl()}/v1/accounts/${encodeURIComponent(accountIdKey)}/orders`;
      const queryParams: string[] = [];
      
      if (options) {
        if (options.marker) queryParams.push(`marker=${encodeURIComponent(options.marker)}`);
        if (options.count) queryParams.push(`count=${options.count}`);
        if (options.status) queryParams.push(`status=${options.status}`);
        if (options.fromDate) queryParams.push(`fromDate=${options.fromDate}`);
        if (options.toDate) queryParams.push(`toDate=${options.toDate}`);
        if (options.symbol) queryParams.push(`symbol=${encodeURIComponent(options.symbol)}`);
        if (options.securityType) queryParams.push(`securityType=${options.securityType}`);
        if (options.transactionType) queryParams.push(`transactionType=${options.transactionType}`);
        if (options.marketSession) queryParams.push(`marketSession=${options.marketSession}`);
      }
      
      if (queryParams.length > 0) {
        url += `?${queryParams.join('&')}`;
      }

      const authHeader = this.createAuthHeader('GET', url, accessToken);

      // Use retry logic for the API call
      const response = await this.retryWithBackoff(async () => {
        return axios.get(url, {
          headers: {
            Authorization: authHeader
          }
        });
      });

      console.log(`Orders API response for account ${accountIdKey}:`, JSON.stringify(response.data, null, 2));

      const responseData = response.data as OrdersResponse;
      
      // Normalize response format - handle both JSON and XML response structures
      const normalizedResponse: OrdersResponse = {};
      
      if (responseData.OrdersResponse) {
        // XML format wrapper
        normalizedResponse.Order = responseData.OrdersResponse.Order || [];
        normalizedResponse.marker = responseData.OrdersResponse.marker;
        normalizedResponse.moreOrders = responseData.OrdersResponse.moreOrders;
        normalizedResponse.next = responseData.OrdersResponse.next;
      } else {
        // Direct JSON format
        normalizedResponse.Order = responseData.Order || [];
        normalizedResponse.marker = responseData.marker;
        normalizedResponse.moreOrders = responseData.moreOrders;
        normalizedResponse.next = responseData.next;
      }

      return normalizedResponse;
    } catch (error) {
      console.error('Error getting orders:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          throw new Error('Authentication failed. Please re-authenticate.');
        }
        if (error.response?.status === 204) {
          // No orders found - this is normal, return empty response
          return {
            Order: [],
            marker: undefined,
            moreOrders: false,
            next: undefined
          };
        }
        
        const errorMessage = error.response?.data || error.message;
        throw new Error(`Failed to get orders: ${error.response?.status} ${errorMessage}`);
      }
      throw new Error('Failed to get orders from E*TRADE');
    }
  }

  async getAllOrders(
    sessionId: string,
    accountIdKey: string,
    options?: {
      status?: 'OPEN' | 'EXECUTED' | 'CANCELLED' | 'INDIVIDUAL_FILLS' | 'CANCEL_REQUESTED' | 'EXPIRED' | 'REJECTED';
      fromDate?: string; // MMDDYYYY format
      toDate?: string;   // MMDDYYYY format
      symbol?: string;
      securityType?: 'EQ' | 'OPTN' | 'MMF' | 'BOND';
      transactionType?: 'ATNM' | 'BUY' | 'SELL' | 'BUY_TO_COVER' | 'SELL_SHORT';
      marketSession?: 'REGULAR' | 'EXTENDED';
      maxPages?: number; // Maximum pages to fetch (safety limit)
      pageDelay?: number; // Delay between pages in milliseconds
    }
  ): Promise<OrdersResponse> {
    try {
      const allOrders: any[] = [];
      let currentMarker: string | undefined = undefined;
      let pageCount = 0;
      const maxPages = options?.maxPages || 10; // Safety limit for orders (usually fewer pages than transactions)
      const pageDelay = options?.pageDelay || 1000; // Default 1 second delay between pages
      
      console.log(`Starting to fetch all orders (max ${maxPages} pages, ${pageDelay}ms delay)...`);
      
      while (pageCount < maxPages) {
        console.log(`Fetching orders page ${pageCount + 1}/${maxPages}...`);
        
        // Add delay between requests (except for the first one)
        if (pageCount > 0) {
          console.log(`Waiting ${pageDelay}ms before next request...`);
          await this.delay(pageDelay);
        }
        
        const pageResult = await this.retryWithBackoff(async () => {
          return this.getOrders(sessionId, accountIdKey, {
            status: options?.status,
            fromDate: options?.fromDate,
            toDate: options?.toDate,
            symbol: options?.symbol,
            securityType: options?.securityType,
            transactionType: options?.transactionType,
            marketSession: options?.marketSession,
            marker: currentMarker,
            count: 25 // Use max page size for efficiency
          });
        });
        
        if (pageResult.Order && pageResult.Order.length > 0) {
          allOrders.push(...pageResult.Order);
          console.log(`Page ${pageCount + 1}: Added ${pageResult.Order.length} orders (total: ${allOrders.length})`);
        } else {
          console.log(`Page ${pageCount + 1}: No orders returned`);
        }
        
        pageCount++;
        
        // Check if there are more pages
        if (!pageResult.moreOrders || !pageResult.marker) {
          console.log(`No more pages available after page ${pageCount}`);
          break;
        }
        
        currentMarker = pageResult.marker;
        console.log(`Next page marker: ${currentMarker}`);
      }
      
      console.log(`Completed fetching ${pageCount} pages with ${allOrders.length} total orders`);
      
      return {
        Order: allOrders,
        marker: undefined,
        moreOrders: false,
        next: undefined
      };
    } catch (error) {
      console.error('Error getting all orders:', error);
      throw error;
    }
  }
}

export const etradeService = new ETradeService();

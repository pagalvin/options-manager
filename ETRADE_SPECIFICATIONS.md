# E*TRADE Integration Specifications

This document describes how E*TRADE authentication and API access work in this application, including the end-to-end auth flow, internal backend endpoints, external E*TRADE endpoints, and the data contracts involved.

## Overview
- OAuth 1.0a Out-Of-Band (OOB) flow is used for authenticating with E*TRADE.
- The backend manages request/access tokens and signs all E*TRADE API calls.
- The frontend stores a short-lived sessionId in localStorage and passes it via X-Session-ID to the backend for authenticated requests.
- Environment can be switched between SANDBOX and LIVE. Switching clears tokens and requires re-authentication.

## Auth Flow (Step-by-step)
1) Initiate
- Frontend calls POST /api/etrade/auth/initiate
- Backend requests a request_token from E*TRADE and returns:
  - sessionId: UUID used to track the session in-memory
  - authUrl: E*TRADE authorization URL (includes consumer key and oauth_token)
- Frontend opens authUrl in a new window, where the user logs in and authorizes access, then receives a verification code (PIN)

2) Complete
- User pastes the verification code back into the app.
- Frontend calls POST /api/etrade/auth/complete with { sessionId, verifier }
- Backend exchanges the request token + verifier for an access token and stores it in-memory keyed by sessionId
- Frontend marks the session as authenticated and persists sessionId in localStorage as etrade_session_id

3) Use
- For E*TRADE-backed features, the frontend includes X-Session-ID header with the stored sessionId
- Backend checks session, ensures token is valid (or renews if inactive), and signs outbound requests to E*TRADE

4) Renew (transparently)
- If a backend call detects inactivity over 2 hours, it attempts GET oauth/renew_access_token
- If renewal fails or token is expired (midnight ET), client must re-authenticate

5) Logout
- Frontend calls POST /api/etrade/auth/logout with { sessionId }
- Backend clears tokens mapped to the sessionId; frontend removes etrade_session_id

## Internal Backend APIs (Auth + Environment)
Base path: /api/etrade

- POST /auth/initiate
  - Purpose: Start OAuth 1.0a flow
  - Response: { sessionId: string, authUrl: string }

- POST /auth/complete
  - Purpose: Exchange verifier for access token
  - Body: { sessionId: string, verifier: string }
  - Response: { success: true, authenticated: true, sessionId }

- POST /auth/renew
  - Purpose: Renew access token after inactivity
  - Body: { sessionId: string }
  - Response: { success: true, renewed: true, sessionId }

- GET /auth/status/:sessionId
  - Purpose: Check if sessionId is authenticated
  - Response: { authenticated: boolean }

- POST /auth/logout
  - Purpose: Clear tokens for a session
  - Body: { sessionId: string }
  - Response: { success: true }

- GET /environment
  - Purpose: Read current environment and credential status
  - Response: { environment: 'SANDBOX' | 'LIVE', baseUrl: string, credentialsAvailable: boolean, authenticated: boolean }

- POST /environment
  - Purpose: Switch between SANDBOX and LIVE
  - Body: { sandbox: boolean }
  - Response: { success: true, environment: 'SANDBOX' | 'LIVE', baseUrl: string }

Headers for authenticated requests:
- X-Session-ID: string (required for all protected endpoints below)

## Internal Backend APIs (Data)
- GET /quote/:symbol
- GET /lookup/:search
- GET /options/:symbol
  - Optional query: expiryYear, expiryMonth, expiryDay
- GET /options/:symbol/expirations
  - Optional query: expiryType=UNSPECIFIED|DAILY|WEEKLY|MONTHLY|QUARTERLY|VIX|ALL|MONTHEND
- GET /accounts
- GET /accounts/:accountIdKey/transactions
  - Query: symbol?, startDate?, endDate?, count?, sortOrder?, marker?
- GET /accounts/:accountIdKey/transactions/all
  - Query: symbol?, startDate?, endDate?, sortOrder?, maxPages?, pageDelay?
- GET /accounts/:accountIdKey/transactions/:transactionId
- GET /accounts/:accountIdKey/orders
  - Query: marker?, count?, status?, fromDate?, toDate?, symbol?, securityType?, transactionType?, marketSession?
- GET /accounts/:accountIdKey/orders/all
  - Query: status?, fromDate?, toDate?, symbol?, securityType?, transactionType?, marketSession?, maxPages?, pageDelay?
- GET /accounts/:accountIdKey/portfolio
  - Query: count?, sortBy?, sortOrder?, pageNumber?, marketSession?, totalsRequired?, lotsRequired?, view?

Note: All endpoints above require X-Session-ID and will return 401 if missing/unauthenticated.

## External E*TRADE APIs Used
- OAuth
  - GET /oauth/request_token
  - GET /oauth/access_token
  - GET /oauth/renew_access_token
- Market
  - GET /v1/market/quote/{symbol}?requireEarningsDate=true
  - GET /v1/market/lookup/{search}
  - GET /v1/market/optionchains?symbol={symbol}&... (expiryYear, expiryMonth, expiryDay, chainType, etc.)
  - GET /v1/market/optionexpiredate?symbol={symbol}&expiryType={type}
- Accounts
  - GET /v1/accounts/list
  - GET /v1/accounts/{accountIdKey}/portfolio?... (count, sortBy, view, etc.)
  - GET /v1/accounts/{accountIdKey}/transactions?... (pagination via marker)
  - GET /v1/accounts/{accountIdKey}/transactions/{transactionId}
  - GET /v1/accounts/{accountIdKey}/orders?... (pagination via marker)

All outbound requests are signed with OAuth 1.0a HMAC-SHA1. The backend normalizes differing JSON/XML response shapes.

## Data Contracts

### Auth
- POST /auth/initiate → 200
  - { sessionId: string, authUrl: string }
- POST /auth/complete (body)
  - { sessionId: string, verifier: string }
- POST /auth/complete → 200
  - { success: true, authenticated: true, sessionId: string }
- POST /auth/renew (body)
  - { sessionId: string }
- POST /auth/renew → 200
  - { success: true, renewed: true, sessionId: string }
- GET /auth/status/:sessionId → 200
  - { authenticated: boolean }
- POST /auth/logout (body)
  - { sessionId: string }
- POST /auth/logout → 200
  - { success: true }

Errors: 400 for missing inputs; 401 for unauthenticated when required; 500 with { error, message? } on backend errors.

### Environment
- GET /environment → 200
  - { environment: 'SANDBOX' | 'LIVE', baseUrl: string, credentialsAvailable: boolean, authenticated: boolean }
- POST /environment (body)
  - { sandbox: boolean }
- POST /environment → 200
  - { success: true, environment: 'SANDBOX' | 'LIVE', baseUrl: string }

### Quotes
- GET /quote/:symbol → 200
  - Mirrors E*TRADE quoteResponse; normalized types in frontend under `ETradeStockQuote`.

### Option Chains
- GET /options/:symbol[?expiryYear=&expiryMonth=&expiryDay=] → 200
  - Returns `OptionChainResponse` or normalized `optionPairs/selected`; frontend handles both.

- GET /options/:symbol/expirations → 200
  - { expirationDates: Array<{ year: number; month: number; day: number; expiryType: string }>} (normalized)

### Accounts & Portfolio
- GET /accounts → 200
  - Array<{ accountId, accountIdKey, accountName, accountType, institutionType, accountStatus }>
- GET /accounts/:accountIdKey/portfolio → 200
  - PortfolioResponse; the service supports multiple views (PERFORMANCE, FUNDAMENTAL, OPTIONSWATCH, QUICK, COMPLETE)

### Transactions
- GET /accounts/:accountIdKey/transactions → 200
  - TransactionListResponse (normalized) with Transaction[], moreTransactions, marker
- GET /accounts/:accountIdKey/transactions/:transactionId → 200
  - TransactionDetailsResponse (normalized)

### Orders
- GET /accounts/:accountIdKey/orders → 200
  - OrdersResponse (normalized) with Order[], moreOrders, marker

### Headers
- X-Session-ID: string (required for all authenticated endpoints)
- Content-Type: application/json (for POST bodies)

## Session & Token Management
- sessionId is a UUID created at request_token time; stored in-memory on the server
- Request tokens are mapped to sessionId until exchanged; then deleted
- Access tokens are mapped to sessionId and include:
  - key, secret, oauth_session_handle, lastActivity (ms), expiresAt (midnight ET)
- Inactivity (>2h) triggers renew_access_token on next call
- Expired tokens (after midnight ET) require full re-auth
- Environment switch calls setEnvironment(sandbox), clears request/access tokens, and forces re-auth

## Frontend Responsibilities
- Store sessionId in localStorage as `etrade_session_id`
- Include X-Session-ID on all backend calls requiring auth
- Handle 401 by clearing session and prompting re-authentication
- Provide UI for environment switching and clear session on environment change

## Security Notes
- Consumer keys/secrets are loaded from environment variables; never stored in the frontend
- All E*TRADE requests are server-side and signed; client never sees tokens or secrets
- Session is in-memory only; restart clears sessions and requires re-authentication

## References
- Frontend: `frontend/src/pages/ETrade.tsx`, `frontend/src/lib/etradeAPI.ts`, `frontend/src/types/etrade.ts`
- Backend: `backend/src/routes/etrade.ts`, `backend/src/services/etradeService.ts`

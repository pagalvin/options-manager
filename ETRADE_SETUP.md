# E*TRADE Integration Setup

This project includes integration with E*TRADE's API to fetch real-time stock quotes and option chains. Follow these steps to set up the integration:

## Prerequisites

1. **E*TRADE Developer Account**: You need an E*TRADE brokerage account and access to their Developer API.
2. **API Keys**: Register your application at https://developer.etrade.com/ to get your consumer key and secret.

## Setup Instructions

### 1. Get E*TRADE API Credentials

1. Visit https://developer.etrade.com/
2. Log in with your E*TRADE account credentials
3. Create a new application and get your:
   - Consumer Key
   - Consumer Secret

### 2. Configure Environment Variables

1. Copy the example environment file:
   ```powershell
   Copy-Item backend\.env.example backend\.env
   ```

2. Edit `backend\.env` and add your E*TRADE credentials:
   ```env
   ETRADE_CONSUMER_KEY=your_actual_consumer_key
   ETRADE_CONSUMER_SECRET=your_actual_consumer_secret
   ETRADE_SANDBOX_URL=https://etwssandbox.etrade.com
   ETRADE_BASE_URL=https://api.etrade.com
   FRONTEND_URL=http://localhost:5173
   ```

### 3. OAuth Callback Configuration

In your E*TRADE Developer Console, configure the OAuth callback URL to:
```
http://localhost:3001/api/etrade/auth/callback
```

For production, update this to your actual domain.

## Usage

### Authentication Flow

1. Navigate to the E*TRADE page in the application
2. Click "Connect to E*TRADE"
3. You'll be redirected to E*TRADE's OAuth page
4. Log in with your E*TRADE credentials
5. Grant permission to the application
6. You'll be redirected back to the application with authentication complete

### Features Available

Once authenticated, you can:

- **Get Real-time Stock Quotes**: Enter a stock symbol to get current price, bid/ask, volume, and other market data
- **View Option Chains**: See all available options for a stock with real-time pricing
- **Filter by Expiration**: Select specific expiration dates to view options
- **Options Data**: View bid/ask prices, volume, open interest, implied volatility, and Greeks

### Data Available

**Stock Quotes:**
- Last trade price
- Bid/Ask prices and sizes
- Daily change and percentage change
- Volume
- Day's high/low range

**Option Chain:**
- Strike prices
- Bid/Ask prices
- Last trade price
- Volume and Open Interest
- Implied Volatility
- Greeks (Delta, Gamma, Theta, Vega, Rho)
- Time to expiration
- Intrinsic value

## Important Notes

### Sandbox vs Production

- The integration is currently configured to use E*TRADE's **sandbox environment**
- Sandbox provides test data and doesn't require real trades
- To switch to production, change `ETRADE_SANDBOX_URL` to `ETRADE_BASE_URL` in the service configuration

### Rate Limits

E*TRADE has API rate limits:
- Market data: ~1000 calls per hour
- Different endpoints have different limits
- The application includes error handling for rate limit responses

### Data Delays

- Sandbox data may be delayed or simulated
- Production API provides real-time data during market hours
- After-hours data may be delayed

### Security

- OAuth tokens are stored in memory and localStorage
- Tokens expire and require re-authentication
- Never commit your actual API keys to version control

## Troubleshooting

### Common Issues

1. **"Authentication failed"**
   - Check your consumer key and secret
   - Verify callback URL is configured correctly in E*TRADE Developer Console

2. **"Session expired"**
   - OAuth tokens have limited lifetime
   - Click "Disconnect" and reconnect to get fresh tokens

3. **"API call failed"**
   - Check if you've hit rate limits
   - Verify the stock symbol exists
   - Check if it's during market hours for real-time data

4. **"Failed to connect to E*TRADE"**
   - Verify environment variables are set correctly
   - Check network connectivity
   - Ensure E*TRADE API is operational

### Development Tips

- Use the browser's developer tools to monitor API calls
- Check the server console for detailed error messages
- Test with well-known symbols like AAPL, MSFT, SPY first

## API Endpoints

The following REST endpoints are available:

- `POST /api/etrade/auth/initiate` - Start OAuth flow
- `GET /api/etrade/auth/callback` - OAuth callback handler
- `GET /api/etrade/auth/status/:sessionId` - Check authentication status
- `POST /api/etrade/auth/logout` - Logout and clear session
- `GET /api/etrade/quote/:symbol` - Get stock quote
- `GET /api/etrade/options/:symbol` - Get option chain
- `GET /api/etrade/options/:symbol/expirations` - Get expiration dates

All authenticated endpoints require the `X-Session-ID` header with a valid session ID.

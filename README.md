# Options Trading ROI Tracker

A comprehensive web application for tracking options trading performance, ROI calculations, and managing your eTrade transaction data.

## Features

### Core Functionality
- **Transaction Upload**: Import eTrade CSV transaction files
- **Position Tracking**: Monitor current equity and options positions
- **ROI Analysis**: Calculate actual and potential returns
- **Performance Metrics**: Monthly premium collection and performance tracking
- **Options Management**: Track covered calls, premiums, and expiration dates
- **E*TRADE Integration**: Real-time stock quotes and option chains via E*TRADE API
- **Live Data**: Access real-time market data and option pricing

### Technical Stack
- **Frontend**: React + TypeScript + Tailwind CSS + ShadCN UI
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with "overlord" schema
- **Development**: Vite for frontend, nodemon for backend

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL (running locally)
- Git

### Database Setup
1. Create PostgreSQL database (if not exists)
2. Set database password (update .env files with your credentials)
3. Run the schema setup:
```sql
-- Connect to your PostgreSQL database and run:
\i database/schema.sql
```

### Backend Setup
```bash
cd backend
npm install
npm run build
npm run dev
```

The backend will run on http://localhost:3001

### Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

The frontend will run on http://localhost:3000

## Configuration

### Backend Environment (.env)
```
PORT=3001
DB_HOST=localhost
DB_PORT=5432
DB_NAME=postgres
DB_USER=postgres
DB_PASSWORD=your_secure_password_here
DB_SCHEMA=overlord
STOCK_API_KEY=your_api_key_here
STOCK_API_URL=https://finnhub.io/api/v1
```

### Stock Price API
The application supports multiple stock price APIs:
- **Finnhub.io** (primary) - Get free API key at https://finnhub.io/
- **Alpha Vantage** (backup) - Get free API key at https://www.alphavantage.co/
- **Yahoo Finance** (unofficial, backup)
- **Stub data** (for testing without API keys)

### E*TRADE API Integration
For real-time stock quotes and option chains, configure E*TRADE API access:
```
ETRADE_CONSUMER_KEY=your_consumer_key
ETRADE_CONSUMER_SECRET=your_consumer_secret
ETRADE_SANDBOX_URL=https://etwssandbox.etrade.com
ETRADE_BASE_URL=https://api.etrade.com
FRONTEND_URL=http://localhost:5173
```

See [ETRADE_SETUP.md](./ETRADE_SETUP.md) for detailed setup instructions.

## Usage

### Uploading Transactions
1. Download transaction history from eTrade as CSV
2. Navigate to Transactions page
3. Upload the CSV file
4. The system will automatically:
   - Parse transactions
   - Update positions
   - Track options contracts
   - Calculate ROI metrics

### Understanding eTrade CSV Format
The system expects pipe-delimited (|) CSV files with these columns:
- **Transaction Date**: Date of transaction (MM/DD/YYYY)
- **Transaction Type**: Type (Bought, Sold, Sold Short, etc.)
- **Security Type**: EQ for equity, OPTN for options
- **Calculated Symbol**: Use this for the security symbol
- **Symbol**: Complex option symbol (informational)
- **Quantity**: Number of shares/contracts
- **Amount**: Dollar amount (positive for income, negative for expenses)
- **Price**: Price per share/contract
- **Commission**: Commission paid
- **Strike**: Strike price (options only)
- **Description**: Transaction description

### Menu System
- **Dashboard**: Overview of positions, ROI, and performance
- **Transactions**: Upload and view transaction history
- **Positions**: Current equity holdings and values
- **Options**: Options positions and covered call analysis
- **Performance**: Monthly performance and ROI charts
- **Options Analyzer**: (Stubbed) Future options analysis tools
- **Admin**: Database management and system tools

## API Endpoints

### Transactions
- `POST /api/transactions/upload` - Upload CSV file
- `GET /api/transactions` - Get all transactions
- `GET /api/transactions/symbol/:symbol` - Get transactions by symbol

### Positions
- `GET /api/positions` - Get all positions
- `GET /api/positions/:symbol` - Get position by symbol
- `GET /api/positions/roi/current` - Get current ROI calculations
- `GET /api/positions/roi/closed` - Get ROI for closed positions

### Options
- `GET /api/options` - Get all options
- `GET /api/options/open` - Get open options
- `GET /api/options/symbol/:symbol` - Get options by underlying
- `GET /api/options/expiring/:days` - Get expiring options
- `GET /api/options/analysis/covered-calls` - Covered call analysis

### Performance
- `GET /api/performance/monthly` - Monthly performance data
- `GET /api/performance/total` - Total performance summary
- `GET /api/performance/premium-by-month` - Premium collection by month

### Stock Prices
- `GET /api/stock-prices/:symbol` - Get current stock price
- `POST /api/stock-prices/bulk` - Get multiple stock prices

### Admin
- `GET /api/admin/stats` - System statistics
- `DELETE /api/admin/data` - Delete all data (use with caution!)
- `GET /api/admin/validate` - Validate data integrity
- `POST /api/admin/fix` - Fix data integrity issues

## Development

### Building
```bash
# Backend
cd backend
npm run build

# Frontend
cd frontend
npm run build
```

### Running in Production
```bash
# Backend (serves both API and frontend)
cd backend
npm start
```

## Database Schema

### Key Tables
- **transactions**: All trading activity
- **positions**: Current equity holdings
- **options**: Options contracts and premiums
- **securities**: Master list of securities
- **monthly_performance**: Aggregated monthly metrics

### Data Relationships
- Options link to underlying securities
- Positions track current holdings
- Transactions update positions automatically
- Monthly performance is calculated from transactions

## Security Note
This application is designed for local use only. There is no authentication or security layer as specified in the requirements. Do not expose this to the internet without adding proper security measures.

## Troubleshooting

### Common Issues
1. **Database connection fails**: Check PostgreSQL is running and credentials are correct
2. **CSV upload fails**: Ensure file is pipe-delimited and matches eTrade format
3. **Stock prices not loading**: Check API keys and network connectivity
4. **Duplicate transactions**: The system prevents duplicates automatically

### Database Issues
Use the Admin panel to:
- Check system statistics
- Validate data integrity
- Fix common data issues
- Reset database sequences
- Create data backups

## Contributing

This is a personal project. Feel free to fork and modify for your own use.

## License

Private use only.

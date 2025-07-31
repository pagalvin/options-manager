# Options Trading ROI Tracker - High-Level Architecture Diagram

## System Overview
```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                              OPTIONS TRADING ROI TRACKER                            │
│                                                                                     │
│  ┌─────────────────────┐         ┌─────────────────────┐         ┌─────────────────┐ │
│  │     FRONTEND        │         │      BACKEND        │         │    DATABASE     │ │
│  │   (React + TS)      │◄────────┤   (Express + TS)    │◄────────┤   PostgreSQL    │ │
│  │     Port 3000       │  HTTP   │     Port 3001       │  SQL    │  "overlord"     │ │
│  └─────────────────────┘ Requests└─────────────────────┘ Queries └─────────────────┘ │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

## Detailed Component Architecture

### 1. FRONTEND LAYER (React + TypeScript + Tailwind CSS)
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                FRONTEND                                          │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │
│  │   COMPONENTS    │  │      PAGES      │  │   SHARED LIBS   │                   │
│  │                 │  │                 │  │                 │                   │
│  │ • Navigation    │  │ • Dashboard     │  │ • API Client    │                   │
│  │ • FinancialLinks│  │ • Transactions  │  │ • Utils         │                   │
│  │ • UI Components │  │ • Positions     │  │ • Types         │                   │
│  │   - Button      │  │ • Options       │  │ • E*TRADE API   │                   │
│  │   - Card        │  │ • Performance   │  │                 │                   │
│  │   - Input       │  │ • ETrade        │  │                 │                   │
│  │                 │  │ • OptionsAnalyz │  │                 │                   │
│  │                 │  │ • SymbolDetail  │  │                 │                   │
│  │                 │  │ • TransAnalysis │  │                 │                   │
│  │                 │  │ • Admin         │  │                 │                   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                   │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 2. BACKEND LAYER (Express + TypeScript)
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                 BACKEND                                          │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │
│  │     ROUTES      │  │    SERVICES     │  │   UTILITIES     │                   │
│  │                 │  │                 │  │                 │                   │
│  │ • Admin         │  │ • AdminService  │  │ • Database      │                   │
│  │ • Analyzer      │  │ • ETradeService │  │ • Types         │                   │
│  │ • ETrade        │  │ • OptionService │  │ • Server        │                   │
│  │ • ManualOptions │  │ • PerformService│  │                 │                   │
│  │ • Options       │  │ • PositionSvc   │  │                 │                   │
│  │ • Performance   │  │ • StockPriceSvc │  │                 │                   │
│  │ • Positions     │  │ • TransactionSvc│  │                 │                   │
│  │ • StockPrices   │  │                 │  │                 │                   │
│  │ • StrikePrice   │  │                 │  │                 │                   │
│  │ • Transactions  │  │                 │  │                 │                   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                   │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 3. DATABASE LAYER (PostgreSQL with "overlord" schema)
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                     │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ CORE ENTITIES   │  │  RELATIONSHIPS  │  │   ANALYTICS     │                   │
│  │                 │  │                 │  │                 │                   │
│  │ • securities    │  │ positions ──────┤ • monthly_perf   │                   │
│  │   - id          │  │    ↓            │  │   - year/month  │                   │
│  │   - symbol      │  │ securities      │  │   - premium     │                   │
│  │   - name        │  │    ↓            │  │   - roi         │                   │
│  │   - type        │  │ options ────────┤   - gains       │                   │
│  │                 │  │    ↓            │  │                 │                   │
│  │ • transactions  │  │ underlying_sym  │  │                 │                   │
│  │   - date        │  │                 │  │                 │                   │
│  │   - type        │  │                 │  │                 │                   │
│  │   - symbol      │  │                 │  │                 │                   │
│  │   - quantity    │  │                 │  │                 │                   │
│  │   - amount      │  │                 │  │                 │                   │
│  │   - price       │  │                 │  │                 │                   │
│  │                 │  │                 │  │                 │                   │
│  │ • positions     │  │                 │  │                 │                   │
│  │   - symbol      │  │                 │  │                 │                   │
│  │   - quantity    │  │                 │  │                 │                   │
│  │   - avg_cost    │  │                 │  │                 │                   │
│  │   - total_inv   │  │                 │  │                 │                   │
│  │                 │  │                 │  │                 │                   │
│  │ • options       │  │                 │  │                 │                   │
│  │   - underlying  │  │                 │  │                 │                   │
│  │   - strike      │  │                 │  │                 │                   │
│  │   - expiration  │  │                 │  │                 │                   │
│  │   - type        │  │                 │  │                 │                   │
│  │   - premium     │  │                 │  │                 │                   │
│  │   - status      │  │                 │  │                 │                   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                   │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Data Flow Architecture

### CSV Upload & Processing Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   E*TRADE   │    │  FRONTEND   │    │   BACKEND   │    │  DATABASE   │
│   CSV File  │    │ Transactions│    │Transaction  │    │   Tables    │
│             │    │    Page     │    │   Service   │    │             │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │ 1. User uploads   │                   │                   │
       ├──────────────────►│                   │                   │
       │                   │ 2. POST /upload   │                   │
       │                   ├──────────────────►│                   │
       │                   │                   │ 3. Parse CSV      │
       │                   │                   │ 4. Process each   │
       │                   │                   │    transaction    │
       │                   │                   ├──────────────────►│
       │                   │                   │ 5. Insert trans   │
       │                   │                   │ 6. Update positions│
       │                   │                   │ 7. Update options │
       │                   │ 8. Return summary │                   │
       │                   │◄──────────────────┤                   │
       │                   │ 9. Show results   │                   │
```

### Real-time Data Flow
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   USER      │    │  FRONTEND   │    │   BACKEND   │    │  DATABASE   │
│ INTERFACE   │    │   PAGES     │    │   ROUTES    │    │   QUERIES   │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │                   │
       │ View Dashboard    │                   │                   │
       ├──────────────────►│ GET /positions    │                   │
       │                   ├──────────────────►│ Complex JOIN      │
       │                   │                   ├──────────────────►│
       │                   │                   │ ROI Calculations  │
       │                   │                   │◄──────────────────┤
       │                   │ Position Summary  │                   │
       │                   │◄──────────────────┤                   │
       │ Display Results   │                   │                   │
       │◄──────────────────┤                   │                   │
```

## Key Features & Integrations

### 1. CORE FUNCTIONALITY
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                             CORE FEATURES                                       │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │
│  │ TRANSACTION     │  │   POSITION      │  │    OPTIONS      │                   │
│  │ MANAGEMENT      │  │   TRACKING      │  │   ANALYSIS      │                   │
│  │                 │  │                 │  │                 │                   │
│  │ • CSV Import    │  │ • Current Holds │  │ • Covered Calls │                   │
│  │ • Duplicate     │  │ • ROI Tracking  │  │ • Premium Track │                   │
│  │   Prevention    │  │ • P&L Calc      │  │ • Strike Analysis│                   │
│  │ • Data Validation│  │ • Auto Updates  │  │ • Expiration    │                   │
│  │ • Transaction   │  │ • Real-time Val │  │ • Greeks (stub) │                   │
│  │   History       │  │                 │  │                 │                   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                   │
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │
│  │  PERFORMANCE    │  │   ANALYTICS     │  │    ADMIN        │                   │
│  │   METRICS       │  │   REPORTING     │  │   TOOLS         │                   │
│  │                 │  │                 │  │                 │                   │
│  │ • Monthly ROI   │  │ • Symbol Detail │  │ • Data Cleanup  │                   │
│  │ • Premium Track │  │ • Trend Analysis│  │ • Integrity     │                   │
│  │ • Realized Gains│  │ • Charts (stub) │  │   Checks        │                   │
│  │ • Unrealized    │  │ • Reports       │  │ • Backup Tools  │                   │
│  │   Gains         │  │                 │  │ • Reset Options │                   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                   │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

### 2. EXTERNAL INTEGRATIONS
```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                           EXTERNAL INTEGRATIONS                                 │
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                   │
│  │    E*TRADE      │  │  STOCK PRICES   │  │   FUTURE APIs   │                   │
│  │      API        │  │    SOURCES      │  │   (PLANNED)     │                   │
│  │                 │  │                 │  │                 │                   │
│  │ • OAuth Auth    │  │ • Finnhub API   │  │ • Real-time     │                   │
│  │ • Market Data   │  │ • Yahoo Finance │  │   Market Data   │                   │
│  │ • Option Chains │  │ • Stub Data     │  │ • News Feeds    │                   │
│  │ • Quotes        │  │ • Price Updates │  │ • Alerts        │                   │
│  │ • Product Lookup│  │                 │  │ • Notifications │                   │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                   │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

## Security & Architecture Notes

### Security Model
- **Local Development Only**: No authentication layer (as per requirements)
- **Environment Variables**: Sensitive data in .env files
- **Input Validation**: SQL injection prevention via parameterized queries
- **CORS**: Configured for localhost development

### Scalability Considerations
- **Modular Services**: Each service handles specific business logic
- **Database Indexes**: Optimized for common query patterns
- **API Separation**: Clear separation between frontend and backend
- **TypeScript**: Type safety across the entire stack

### Development Setup
```
1. Database: PostgreSQL with "overlord" schema
2. Backend: npm run dev (auto-restart on changes)
3. Frontend: npm run dev (hot reload)
4. Build: Production builds available for both layers
```

This architecture supports the core goal of tracking options trading ROI with emphasis on covered calls, while providing a solid foundation for future enhancements.

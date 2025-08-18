# Gemini AI Chat Integration

This project now includes Google Gemini AI integration for intelligent options trading analysis and covered call decision support.

## Features

### 1. General Options Trading Chat
- Access via the "AI Chat" button in the navigation or at `/chat`
- Ask general questions about options trading, strategies, and market analysis
- Powered by Google Gemini with search capabilities for up-to-date information

### 2. Symbol-Specific Analysis
- Access from the Options Analyzer page by clicking the chat icon next to any symbol
- Generates detailed covered call reports including:
  - Security overview (sector, price, market cap, dividend, beta)
  - Position snapshot (cost basis, unrealized gain/loss, tax notes)
  - Covered call setup recommendations
  - Earnings and events analysis
  - Options chain data analysis
  - Technical signals and red flag checks
  - Final recommendations with rationale

### 3. Context-Aware Conversations
- Chat maintains conversation history for follow-up questions
- Integrates with your existing position and transaction data
- Provides personalized recommendations based on your portfolio

## API Endpoints

### Backend Routes
- `POST /api/chat` - General chat endpoint
- `POST /api/chat/covered-call-report/:symbol` - Generate covered call report
- `GET /api/chat/session/:sessionId` - Retrieve chat history
- `DELETE /api/chat/session/:sessionId` - Clear chat history

### Frontend Routes
- `/chat` - General chat interface
- `/chat/covered-call-report/:symbol` - Symbol-specific chat with auto-generated report

## Setup

### 1. Get Gemini API Key
1. Visit [Google AI Studio](https://ai.google.dev/)
2. Create or sign in to your Google account
3. Generate a new API key
4. Add it to your backend `.env` file:
   ```
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

### 2. Install Dependencies
Backend dependencies are already installed. The following was added:
- `@google/generative-ai` - Google Gemini AI SDK

### 3. Features Used
- **Google Search Integration**: Gemini can search the web for current market information
- **Conversation Memory**: Chat sessions maintain context across multiple exchanges
- **Database Integration**: Pulls your actual position and transaction data for personalized analysis
- **Markdown Formatting**: Responses are formatted for readability

## Usage Examples

### General Trading Questions
- "What are the risks of covered calls?"
- "When should I roll a covered call?"
- "What's the difference between ITM and OTM options?"

### Symbol-Specific Analysis
- Navigate to Options Analyzer → Click chat icon next to AAPL
- Auto-generates comprehensive covered call report
- Follow up with: "What if earnings are next week?"
- Or: "Should I use a higher strike price?"

### Portfolio Integration
The chat automatically includes:
- Your current positions in the analyzed symbol
- Recent transaction history
- 30-day price ranges from your database
- Cost basis and unrealized gains/losses

## Security Notes
- API key is stored server-side only
- Chat sessions are stored in memory (not persisted to database)
- No sensitive financial data is sent to Gemini beyond what you explicitly discuss

## Customization
You can modify the prompts and behavior by editing:
- `backend/src/services/geminiService.ts` - Core AI service
- `frontend/src/components/ChatInterface.tsx` - UI component
- `backend/src/routes/chat.ts` - API endpoints

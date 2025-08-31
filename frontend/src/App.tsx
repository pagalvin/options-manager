import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { TransactionAnalysis } from './pages/TransactionAnalysis';
import { Chains } from './pages/Chains';
import { Positions } from './pages/Positions';
import { Options } from './pages/Options';
import { Performance } from './pages/Performance';
import { OptionsAnalyzer } from './pages/OptionsAnalyzer';
import { ETradePage } from './pages/ETrade';
import { Admin } from './pages/Admin';
import { SymbolDetail } from './pages/SymbolDetail';
import { ChartView } from './pages/ChartView';
import { ChatPage } from './pages/ChatPage';
import { MarginAnalysisPage } from './pages/MarginAnalysis';
import PremiumCashFlow from './pages/PremiumCashFlow';
import NotesPage from './pages/Notes';

function App() {
  // Timer to fetch AAPL price every hour to keep E*TRADE API session active
  useEffect(() => {
    const fetchAAPLPriceFromETrade = async () => {
      try {
        // Get the session ID from localStorage
        const sessionId = localStorage.getItem('etrade_session_id');
        
        if (!sessionId) {
          console.log(`[${new Date().toISOString()}] No E*TRADE session ID found, skipping price fetch`);
          return;
        }

        console.log(`[${new Date().toISOString()}] Fetching AAPL price from E*TRADE to keep session active...`);
        
        // Use E*TRADE quote endpoint with session header
        const response = await fetch('/api/etrade/quote/AAPL', {
          headers: {
            'x-session-id': sessionId
          }
        });

        if (response.ok) {
          const data = await response.json();
          const lastTrade = data?.quoteResponse?.quoteData?.[0]?.all?.lastTrade;
          console.log(`[${new Date().toISOString()}] E*TRADE AAPL price: $${lastTrade || 'N/A'}`);
        } else {
          console.warn(`[${new Date().toISOString()}] E*TRADE quote API returned status:`, response.status);
        }
      } catch (error) {
        console.warn(`[${new Date().toISOString()}] Failed to fetch AAPL price from E*TRADE:`, error);
        
        // Try the simple environment check as fallback to keep some API activity
        try {
          const envResponse = await fetch('/api/etrade/environment');
          if (envResponse.ok) {
            console.log(`[${new Date().toISOString()}] E*TRADE environment check succeeded (fallback)`);
          }
        } catch (fallbackError) {
          console.warn(`[${new Date().toISOString()}] E*TRADE environment check also failed:`, fallbackError);
        }
      }
    };

    // Fetch immediately on app start
    fetchAAPLPriceFromETrade();

    // Set up hourly interval (3600000 ms = 1 hour)
    const intervalId = setInterval(fetchAAPLPriceFromETrade, 3600000);

    // Cleanup interval on unmount
    return () => {
      clearInterval(intervalId);
    };
  }, []);

  return (
    <Router>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transaction-analysis" element={<TransactionAnalysis />} />
            <Route path="/transaction-analysis/:fromDate/:toDate" element={<TransactionAnalysis />} />
            <Route path="/transaction-analysis/:fromDate/:toDate/:symbol" element={<TransactionAnalysis />} />
            <Route path="/chains" element={<Chains />} />
            <Route path="/positions" element={<Positions />} />
            <Route path="/symbol/:symbol" element={<SymbolDetail />} />
            <Route path="/chart/:symbol" element={<ChartView />} />
            <Route path="/options" element={<Options />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/premium-cash-flow" element={<PremiumCashFlow />} />
            <Route path="/margin-analysis" element={<MarginAnalysisPage />} />
            <Route path="/analyzer" element={<OptionsAnalyzer />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/covered-call-report/:symbol" element={<ChatPage />} />
            <Route path="/etrade" element={<ETradePage />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/notes" element={<NotesPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

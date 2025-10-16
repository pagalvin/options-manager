import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
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
import MarginOpportunityPlannerPage from './pages/MarginOpportunityPlannerPage';
import { StockSnapshotPage } from './pages/StockSnapshot';
import { ProjectionsPage } from './pages/ProjectionsPage';

function App() {
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
            <Route path="/margin-opportunity-planner" element={<MarginOpportunityPlannerPage />} />
            <Route path="/projections" element={<ProjectionsPage />} />
            <Route path="/analyzer" element={<OptionsAnalyzer />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/chat/covered-call-report/:symbol" element={<ChatPage />} />
            <Route path="/stock-snapshot" element={<StockSnapshotPage />} />
            <Route path="/etrade" element={<ETradePage />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

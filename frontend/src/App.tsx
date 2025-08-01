import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { Transactions } from './pages/Transactions';
import { TransactionAnalysis } from './pages/TransactionAnalysis';
import { Positions } from './pages/Positions';
import { Options } from './pages/Options';
import { Performance } from './pages/Performance';
import { OptionsAnalyzer } from './pages/OptionsAnalyzer';
import { ETradePage } from './pages/ETrade';
import { Admin } from './pages/Admin';
import { SymbolDetail } from './pages/SymbolDetail';

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
            <Route path="/positions" element={<Positions />} />
            <Route path="/symbol/:symbol" element={<SymbolDetail />} />
            <Route path="/options" element={<Options />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/analyzer" element={<OptionsAnalyzer />} />
            <Route path="/etrade" element={<ETradePage />} />
            <Route path="/admin" element={<Admin />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

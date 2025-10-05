import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { stockAnalysisService } from '../services/stockAnalysisService';
import { StockSnapshot } from '../types/stockAnalysis';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Loader2, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Building2, Calendar, Globe, LineChart } from 'lucide-react';
import { FinancialLinks } from '@/components/FinancialLinks';

export const StockSnapshotPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [ticker, setTicker] = useState<string>(searchParams.get('ticker') || '');
  const [snapshot, setSnapshot] = useState<StockSnapshot | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPrice, setCurrentPrice] = useState<{
    price: number;
    change: number;
    changePercent: number;
    lastTradeTime: number;
  } | null>(null);
  const [priceLoading, setPriceLoading] = useState<boolean>(false);

  useEffect(() => {
    const tickerFromUrl = searchParams.get('ticker');
    if (tickerFromUrl) {
      setTicker(tickerFromUrl);
      loadAnalysis(tickerFromUrl, false);
    }
  }, [searchParams]);

  const loadCurrentPrice = async (tickerSymbol: string) => {
    setPriceLoading(true);
    try {
      // Get session ID from localStorage if available
      const sessionId = localStorage.getItem('etrade_session_id');
      
      const priceData = await stockAnalysisService.getCurrentPrice(tickerSymbol, sessionId || undefined);
      if (priceData) {
        setCurrentPrice({
          price: priceData.price,
          change: priceData.change,
          changePercent: priceData.changePercent,
          lastTradeTime: priceData.lastTradeTime
        });
      } else {
        setCurrentPrice(null);
      }
    } catch (err: any) {
      console.warn('Could not fetch current price:', err);
      setCurrentPrice(null);
    } finally {
      setPriceLoading(false);
    }
  };

  const loadAnalysis = async (tickerSymbol: string, forceRefresh: boolean = false) => {
    if (!tickerSymbol || tickerSymbol.trim().length === 0) {
      setError('Please enter a ticker symbol');
      return;
    }

    setError(null);
    if (forceRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await stockAnalysisService.getStockAnalysis(tickerSymbol, forceRefresh);
      setSnapshot(data);
      
      // Load current price in parallel
      loadCurrentPrice(tickerSymbol);
      
      // Update URL with ticker
      setSearchParams({ ticker: tickerSymbol.toUpperCase() });
    } catch (err: any) {
      setError(err.message || 'Failed to load stock analysis');
      setSnapshot(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadAnalysis(ticker, false);
  };

  const handleRefresh = () => {
    if (ticker) {
      loadAnalysis(ticker, true);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const analysis = snapshot?.analysisData;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-4">Stock Analysis Snapshot</h1>
        <p className="text-muted-foreground">
          Comprehensive analysis of stocks including fundamental data, technical analysis, and market insights
        </p>
      </div>

      {/* Search Form */}
      <Card className="mb-8">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="flex gap-4">
            <Input
              type="text"
              placeholder="Enter ticker symbol (e.g., AAPL, MSFT, TSLA)"
              value={ticker}
              onChange={(e) => setTicker(e.target.value.toUpperCase())}
              className="flex-1"
              disabled={loading || refreshing}
            />
            <Button type="submit" disabled={loading || refreshing}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze'
              )}
            </Button>
            {snapshot && (
              <Button
                type="button"
                variant="outline"
                onClick={handleRefresh}
                disabled={loading || refreshing}
              >
                {refreshing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Refreshing...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refresh
                  </>
                )}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="mb-8 p-4 border border-red-500 bg-red-50 rounded-md flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && snapshot && (
        <div className="space-y-6">
          {/* Header Info */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="text-3xl">{analysis.ticker} <FinancialLinks security={analysis.ticker} /></CardTitle>
                  <p className="text-xl text-muted-foreground mt-2">{analysis.companyName}</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Snapshot generated: {formatDate(snapshot.snapshotDate)}
                  </p>
                </div>
                
                {/* Current Price Display */}
                {priceLoading ? (
                  <div className="flex items-center gap-2 px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Loading price...</span>
                  </div>
                ) : currentPrice ? (
                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">Current Price</p>
                    <p className="text-3xl font-bold">${currentPrice.price?.toFixed(2)}</p>
                    <div className={`flex items-center justify-end gap-1 mt-1 ${
                      currentPrice.change >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {currentPrice.change >= 0 ? (
                        <TrendingUp className="h-4 w-4" />
                      ) : (
                        <TrendingDown className="h-4 w-4" />
                      )}
                      <span className="text-lg font-semibold">
                        {currentPrice.change >= 0 ? '+' : ''}{currentPrice.change?.toFixed(2)}
                      </span>
                      <span className="text-sm">
                        ({currentPrice.changePercent >= 0 ? '+' : ''}{currentPrice.changePercent?.toFixed(2)}%)
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(currentPrice.lastTradeTime).toLocaleTimeString()}
                    </p>
                  </div>
                ) : null}
              </div>
            </CardHeader>
          </Card>

          {/* Company Summary */}
          {analysis.companySummary && (
            <Card>
              <CardHeader>
                <CardTitle>Company Overview</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-base leading-relaxed">{analysis.companySummary}</p>
              </CardContent>
            </Card>
          )}



          {/* Key Dates & Headquarters */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Key Dates
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Founded</p>
                  <p className="text-lg">{analysis.keyDates.foundedYear}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Most Recent Earnings</p>
                  <p className="text-lg">{analysis.keyDates.mostRecentEarnings}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Next Earnings Date</p>
                  <p className="text-lg">{analysis.keyDates.nextEarningsDate}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Headquarters
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Location</p>
                  <p className="text-lg">
                    {analysis.headquarters.city}
                    {analysis.headquarters.state && `, ${analysis.headquarters.state}`}
                  </p>
                  <p className="text-lg">{analysis.headquarters.country}</p>
                </div>
                {analysis.headquarters.address && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Address</p>
                    <p className="text-sm">{analysis.headquarters.address}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Industry Classification */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Industry Classification (GICS)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sector</p>
                  <p className="text-lg">{analysis.industry.gicsSector}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Industry Group</p>
                  <p className="text-lg">{analysis.industry.gicsIndustryGroup}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Industry</p>
                  <p className="text-lg">{analysis.industry.gicsIndustry}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sub-Industry</p>
                  <p className="text-lg">{analysis.industry.gicsSubIndustry}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Industry Position */}
          <Card>
            <CardHeader>
              <CardTitle>Market Position</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysis.industryPosition.rank && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Market Rank</p>
                  <p className="text-lg">{analysis.industryPosition.rank}</p>
                </div>
              )}
              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Key Competitors</p>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.industryPosition.keyCompetitors.map((comp, idx) => (
                      <li key={idx} className="text-sm">{comp}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Peer Companies</p>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.industryPosition.peerCompanies.map((peer, idx) => (
                      <li key={idx} className="text-sm">{peer}</li>
                    ))}
                  </ul>
                </div>
                {analysis.industryPosition.keySuppliers && analysis.industryPosition.keySuppliers.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Key Suppliers</p>
                    <ul className="list-disc list-inside space-y-1">
                      {analysis.industryPosition.keySuppliers.map((supplier, idx) => (
                        <li key={idx} className="text-sm">{supplier}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent News */}
          <Card>
            <CardHeader>
              <CardTitle>Recent News</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.recentNews.map((news, idx) => (
                  <div key={idx} className="border-l-4 border-primary pl-4 py-2">
                    <a
                      href={news.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-lg font-semibold hover:text-primary transition-colors"
                    >
                      {news.title}
                    </a>
                    <p className="text-sm text-muted-foreground mt-1">{news.summary}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Analyst Sentiment */}
          {analysis.analystSentiment && (
            <Card>
              <CardHeader>
                <CardTitle>Analyst Sentiment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Consensus Rating */}
                  <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Consensus Rating</p>
                      <p className={`text-2xl font-bold ${
                        analysis.analystSentiment.consensusRating.toLowerCase().includes('buy') 
                          ? 'text-green-600' 
                          : analysis.analystSentiment.consensusRating.toLowerCase().includes('sell')
                          ? 'text-red-600'
                          : 'text-yellow-600'
                      }`}>
                        {analysis.analystSentiment.consensusRating}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-muted-foreground">Analyst Coverage</p>
                      <p className="text-2xl font-bold">{analysis.analystSentiment.numberOfAnalysts}</p>
                    </div>
                  </div>

                  {/* Price Targets */}
                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Average Target</p>
                      <p className="text-xl font-bold text-primary">
                        ${analysis.analystSentiment.averagePriceTarget?.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-1">High Target</p>
                      <p className="text-xl font-bold text-green-600">
                        ${analysis.analystSentiment.highPriceTarget?.toFixed(2)}
                      </p>
                    </div>
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm font-medium text-muted-foreground mb-1">Low Target</p>
                      <p className="text-xl font-bold text-red-600">
                        ${analysis.analystSentiment.lowPriceTarget?.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Recent Changes */}
                  {analysis.analystSentiment.recentChanges && analysis.analystSentiment.recentChanges.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-2">Recent Rating Changes</p>
                      <ul className="list-disc list-inside space-y-1">
                        {analysis.analystSentiment.recentChanges.map((change, idx) => (
                          <li key={idx} className="text-sm">{change}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Summary */}
                  {analysis.analystSentiment.summary && (
                    <div className="pt-4 border-t">
                      <p className="text-sm font-medium text-muted-foreground mb-2">Analyst Summary</p>
                      <p className="text-base leading-relaxed">{analysis.analystSentiment.summary}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Investment Cases */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card className="border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="h-5 w-5" />
                  Bullish Case
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.investmentCases.bullish.map((point, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-green-600 font-bold">+</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            <Card className="border-red-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600">
                  <TrendingDown className="h-5 w-5" />
                  Bearish Case
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {analysis.investmentCases.bearish.map((point, idx) => (
                    <li key={idx} className="flex gap-2">
                      <span className="text-red-600 font-bold">-</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          {/* Trends */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Industry Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Summary</p>
                  <p>{analysis.trends.industryTrends.summary}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Impact Outlook</p>
                  <p>{analysis.trends.industryTrends.impactOutlook}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Macroeconomic Trends</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Summary</p>
                  <p>{analysis.trends.macroeconomicTrends.summary}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Impact Outlook</p>
                  <p>{analysis.trends.macroeconomicTrends.impactOutlook}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Red Flags */}
          <Card className="border-orange-500/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                Red Flags Analysis
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {analysis.redFlags.goingConcernLanguage && (
                <div className="p-4 border border-red-500 bg-red-50 rounded-md flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  <p className="text-red-800">
                    <strong>Going Concern Warning:</strong> Company has disclosed going concern language in recent filings
                  </p>
                </div>
              )}

              {analysis.redFlags.legalOrRegulatoryIssues.length > 0 && (
                <div>
                  <p className="font-semibold mb-2">Legal/Regulatory Issues</p>
                  <ul className="list-disc list-inside space-y-1">
                    {analysis.redFlags.legalOrRegulatoryIssues.map((issue, idx) => (
                      <li key={idx} className="text-sm">{issue}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-4">
                <div>
                  <p className="font-semibold mb-2">Financial Performance</p>
                  <ul className="space-y-1 text-sm">
                    {analysis.redFlags.financialPerformance.decliningRevenue && (
                      <li className="text-orange-600">⚠ Declining Revenue</li>
                    )}
                    {analysis.redFlags.financialPerformance.weakEarningsQuality && (
                      <li className="text-orange-600">⚠ Weak Earnings Quality</li>
                    )}
                    {analysis.redFlags.financialPerformance.unstableMargins && (
                      <li className="text-orange-600">⚠ Unstable Margins</li>
                    )}
                    {!analysis.redFlags.financialPerformance.decliningRevenue &&
                      !analysis.redFlags.financialPerformance.weakEarningsQuality &&
                      !analysis.redFlags.financialPerformance.unstableMargins && (
                        <li className="text-green-600">✓ No major issues</li>
                      )}
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">Balance Sheet</p>
                  <ul className="space-y-1 text-sm">
                    {analysis.redFlags.balanceSheet.highDebtToEquity && (
                      <li className="text-orange-600">⚠ High Debt-to-Equity</li>
                    )}
                    {analysis.redFlags.balanceSheet.liquidityIssues && (
                      <li className="text-orange-600">⚠ Liquidity Issues</li>
                    )}
                    {analysis.redFlags.balanceSheet.accountingChanges && (
                      <li className="text-orange-600">⚠ Accounting Changes</li>
                    )}
                    {!analysis.redFlags.balanceSheet.highDebtToEquity &&
                      !analysis.redFlags.balanceSheet.liquidityIssues &&
                      !analysis.redFlags.balanceSheet.accountingChanges && (
                        <li className="text-green-600">✓ No major issues</li>
                      )}
                  </ul>
                </div>

                <div>
                  <p className="font-semibold mb-2">Risk Disclosures</p>
                  <ul className="space-y-1 text-sm">
                    {analysis.redFlags.riskDisclosures.lawsuitsOrInvestigations && (
                      <li className="text-orange-600">⚠ Lawsuits/Investigations</li>
                    )}
                    {analysis.redFlags.riskDisclosures.customerOrSupplierConcentration && (
                      <li className="text-orange-600">⚠ Customer/Supplier Concentration</li>
                    )}
                    {analysis.redFlags.riskDisclosures.geopoliticalOrCommodityExposure && (
                      <li className="text-orange-600">⚠ Geopolitical/Commodity Exposure</li>
                    )}
                    {!analysis.redFlags.riskDisclosures.lawsuitsOrInvestigations &&
                      !analysis.redFlags.riskDisclosures.customerOrSupplierConcentration &&
                      !analysis.redFlags.riskDisclosures.geopoliticalOrCommodityExposure && (
                        <li className="text-green-600">✓ No major issues</li>
                      )}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Technical Analysis */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="h-5 w-5" />
                Technical Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Support Levels</p>
                  <div className="space-y-1">
                    {analysis.technicalAnalysis.supportLevels.map((level, idx) => (
                      <p key={idx} className="text-lg font-semibold text-green-600">
                        ${level?.toFixed(2)}
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Resistance Levels</p>
                  <div className="space-y-1">
                    {analysis.technicalAnalysis.resistanceLevels.map((level, idx) => (
                      <p key={idx} className="text-lg font-semibold text-red-600">
                        ${level?.toFixed(2)}
                      </p>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">50-Day MA</p>
                  <p className="text-lg font-semibold">
                    ${analysis.technicalAnalysis.movingAverages.fiftyDay?.toFixed(2)}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground mt-3">200-Day MA</p>
                  <p className="text-lg font-semibold">
                    ${analysis.technicalAnalysis.movingAverages.twoHundredDay?.toFixed(2)}
                  </p>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground">RSI</p>
                  <p className="text-lg font-semibold">
                    {analysis.technicalAnalysis.rsi?.toFixed(2)}
                  </p>
                  <p className="text-sm font-medium text-muted-foreground mt-3">Avg Volume</p>
                  <p className="text-lg font-semibold">
                    {analysis.technicalAnalysis.averageVolume?.toLocaleString()}
                  </p>
                </div>
              </div>
              
              {analysis.technicalAnalysis.narrativeSummary && (
                <div className="mt-6 pt-6 border-t">
                  <p className="text-sm font-medium text-muted-foreground mb-2">Technical Outlook</p>
                  <p className="text-base leading-relaxed">{analysis.technicalAnalysis.narrativeSummary}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Investor Resources */}
          {analysis.investorResources && (
            <Card>
              <CardHeader>
                <CardTitle>Investor Resources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analysis.investorResources.investorRelationsPage && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">Investor Relations</p>
                      <a
                        href={analysis.investorResources.investorRelationsPage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2"
                      >
                        {analysis.investorResources.investorRelationsPage}
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>
                  )}
                  {analysis.investorResources.secFilingsPage && (
                    <div>
                      <p className="text-sm font-medium text-muted-foreground mb-1">SEC Filings</p>
                      <a
                        href={analysis.investorResources.secFilingsPage}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-2"
                      >
                        {analysis.investorResources.secFilingsPage}
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                          />
                        </svg>
                      </a>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Google Search Sources */}
          {analysis.groundingMetadata?.webSearchQueries && analysis.groundingMetadata.webSearchQueries.length > 0 && (
            <Card className="border-blue-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg
                    className="h-5 w-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                  Research Sources
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  This analysis was generated using {analysis.groundingMetadata.webSearchQueries.length} Google Search queries to gather the latest information.
                </p>
                
                {/* Show the list of queries as chips */}
                <div className="flex flex-wrap gap-2 mt-4">
                  {analysis.groundingMetadata.webSearchQueries.map((query, index) => (
                    <a
                      key={index}
                      href={`https://www.google.com/search?q=${encodeURIComponent(query)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full border border-blue-200 hover:border-blue-300 transition-colors"
                    >
                      <svg
                        className="h-3.5 w-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                        />
                      </svg>
                      {query}
                    </a>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

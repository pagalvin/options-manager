import { useState, useEffect } from 'react';
import { newsService, NewsSnapshot, TickerNews, GenerationProgress } from '@/services/newsService';
import { Newspaper, RefreshCw, AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown, Minus, ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { FinancialLinks } from './FinancialLinks';

interface LatestNewsProps {
  tickers: string[];
}

export function LatestNews({ tickers }: LatestNewsProps) {
  const [snapshot, setSnapshot] = useState<NewsSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<GenerationProgress | null>(null);
  const [availableDates, setAvailableDates] = useState<Date[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  // Load snapshot for current date or selected date
  const loadSnapshot = async (date: Date) => {
    try {
      setLoading(true);
      setError(null);
      
      const existingSnapshot = await newsService.getSnapshotByDate(date);
      
      if (existingSnapshot) {
        setSnapshot(existingSnapshot);
      } else {
        // No snapshot for this date
        setSnapshot(null);
        
        // If it's today and no snapshot exists, we'll show the generate button
        const isToday = date.toDateString() === new Date().toDateString();
        if (!isToday) {
          setError('No news snapshot available for this date');
        }
      }
    } catch (err) {
      console.error('Error loading snapshot:', err);
      setError('Failed to load news snapshot');
    } finally {
      setLoading(false);
    }
  };

  // Load available dates
  const loadAvailableDates = async () => {
    try {
      const dates = await newsService.getSnapshotDates();
      setAvailableDates(dates);
    } catch (err) {
      console.error('Error loading available dates:', err);
    }
  };

  // Generate new snapshot
  const generateSnapshot = async () => {
    if (tickers.length === 0) {
      setError('No tickers available to generate news');
      return;
    }

    try {
      setGenerating(true);
      setError(null);
      setGenerationProgress(null);

      const newSnapshot = await newsService.generateSnapshot(
        tickers,
        (progress) => {
          setGenerationProgress(progress);
        }
      );

      setSnapshot(newSnapshot);
      setGenerating(false);
      setGenerationProgress(null);
      
      // Reload available dates
      await loadAvailableDates();
    } catch (err) {
      console.error('Error generating snapshot:', err);
      setError('Failed to generate news snapshot');
      setGenerating(false);
      setGenerationProgress(null);
    }
  };

  // Navigate to previous date
  const goToPreviousDate = () => {
    const currentIndex = availableDates.findIndex(
      d => d.toDateString() === selectedDate.toDateString()
    );
    
    if (currentIndex < availableDates.length - 1) {
      const prevDate = availableDates[currentIndex + 1];
      setSelectedDate(prevDate);
      loadSnapshot(prevDate);
    }
  };

  // Navigate to next date
  const goToNextDate = () => {
    const currentIndex = availableDates.findIndex(
      d => d.toDateString() === selectedDate.toDateString()
    );
    
    if (currentIndex > 0) {
      const nextDate = availableDates[currentIndex - 1];
      setSelectedDate(nextDate);
      loadSnapshot(nextDate);
    }
  };

  // Get sentiment icon and color
  const getSentimentDisplay = (sentiment: string) => {
    switch (sentiment) {
      case 'positive':
        return { icon: <TrendingUp className="w-4 h-4" />, color: 'text-green-600', bg: 'bg-green-50', label: 'Positive' };
      case 'negative':
        return { icon: <TrendingDown className="w-4 h-4" />, color: 'text-red-600', bg: 'bg-red-50', label: 'Negative' };
      default:
        return { icon: <Minus className="w-4 h-4" />, color: 'text-gray-600', bg: 'bg-gray-50', label: 'Neutral' };
    }
  };

  useEffect(() => {
    loadSnapshot(selectedDate);
    loadAvailableDates();
  }, []);

  const isToday = selectedDate.toDateString() === new Date().toDateString();
  const canGoNext = availableDates.findIndex(d => d.toDateString() === selectedDate.toDateString()) > 0;
  const canGoPrev = availableDates.findIndex(d => d.toDateString() === selectedDate.toDateString()) < availableDates.length - 1;

  return (
    <div className="space-y-6">
      {/* Header with navigation and refresh */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <h2 className="text-2xl font-semibold flex items-center">
            <Newspaper className="mr-2 text-blue-600" size={24} />
            Latest News
          </h2>
          
          {/* Date navigation */}
          <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-2">
            <button
              onClick={goToPreviousDate}
              disabled={!canGoPrev}
              className={`p-1 rounded ${canGoPrev ? 'hover:bg-gray-200' : 'opacity-30 cursor-not-allowed'}`}
              title="Previous date"
            >
              <ChevronLeft size={20} />
            </button>
            
            <span className="text-sm font-medium px-2">
              {selectedDate.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </span>
            
            <button
              onClick={goToNextDate}
              disabled={!canGoNext}
              className={`p-1 rounded ${canGoNext ? 'hover:bg-gray-200' : 'opacity-30 cursor-not-allowed'}`}
              title="Next date"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <button
          onClick={generateSnapshot}
          disabled={generating || !isToday}
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium ${
            generating || !isToday
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {generating ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Generating...</span>
            </>
          ) : (
            <>
              <RefreshCw size={18} />
              <span>{snapshot && isToday ? 'Refresh' : 'Generate'} News</span>
            </>
          )}
        </button>
      </div>

      {/* Generation Progress */}
      {generating && generationProgress && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              Generating news for {generationProgress.ticker}... ({generationProgress.index}/{generationProgress.total})
            </span>
            <span className="text-sm font-semibold text-blue-700">
              {generationProgress.percentage}%
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${generationProgress.percentage}%` }}
            />
          </div>
          {generationProgress.data?.error && (
            <div className="mt-2 text-sm text-red-600 flex items-center">
              <AlertCircle size={14} className="mr-1" />
              <span>Error: {generationProgress.data.error}</span>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && !generating && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="text-red-600 mr-2 flex-shrink-0" size={20} />
          <span className="text-red-700">{error}</span>
        </div>
      )}

      {/* Loading state */}
      {loading && !generating && (
        <div className="text-center py-12">
          <Loader2 className="animate-spin mx-auto mb-2 text-blue-600" size={32} />
          <p className="text-gray-600">Loading news snapshot...</p>
        </div>
      )}

      {/* No snapshot message */}
      {!loading && !snapshot && !error && !generating && isToday && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <Newspaper className="mx-auto mb-3 text-gray-400" size={48} />
          <h3 className="text-lg font-semibold text-gray-700 mb-2">No News Snapshot Available</h3>
          <p className="text-gray-600 mb-4">
            Generate a news snapshot to see the latest information for your portfolio stocks.
          </p>
          <button
            onClick={generateSnapshot}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 font-medium"
          >
            Generate News Snapshot
          </button>
        </div>
      )}

      {/* News display */}
      {!loading && snapshot && (
        <div className="space-y-4">
          {/* Snapshot metadata */}
          <div className="bg-gray-50 rounded-lg p-3 flex items-center justify-between text-sm text-gray-600">
            <div className="flex items-center">
              <Clock size={16} className="mr-2" />
              <span>
                Generated: {new Date(snapshot.date_generated).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit'
                })}
              </span>
            </div>
            <div className="flex items-center">
              <CheckCircle size={16} className="mr-2 text-green-600" />
              <span>{snapshot.gemini_response.length} stocks analyzed</span>
            </div>
          </div>

          {/* News grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {snapshot.gemini_response.map((tickerNews: TickerNews) => (
              <div key={tickerNews.ticker} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                {/* Ticker header */}
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200">
                  <h3 className="text-lg font-bold text-blue-600">
                    {tickerNews.ticker}
                    <FinancialLinks security={tickerNews.ticker} className="inline-block ml-2" />
                    </h3>
                  <span className="text-xs text-gray-500">
                    {tickerNews.articles.length} article{tickerNews.articles.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Error message for ticker */}
                {tickerNews.error && (
                  <div className="text-sm text-red-600 bg-red-50 rounded p-2 mb-2 flex items-start">
                    <AlertCircle size={14} className="mr-1 flex-shrink-0 mt-0.5" />
                    <span>{tickerNews.error}</span>
                  </div>
                )}

                {/* Articles */}
                <div className="space-y-3">
                  {tickerNews.articles.map((article, idx) => {
                    const sentiment = getSentimentDisplay(article.sentiment);
                    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(article.title)}`;
                    
                    return (
                      <div key={idx} className="border-l-4 pl-3 py-1" style={{ borderColor: sentiment.color.replace('text-', '') }}>
                        <div className="flex items-start justify-between mb-1">
                          <div className="flex items-start space-x-2 flex-1">
                            <a
                              href={article.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline flex-1"
                            >
                              {article.title}
                            </a>
                            <a
                              href={googleSearchUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Search on Google"
                              className="text-gray-400 hover:text-blue-600 flex-shrink-0 mt-0.5"
                            >
                              <Search size={14} />
                            </a>
                          </div>
                          <div className={`ml-2 flex items-center px-2 py-1 rounded-full text-xs font-medium ${sentiment.bg} ${sentiment.color} flex-shrink-0`}>
                            {sentiment.icon}
                            <span className="ml-1">{sentiment.label}</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">{article.summary}</p>
                        {article.publicationDate && (
                          <p className="text-xs text-gray-400">
                            {new Date(article.publicationDate).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* No articles message */}
                {tickerNews.articles.length === 0 && !tickerNews.error && (
                  <p className="text-sm text-gray-500 italic">No recent news articles found</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

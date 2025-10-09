const API_BASE_URL = 'http://localhost:3001/api';

export interface NewsArticle {
  title: string;
  summary: string;
  link: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  publicationDate?: string;
}

export interface TickerNews {
  ticker: string;
  analysisDate: string;
  articles: NewsArticle[];
  error?: string;
}

export interface NewsSnapshot {
  id: number;
  date_generated: string;
  gemini_response: TickerNews[];
  created_at: string;
  updated_at: string;
}

export interface GenerationProgress {
  ticker: string;
  index: number;
  total: number;
  data: TickerNews;
  percentage: number;
  complete?: boolean;
  connected?: boolean;
}

class NewsService {
  /**
   * Get all snapshot dates
   */
  async getSnapshotDates(): Promise<Date[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/news/snapshots/dates`);
      if (!response.ok) {
        throw new Error('Failed to fetch snapshot dates');
      }
      const dates = await response.json();
      return dates.map((d: string) => new Date(d));
    } catch (error) {
      console.error('Error fetching snapshot dates:', error);
      throw error;
    }
  }

  /**
   * Get all news snapshots
   */
  async getAllSnapshots(): Promise<NewsSnapshot[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/news/snapshots`);
      if (!response.ok) {
        throw new Error('Failed to fetch snapshots');
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching snapshots:', error);
      throw error;
    }
  }

  /**
   * Get news snapshot for a specific date
   */
  async getSnapshotByDate(date: Date): Promise<NewsSnapshot | null> {
    try {
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const response = await fetch(`${API_BASE_URL}/news/snapshots/${dateStr}`);
      
      if (response.status === 404) {
        return null;
      }
      
      if (!response.ok) {
        throw new Error('Failed to fetch snapshot');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching snapshot by date:', error);
      throw error;
    }
  }

  /**
   * Generate a new news snapshot
   * Returns a promise that resolves when generation is complete
   * Calls progressCallback with updates during generation
   */
  async generateSnapshot(
    tickers: string[],
    progressCallback?: (progress: GenerationProgress) => void
  ): Promise<NewsSnapshot> {
    const clientId = `client-${Date.now()}-${Math.random()}`;
    
    return new Promise((resolve, reject) => {
      // Set up SSE connection for progress updates
      if (progressCallback) {
        const eventSource = new EventSource(`${API_BASE_URL}/news/progress/${clientId}`);
        
        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.complete) {
              eventSource.close();
              return;
            }
            
            if (data.connected) {
              console.log('Connected to progress stream');
              return;
            }
            
            progressCallback(data);
          } catch (error) {
            console.error('Error parsing progress data:', error);
          }
        };
        
        eventSource.onerror = (error) => {
          console.error('SSE error:', error);
          eventSource.close();
        };
      }
      
      // Start generation
      fetch(`${API_BASE_URL}/news/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tickers, clientId }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate snapshot');
          }
          return response.json();
        })
        .then((snapshot) => {
          resolve(snapshot);
        })
        .catch((error) => {
          console.error('Error generating snapshot:', error);
          reject(error);
        });
    });
  }

  /**
   * Delete a news snapshot
   */
  async deleteSnapshot(id: number): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/news/snapshots/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete snapshot');
      }
    } catch (error) {
      console.error('Error deleting snapshot:', error);
      throw error;
    }
  }
}

export const newsService = new NewsService();
export default newsService;

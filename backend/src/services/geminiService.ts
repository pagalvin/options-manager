import { GoogleGenerativeAI } from '@google/generative-ai';
import { positionService } from './positionService';
import { transactionService } from './transactionService';
import { stockPriceService } from './stockPriceService';

export type GeminiMimeTypes = 'text/plain' | 'application/json' | 'application/xml' | 'text/x.enum';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
}

export interface ChatSessionData {
  messages: ChatMessage[];
  sessionId: string;
}

export interface CoveredCallReportData {
  symbol: string;
  currentPrice?: number;
  positions?: any[];
  transactions?: any[];
  recentStockPrices?: any[];
}

class GeminiService {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
  }

  async executePrompt(
    prompt: string,
    chatHistory: ChatMessage[] = [],
    expectedResponseMimeType: GeminiMimeTypes = 'text/plain'
  ): Promise<{
    response: string;
    fullResult: any;
    rawGeminiResult: any;
  }> {
    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 16000,
      responseMimeType: expectedResponseMimeType,
    };

    console.log(`geminiService: ${JSON.stringify(generationConfig)}`);

    // Convert chat history to Gemini format
    const history = chatHistory.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    const toolWorkaround: any = "googleSearch";

    const chatSession = this.model.startChat({
      generationConfig,
      history,
      tools: [
        {
          [toolWorkaround]: {},
        },
      ],
    });

    try {
      const result = await chatSession.sendMessage(prompt);
      const responseText = result.response.text();
      
      return {
        response: responseText,
        fullResult: result,
        rawGeminiResult: result
      };
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      throw new Error(`Failed to execute prompt: ${error.message}`);
    }
  }

  async generateCoveredCallReport(symbol: string, chatHistory: ChatMessage[] = []): Promise<{
    response: string;
    reportData: CoveredCallReportData;
    rawGeminiResult: any;
  }> {
    try {
      // Gather data from your database
      const reportData: CoveredCallReportData = {
        symbol: symbol.toUpperCase()
      };

      // Get position data
      try {
        const positions = await positionService.getPositionsBySymbol(symbol);
        reportData.positions = positions;
      } catch (error) {
        console.warn(`Could not fetch positions for ${symbol}:`, error);
      }

      // Get transaction data
      try {
        const transactions = await transactionService.getTransactionsBySymbol(symbol);
        reportData.transactions = transactions;
      } catch (error) {
        console.warn(`Could not fetch transactions for ${symbol}:`, error);
      }

      // Get recent stock prices
      try {
        const recentPrices = await stockPriceService.getRecentPrices(symbol, 30);
        reportData.recentStockPrices = recentPrices;
        if (recentPrices && recentPrices.length > 0) {
          reportData.currentPrice = recentPrices[0].price;
        }
      } catch (error) {
        console.warn(`Could not fetch recent prices for ${symbol}:`, error);
      }

      // Build the enhanced prompt with your data
      const contextualPrompt = this.buildCoveredCallPrompt(symbol, reportData);

      // Execute the prompt with Gemini
      const result = await this.executePrompt(contextualPrompt, chatHistory, 'text/plain');

      return {
        response: result.response,
        reportData,
        rawGeminiResult: result.rawGeminiResult
      };
    } catch (error: any) {
      console.error('Error generating covered call report:', error);
      throw new Error(`Failed to generate covered call report: ${error.message}`);
    }
  }

  private buildCoveredCallPrompt(symbol: string, data: CoveredCallReportData): string {
    let prompt = `Generate a covered call decision report for the stock ${symbol}. Include:

1. Security overview (sector, price, market cap, dividend, beta)
2. Position snapshot (cost basis, unrealized gain/loss, tax notes)
3. Covered call setup (strike, expiration, premium, annualized yield)
4. Earnings and events (next earnings date, recent results, guidance)
5. Options chain data (IV, open interest, liquidity)
6. Technical signals (support/resistance, RSI, trend)
7. Analyst sentiment
8. Red flag check: any recent "going concern" language in SEC filings, bankruptcy risk, debt restructuring, or major negative news?
9. Final recommendation with rationale

Use recent financial filings and news to assess risk. If any red flags exist, highlight them clearly.

`;

    // Add contextual data from your database
    if (data.currentPrice) {
      prompt += `\nCurrent database price: $${data.currentPrice}\n`;
    }

    if (data.positions && data.positions.length > 0) {
      prompt += `\nCurrent positions in ${symbol}:\n`;
      data.positions.forEach(pos => {
        prompt += `- Shares: ${pos.shares}, Cost Basis: $${pos.cost_basis || 'N/A'}, Current Value: $${pos.current_value || 'N/A'}\n`;
      });
    }

    if (data.transactions && data.transactions.length > 0) {
      const recentTransactions = data.transactions.slice(0, 5); // Last 5 transactions
      prompt += `\nRecent transactions in ${symbol}:\n`;
      recentTransactions.forEach(tx => {
        prompt += `- ${tx.action}: ${tx.quantity} shares at $${tx.price} on ${tx.date}\n`;
      });
    }

    if (data.recentStockPrices && data.recentStockPrices.length > 0) {
      const priceRange = {
        high: Math.max(...data.recentStockPrices.map(p => p.price)),
        low: Math.min(...data.recentStockPrices.map(p => p.price)),
        current: data.recentStockPrices[0].price
      };
      prompt += `\n30-day price range: $${priceRange.low.toFixed(2)} - $${priceRange.high.toFixed(2)} (Current: $${priceRange.current.toFixed(2)})\n`;
    }

    return prompt;
  }

  async insertCommonGroundingInformation(params: {
    userPrompt: string;
    userEmail?: string;
    userName?: string;
    symbol?: string;
  }): Promise<string> {
    // Add grounding information specific to options trading
    let enhancedPrompt = `You are an expert options trading advisor with deep knowledge of covered call strategies, risk management, and market analysis. 

Context: This is for an options trading application that helps users manage covered call positions and analyze potential trades.

`;

    if (params.symbol) {
      enhancedPrompt += `Current focus symbol: ${params.symbol}\n`;
    }

    if (params.userName) {
      enhancedPrompt += `User: ${params.userName}\n`;
    }

    enhancedPrompt += `\nUser's request: ${params.userPrompt}`;

    return enhancedPrompt;
  }
}

export const geminiService = new GeminiService();

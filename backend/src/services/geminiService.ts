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
    this.model = this.genAI.getGenerativeModel({ model: "gemini-2.5-pro" });
    // this.model = this.genAI.getGenerativeModel({ model: "gemini-2.0-flash-lite" });
    // gemini-2.5-pro

  }

  async executePrompt(
    prompt: string,
    chatHistory: ChatMessage[] = [],
    expectedResponseMimeType: GeminiMimeTypes = 'text/plain',
    maxTokens: number = 16000
  ): Promise<{
    response: string;
    fullResult: any;
    rawGeminiResult: any;
  }> {
    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: maxTokens,
      responseMimeType: expectedResponseMimeType,
    };

    console.log(`geminiService: ${JSON.stringify(generationConfig)}`);

    // Convert chat history to Gemini format
    const history = chatHistory.map(msg => ({
      role: msg.role,
      parts: [{ text: msg.content }]
    }));

    // Configure Google Search tool with dynamic retrieval mode
    // This enables grounding with Google Search results
    const chatSession = this.model.startChat({
      generationConfig,
      history,
      tools: [
        {
          googleSearch: {}
        }
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
    let prompt = `Generate a covered call decision report for the security represented by the symbol ${symbol}. Include:

    1. Perform a Google Search for the latest information on ${symbol} to ensure the report is up-to-date.
    2. Summarize the company, ETF or entity behind the symbol. What is their business model, recent news, and market position?
    3. Provide a concise summary of the security's recent performance and outlook based on the google search results.
    4. Based on your search results, provide the following:
      a) Red flag report: List any red flags such as
        - "going concern" language in recent SEC filings,
        - bankruptcy risk,
        - debt restructuring
        - insiders selling shares
        - major lawsuits or regulatory issues
        - significant management changes
        - any other  major negative news
      b) Three bullish reasons to consider selling covered calls on this stock. Be specific to the stock itself, not generic about covered calls.
      c) Three bearish reasons to be cautious about selling covered calls on this stock. Be specific to the stock itself, not generic about covered calls.
    4. Provide a link to the investor relations page and latest SEC filings.

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
      prompt += `\n30-day price range: $${priceRange.low?.toFixed(2)} - $${priceRange.high?.toFixed(2)} (Current: $${priceRange.current?.toFixed(2)})\n`;
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

  /**
   * Generate comprehensive stock analysis for investment decisions
   */
  async generateStockAnalysis(ticker: string): Promise<any> {
    const prompt = this.buildStockAnalysisPrompt(ticker);
    let rawResponse: string = '';

    try {
      console.log(`Generating stock analysis for ${ticker} with 32k token limit...`);
      
      // Use text/plain to allow proper Google Search tool usage
      // Then we'll parse the JSON from the response
      // This matches the pattern used in covered call reports which gets current info
      const result = await this.executePrompt(
        prompt,
        [], // No chat history for stock analysis
        'text/plain', // Changed from 'application/json' to allow Google Search
        32000 // Increased token limit
      );
      
      let responseText = result.response;
      rawResponse = responseText; // Save for error reporting
      
      console.log(`Raw response length: ${responseText.length} characters`);
      
      // Clean the response by removing markdown code blocks and extra content
      responseText = responseText.trim();
      
      // More aggressive markdown stripping
      // Remove opening ```json, ```JSON, or just ```
      responseText = responseText.replace(/^```(?:json|JSON)?\s*\n?/i, '');
      // Remove closing ``` and anything after it
      responseText = responseText.replace(/\n?```[\s\S]*$/, '');
      // Remove any remaining backticks at start/end
      responseText = responseText.replace(/^`+|`+$/g, '');
      
      // Trim again after cleaning
      responseText = responseText.trim();
      
      // Gemini sometimes returns multiple JSON objects - extract only the first complete one
      // Find the first complete JSON object by counting braces
      let braceCount = 0;
      let firstJsonEnd = -1;
      let inString = false;
      let escapeNext = false;
      
      for (let i = 0; i < responseText.length; i++) {
        const char = responseText[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              firstJsonEnd = i;
              break;
            }
          }
        }
      }
      
      if (firstJsonEnd !== -1) {
        responseText = responseText.substring(0, firstJsonEnd + 1);
        console.log(`Extracted first complete JSON object (length: ${responseText.length})`);
      }
      
      console.log(`Final response length: ${responseText.length} characters`);
      console.log(`Final response starts with: ${responseText.substring(0, 50)}`);
      console.log(`Final response ends with: ${responseText.substring(Math.max(0, responseText.length - 50))}`);
      
      // Parse the cleaned JSON response
      const analysis = JSON.parse(responseText);
      
      // Debug: Log the entire result structure to understand what we're getting
      console.log('=== DEBUGGING GROUNDING METADATA ===');
      console.log('result.fullResult exists:', !!result.fullResult);
      console.log('result.fullResult.response exists:', !!result.fullResult?.response);
      console.log('result.fullResult.response.candidates exists:', !!result.fullResult?.response?.candidates);
      console.log('Candidates length:', result.fullResult?.response?.candidates?.length || 0);
      
      if (result.fullResult?.response?.candidates?.[0]) {
        const candidate = result.fullResult.response.candidates[0];
        console.log('Candidate keys:', Object.keys(candidate));
        console.log('Candidate structure (first 1000 chars):', JSON.stringify(candidate, null, 2).substring(0, 1000));
      }
      
      // Extract grounding metadata from the Gemini result
      const groundingMetadata = result.fullResult?.response?.candidates?.[0]?.groundingMetadata;
      console.log('groundingMetadata object:', groundingMetadata);
      console.log('groundingMetadata type:', typeof groundingMetadata);
      console.log('groundingMetadata keys:', groundingMetadata ? Object.keys(groundingMetadata) : 'N/A');
      
      if (groundingMetadata) {
        console.log('Grounding metadata found for stock analysis');
        console.log('Web search queries:', groundingMetadata.webSearchQueries?.length || 0);
        console.log('Search entry point:', !!groundingMetadata.searchEntryPoint);
        console.log('Retrieval metadata keys:', groundingMetadata.retrievalMetadata ? Object.keys(groundingMetadata.retrievalMetadata) : 'empty');
        
        // The structure has webSearchQueries and searchEntryPoint with clickable links
        // The searchEntryPoint contains rendered HTML with links to all the search results
        analysis.groundingMetadata = {
          webSearchQueries: groundingMetadata.webSearchQueries || [],
          searchEntryPoint: groundingMetadata.searchEntryPoint,
          retrievalMetadata: groundingMetadata.retrievalMetadata || {}
        };
        
        console.log('Added grounding metadata with', analysis.groundingMetadata.webSearchQueries?.length || 0, 'search queries');
      } else {
        console.log('No grounding metadata found in response');
      }
      
      return analysis;
    } catch (error: any) {
      console.error('Error generating stock analysis:', error);
      if (rawResponse) {
        console.error('Raw response length:', rawResponse.length);
        console.error('Raw response (first 500 chars):', rawResponse.substring(0, 500));
        console.error('Raw response (last 500 chars):', rawResponse.substring(Math.max(0, rawResponse.length - 500)));
        
        // If JSON parse error, show context around the error position
        if (error.message && error.message.includes('position')) {
          const match = error.message.match(/position (\d+)/);
          if (match) {
            const errorPos = parseInt(match[1]);
            const start = Math.max(0, errorPos - 100);
            const end = Math.min(rawResponse.length, errorPos + 100);
            console.error(`\nContext around error position ${errorPos}:`);
            console.error(rawResponse.substring(start, end));
            console.error(' '.repeat(Math.min(100, errorPos - start)) + '^-- Error here');
          }
        }
      }
      throw new Error(`Failed to generate stock analysis for ${ticker}: ${error.message}`);
    }
  }

  /**
   * Generate news analysis for a stock ticker
   */
  async generateNewsAnalysis(ticker: string): Promise<any> {
    const prompt = this.buildNewsAnalysisPrompt(ticker);
    let rawResponse: string = '';

    try {
      console.log(`Generating news analysis for ${ticker}...`);
      
      // Use text/plain with Google Search to get latest news
      const result = await this.executePrompt(
        prompt,
        [], // No chat history for news analysis
        'text/plain', // Allow Google Search
        8000 // Token limit
      );
      
      let responseText = result.response;
      rawResponse = responseText;
      
      console.log(`Raw news response length: ${responseText.length} characters`);
      
      // Clean the response by removing markdown code blocks
      responseText = responseText.trim();
      responseText = responseText.replace(/^```(?:json|JSON)?\s*\n?/i, '');
      responseText = responseText.replace(/\n?```[\s\S]*$/, '');
      responseText = responseText.replace(/^`+|`+$/g, '');
      responseText = responseText.trim();
      
      // Extract first complete JSON object
      let braceCount = 0;
      let firstJsonEnd = -1;
      let inString = false;
      let escapeNext = false;
      
      for (let i = 0; i < responseText.length; i++) {
        const char = responseText[i];
        
        if (escapeNext) {
          escapeNext = false;
          continue;
        }
        
        if (char === '\\') {
          escapeNext = true;
          continue;
        }
        
        if (char === '"' && !escapeNext) {
          inString = !inString;
          continue;
        }
        
        if (!inString) {
          if (char === '{') {
            braceCount++;
          } else if (char === '}') {
            braceCount--;
            if (braceCount === 0) {
              firstJsonEnd = i;
              break;
            }
          }
        }
      }
      
      if (firstJsonEnd !== -1) {
        responseText = responseText.substring(0, firstJsonEnd + 1);
      }
      
      console.log(`Final news response length: ${responseText.length} characters`);
      
      // Parse the cleaned JSON response
      const analysis = JSON.parse(responseText);
      
      return analysis;
    } catch (error: any) {
      console.error('Error generating news analysis:', error);
      if (rawResponse) {
        console.error('Raw response (first 300 chars):', rawResponse.substring(0, 300));
      }
      
      // If rate limited, throw specific error
      if (error.message && error.message.includes('429')) {
        throw new Error('RATE_LIMITED');
      }
      
      throw new Error(`Failed to generate news analysis for ${ticker}: ${error.message}`);
    }
  }

  /**
   * Build news analysis prompt
   */
  private buildNewsAnalysisPrompt(ticker: string): string {
    return `You are a financial news analyst. Use Google Search to find the latest news and information about the stock ticker: ${ticker.toUpperCase()}.

CRITICAL: Use Google Search to find the most recent news articles (within the last 2 weeks if possible) about ${ticker.toUpperCase()}.

Search for:
1. Recent news articles about ${ticker.toUpperCase()}
2. Earnings announcements or guidance
3. Major business developments
4. Analyst upgrades or downgrades
5. Significant market events affecting the company

IMPORTANT: You MUST respond with ONLY valid JSON matching the exact structure specified below.
Do not include any markdown, explanations, or text outside the JSON object.

Return your response as a JSON object with this EXACT structure:

{
  "ticker": "${ticker.toUpperCase()}",
  "analysisDate": "${new Date().toISOString()}",
  "articles": [
    {
      "title": "string - article title",
      "summary": "string - brief summary of the article (2-3 sentences)",
      "link": "string - fully qualified and accurate URL to the article based on your Google Search results",
      "sentiment": "positive OR negative OR neutral",
      "publicationDate": "string - date the article was published (if available)"
    }
  ]
}

Requirements:
- Find exactly 3 most recent and relevant news articles
- For each article, analyze whether the news is positive, negative, or neutral for the stock
- Include working URLs to the articles
- Focus on news from the last 1-2 weeks if available
- If fewer than 3 articles are found, return what you find

Respond with ONLY the JSON object. No markdown formatting, no explanations, just valid JSON.`;
  }

  /**
   * Build comprehensive stock analysis prompt
   */
  private buildStockAnalysisPrompt(ticker: string): string {
    return `You are a professional financial analyst with expertise in fundamental analysis, technical analysis, and market research. 

CRITICAL FIRST STEP: Use Google Search to find the latest, most current information about ${ticker.toUpperCase()}. Search for recent news, financial reports, SEC filings, analyst reports, and current stock data. Make multiple searches if needed to gather comprehensive information.

You only analyze stocks or ETFs listed on the NASDAQ or NYSE exchange.
Do not look at any other exchanges.

Generate a comprehensive stock analysis for the ticker symbol: ${ticker.toUpperCase()} based on your Google Search results.

IMPORTANT: You MUST respond with ONLY valid JSON matching the exact structure specified below. 
Do not include any markdown, explanations, or text outside the JSON object.

If you cannot provide the data after searching, return "Unknown" or empty arrays/objects as appropriate.

Using the information gathered from your Google Search, perform the following analysis:

1. **Key Dates** (Search for company history and earnings calendar)
   - Company founding year
   - Most recent earnings report date (search for "latest earnings report")
   - Next earnings report date (search for "upcoming earnings date" - estimate if not announced)

2. **Company Headquarters** (Search for company contact information)
   - City, state (if US), country
   - Corporate address if available

3. **Industry Classification** (Search for GICS classification or industry sector)
   - GICS Sector
   - GICS Industry Group
   - GICS Industry
   - GICS Sub-Industry

4. **Industry Position** (Search for market position and competitors)
   - Market rank/position (if available) and summary of what this company does
   - List 3-5 key competitors (search for "top competitors")
   - List 3-5 peer companies
   - Key suppliers (if relevant/available)

5. **Recent News** (Search specifically for "${ticker.toUpperCase()} news latest")
   - Find 3-5 most recent significant news articles from the past 30 days
   - Include article title, brief summary including publication date, and URL

6. **Analyst Sentiment** (Search for "${ticker.toUpperCase()} analyst ratings" and "${ticker.toUpperCase()} price target")
   - Overall consensus rating (Strong Buy, Buy, Hold, Sell, Strong Sell)
   - Number of analyst ratings (how many analysts cover this stock)
   - Average price target (consensus target price)
   - High and low price targets from analysts
   - Recent rating changes (upgrades/downgrades in past 30-60 days)
   - Summary of analyst sentiment and key points from analyst reports

7. **Investment Cases** (Search for analyst opinions and investment theses)
   - **Bullish case**: List 3-5 reasons to invest based on recent analysis and news
   - **Bearish case**: List 3-5 reasons to avoid or be cautious based on recent concerns

8. **Trends Analysis** (Perform separate searches for each)
   - **Industry trends**: Search for "${ticker.toUpperCase()} industry trends 2025" and summarize current industry trends and their impact outlook
   - **Macroeconomic trends**: Search for "macroeconomic trends impact on stocks 2025" and explain how broader economic trends may affect this stock

9. **Red Flags Analysis** (Search for "${ticker.toUpperCase()} SEC filings" and "${ticker.toUpperCase()} risk factors")
   Search specifically for and analyze:
   - Going concern language in recent 10-K or 10-Q filings
   - Legal or regulatory issues (search for lawsuits and investigations)
   - Financial performance issues (search for financial statements - declining revenue, weak earnings quality, unstable margins)
   - Balance sheet concerns (search for debt levels, liquidity issues, accounting changes)
   - Risk disclosures from latest SEC filings (lawsuits, customer/supplier concentration, geopolitical exposure)
   - Income statement anomalies (unexplained revenue spikes, expense drops vs revenue)

10. **Technical Analysis** (Search for "${ticker.toUpperCase()} stock price" and "${ticker.toUpperCase()} technical analysis")
   - Support levels (array of 2-3 current price levels based on recent trading)
   - Resistance levels (array of 2-3 current price levels based on recent trading)
   - 50-day moving average (current value)
   - 200-day moving average (current value)
   - RSI (Relative Strength Index - current value)
   - Average daily trading volume (recent 30-day average)

11. **Investor Resources** (Search for "${ticker.toUpperCase()} investor relations" and "${ticker.toUpperCase()} SEC filings")
    - Provide a link to the investor relations page
    - Provide a link to the latest SEC filings page

12. **Detailed Company Summary** (Search for "${ticker.toUpperCase()} company overview" and "${ticker.toUpperCase()} business model")
    - Provide a detailed summary of the company's business model, revenue streams, and market position

Return your response as a JSON object with this EXACT structure:

{
  "ticker": "${ticker.toUpperCase()}",
  "companyName": "string",
  "keyDates": {
    "foundedYear": number,
    "mostRecentEarnings": "YYYY-MM-DD",
    "nextEarningsDate": "YYYY-MM-DD or TBD"
  },
  "headquarters": {
    "city": "string",
    "state": "string (or empty if not US)",
    "country": "string",
    "address": "string (optional)"
  },
  "industry": {
    "gicsSector": "string",
    "gicsIndustryGroup": "string",
    "gicsIndustry": "string",
    "gicsSubIndustry": "string"
  },
  "industryPosition": {
    "rank": "string (optional, e.g., '#3 in market share')",
    "keyCompetitors": ["competitor1", "competitor2", "competitor3"],
    "peerCompanies": ["peer1", "peer2", "peer3"],
    "keySuppliers": ["supplier1", "supplier2"] (optional)
  },
  "recentNews": [
    {
      "title": "string",
      "summary": "string",
      "url": "string"
    }
  ],
  "analystSentiment": {
    "consensusRating": "string (Strong Buy, Buy, Hold, Sell, or Strong Sell)",
    "numberOfAnalysts": number,
    "averagePriceTarget": number,
    "highPriceTarget": number,
    "lowPriceTarget": number,
    "recentChanges": ["string describing recent upgrades/downgrades"],
    "summary": "string (summary of analyst sentiment)"
  },
  "investmentCases": {
    "bullish": ["reason1", "reason2", "reason3"],
    "bearish": ["reason1", "reason2", "reason3"]
  },
  "trends": {
    "industryTrends": {
      "summary": "string",
      "impactOutlook": "string"
    },
    "macroeconomicTrends": {
      "summary": "string",
      "impactOutlook": "string"
    }
  },
  "redFlags": {
    "goingConcernLanguage": boolean,
    "legalOrRegulatoryIssues": ["issue1", "issue2"] (or empty array),
    "financialPerformance": {
      "decliningRevenue": boolean,
      "weakEarningsQuality": boolean,
      "unstableMargins": boolean
    },
    "balanceSheet": {
      "highDebtToEquity": boolean,
      "liquidityIssues": boolean,
      "accountingChanges": boolean
    },
    "riskDisclosures": {
      "lawsuitsOrInvestigations": boolean,
      "customerOrSupplierConcentration": boolean,
      "geopoliticalOrCommodityExposure": boolean
    },
    "incomeStatement": {
      "unexplainedRevenueSpikes": boolean,
      "expenseDropVsRevenue": boolean
    }
  },
  "technicalAnalysis": {
    "supportLevels": [number, number],
    "resistanceLevels": [number, number],
    "movingAverages": {
      "fiftyDay": number,
      "twoHundredDay": number
    },
    "rsi": number,
    "averageVolume": number,
    "narrativeSummary": "detailed explanation of technical analysis in string format."
  },
  "investorResources": {
    "investorRelationsPage": "string (URL)",
    "secFilingsPage": "string (URL)"
  },
  "companySummary": "string (detailed summary of business model and market position)"
}

Respond with ONLY the JSON object. No markdown formatting, no explanations, just valid JSON.`;
  }
}

export const geminiService = new GeminiService();

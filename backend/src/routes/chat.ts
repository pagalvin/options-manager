import express from 'express';
import { geminiService, ChatMessage } from '../services/geminiService';

const router = express.Router();

// Store chat sessions in memory (in production, you might want to use Redis or database)
const chatSessions = new Map<string, ChatMessage[]>();

// Generate a simple session ID
function generateSessionId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// POST /api/chat - General chat endpoint
router.post('/', async (req, res) => {
  try {
    const { prompt, sessionId: providedSessionId, expectedResponseMimeType } = req.body;

    if (!prompt) {
      return res.status(400).json({ 
        error: 'Prompt is required' 
      });
    }

    // Get or create session
    const sessionId = providedSessionId || generateSessionId();
    const chatHistory = chatSessions.get(sessionId) || [];

    // Enhance the prompt with grounding information
    const enhancedPrompt = await geminiService.insertCommonGroundingInformation({
      userPrompt: prompt,
      userName: req.headers['x-user-name'] as string,
      userEmail: req.headers['x-user-email'] as string,
    });

    // Execute the prompt
    const result = await geminiService.executePrompt(
      enhancedPrompt,
      chatHistory,
      expectedResponseMimeType || 'text/plain'
    );

    // Update chat history
    const userMessage: ChatMessage = {
      role: 'user',
      content: prompt,
      timestamp: new Date()
    };

    const modelMessage: ChatMessage = {
      role: 'model',
      content: result.response,
      timestamp: new Date()
    };

    chatHistory.push(userMessage, modelMessage);
    chatSessions.set(sessionId, chatHistory);

    res.json({
      success: true,
      response: result.response,
      sessionId,
      chatHistory: chatHistory.slice(-10), // Return last 10 messages
      rawGeminiResult: result.rawGeminiResult
    });

  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to process chat request',
      message: error.message 
    });
  }
});

// POST /api/chat/covered-call-report/:symbol - Generate covered call report
router.post('/covered-call-report/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { sessionId: providedSessionId, followUpPrompt } = req.body;

    if (!symbol) {
      return res.status(400).json({ 
        error: 'Symbol is required' 
      });
    }

    // Get or create session
    const sessionId = providedSessionId || generateSessionId();
    const chatHistory = chatSessions.get(sessionId) || [];

    let result;
    let reportData = null;
    let rawGeminiResult = null;

    if (followUpPrompt) {
      // This is a follow-up question to an existing report
      const enhancedPrompt = await geminiService.insertCommonGroundingInformation({
        userPrompt: followUpPrompt,
        symbol: symbol.toUpperCase(),
        userName: req.headers['x-user-name'] as string,
        userEmail: req.headers['x-user-email'] as string,
      });

      result = await geminiService.executePrompt(enhancedPrompt, chatHistory, 'text/plain');
      rawGeminiResult = result.rawGeminiResult;
    } else {
      // Generate initial covered call report
      const reportResult = await geminiService.generateCoveredCallReport(symbol, chatHistory);
      result = { response: reportResult.response };
      reportData = reportResult.reportData;
      rawGeminiResult = reportResult.rawGeminiResult;
    }

    // Update chat history
    const userMessage: ChatMessage = {
      role: 'user',
      content: followUpPrompt || `Generate covered call report for ${symbol}`,
      timestamp: new Date()
    };

    const modelMessage: ChatMessage = {
      role: 'model',
      content: result.response,
      timestamp: new Date()
    };

    chatHistory.push(userMessage, modelMessage);
    chatSessions.set(sessionId, chatHistory);

    res.json({
      success: true,
      response: result.response,
      sessionId,
      symbol: symbol.toUpperCase(),
      reportData,
      chatHistory: chatHistory.slice(-10), // Return last 10 messages
      rawGeminiResult
    });

  } catch (error: any) {
    console.error('Covered call report endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to generate covered call report',
      message: error.message 
    });
  }
});

// GET /api/chat/session/:sessionId - Get chat history
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const chatHistory = chatSessions.get(sessionId) || [];

    res.json({
      success: true,
      sessionId,
      chatHistory
    });

  } catch (error: any) {
    console.error('Get session endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve chat session',
      message: error.message 
    });
  }
});

// DELETE /api/chat/session/:sessionId - Clear chat history
router.delete('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    chatSessions.delete(sessionId);

    res.json({
      success: true,
      message: 'Chat session cleared'
    });

  } catch (error: any) {
    console.error('Clear session endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to clear chat session',
      message: error.message 
    });
  }
});

// GET /api/chat/sessions - Get all active sessions (for debugging)
router.get('/sessions', (req, res) => {
  try {
    const sessions = Array.from(chatSessions.keys()).map(sessionId => ({
      sessionId,
      messageCount: chatSessions.get(sessionId)?.length || 0,
      lastActivity: chatSessions.get(sessionId)?.slice(-1)[0]?.timestamp || null
    }));

    res.json({
      success: true,
      sessions
    });

  } catch (error: any) {
    console.error('Get sessions endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to retrieve chat sessions',
      message: error.message 
    });
  }
});

export default router;

import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, X, RefreshCw, Trash2, Eye, EyeOff } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { GroundingTest } from './GroundingTest';

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
  groundingMetadata?: any; // Add grounding metadata to messages
}

interface ChatInterfaceProps {
  symbol?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ChatInterface({ symbol, isOpen, onClose }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showGroundingTest, setShowGroundingTest] = useState<boolean>(false);
  const [lastRawResult, setLastRawResult] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Function to add inline citations to text based on grounding metadata
  const addInlineCitations = (text: string, groundingMetadata: any): string => {
    if (!groundingMetadata?.groundingSupports || !groundingMetadata?.groundingChunks) {
      return text;
    }

    const supports = groundingMetadata.groundingSupports;
    const chunks = groundingMetadata.groundingChunks;

    // Sort supports by end_index in descending order to avoid shifting issues when inserting
    const sortedSupports = [...supports].sort((a, b) => b.segment.endIndex - a.segment.endIndex);

    let modifiedText = text;

    for (const support of sortedSupports) {
      const endIndex = support.segment.endIndex;
      if (support.groundingChunkIndices && support.groundingChunkIndices.length > 0) {
        // Create citation links like [1][2][3]
        const citationLinks = support.groundingChunkIndices
          .filter((i: number) => i < chunks.length)
          .map((i: number) => `[${i + 1}]`)
          .join('');

        if (citationLinks) {
          modifiedText = modifiedText.slice(0, endIndex) + citationLinks + modifiedText.slice(endIndex);
        }
      }
    }

    return modifiedText;
  };

  // Function to render search entry point if available
  const renderSearchEntryPoint = (groundingMetadata: any) => {
    if (!groundingMetadata?.searchEntryPoint?.renderedContent) {
      return null;
    }

    return (
      <div 
        className="my-3 border rounded-lg overflow-hidden"
        dangerouslySetInnerHTML={{ __html: groundingMetadata.searchEntryPoint.renderedContent }}
      />
    );
  };

  // Function to render source citations
  const renderSourceCitations = (groundingMetadata: any) => {
    if (!groundingMetadata?.groundingChunks || groundingMetadata.groundingChunks.length === 0) {
      return null;
    }

    return (
      <div className="mt-3 pt-3 border-t border-gray-200">
        <div className="text-sm font-medium text-gray-700 mb-2">Sources:</div>
        <div className="space-y-1">
          {groundingMetadata.groundingChunks.map((chunk: any, index: number) => (
            <div key={index} className="flex items-center space-x-2 text-sm">
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                {index + 1}
              </span>
              <a
                href={chunk.web.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:text-blue-800 underline truncate"
                title={chunk.web.title}
              >
                {chunk.web.title}
              </a>
            </div>
          ))}
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (messages.length > 2) {
      scrollToBottom();
    }
  }, [messages]);

  useEffect(() => {
    console.log('ChatInterface.tsx: useEffect: generating covered call report for symbol:', symbol);
    setMessages([]);
    generateCoveredCallReport();
    // if (symbol && isOpen && messages.length === 0) {
    //   // Auto-generate covered call report when opened with a symbol
    // }
  }, [symbol, isOpen]);

  const generateCoveredCallReport = async () => {
    if (!symbol) return;

    setMessages([]);
    setIsLoading(true);
    setError(null);
    setSessionId(null);

    try {
      const response = await fetch(`/api/chat/covered-call-report/${symbol}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: null,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSessionId(data.sessionId);
        setMessages(data.chatHistory || []);
        
        // Log the raw Gemini result for debugging/inspection
        if (data.rawGeminiResult) {
          console.log('Raw Gemini Result (Covered Call Report):', data.rawGeminiResult);
          setLastRawResult(data.rawGeminiResult);
          
          // Store grounding metadata in the last message if available
          if (data.rawGeminiResult.response?.candidates?.[0]?.groundingMetadata) {
            const lastMessage = data.chatHistory?.[data.chatHistory.length - 1];
            if (lastMessage && lastMessage.role === 'model') {
              lastMessage.groundingMetadata = data.rawGeminiResult.response.candidates[0].groundingMetadata;
            }
          }
        }
      } else {
        throw new Error(data.message || 'Failed to generate report');
      }
    } catch (err) {
      console.error('Error generating covered call report:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate report');
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setError(null);

    // Add user message to UI immediately
    const newUserMessage: ChatMessage = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, newUserMessage]);
    setIsLoading(true);

    try {
      let endpoint = '/api/chat';
      let body: any = {
        prompt: userMessage,
        sessionId: sessionId,
      };

      // If we have a symbol and this is a follow-up question to a report
      if (symbol && sessionId) {
        endpoint = `/api/chat/covered-call-report/${symbol}`;
        body = {
          followUpPrompt: userMessage,
          sessionId: sessionId,
        };
      }

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success) {
        setSessionId(data.sessionId);
        setMessages(data.chatHistory || []);
        
        // Log the raw Gemini result for debugging/inspection
        if (data.rawGeminiResult) {
          console.log('Raw Gemini Result (Chat):', data.rawGeminiResult);
          setLastRawResult(data.rawGeminiResult);
          
          // Store grounding metadata in the last message if available
          if (data.rawGeminiResult.response?.candidates?.[0]?.groundingMetadata) {
            const lastMessage = data.chatHistory?.[data.chatHistory.length - 1];
            if (lastMessage && lastMessage.role === 'model') {
              lastMessage.groundingMetadata = data.rawGeminiResult.response.candidates[0].groundingMetadata;
            }
          }
        }
      } else {
        throw new Error(data.message || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message');
      
      // Add error message to chat
      const errorMessage: ChatMessage = {
        role: 'model',
        content: `Error: ${err instanceof Error ? err.message : 'Failed to send message'}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    if (!sessionId) {
      setMessages([]);
      return;
    }

    try {
      await fetch(`/api/chat/session/${sessionId}`, {
        method: 'DELETE',
      });
      setMessages([]);
      setSessionId(null);
      setError(null);
    } catch (err) {
      console.error('Error clearing chat:', err);
      // Clear UI anyway
      setMessages([]);
      setSessionId(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatMessage = (content: string, groundingMetadata?: any) => {
    // Add inline citations if grounding metadata is available
    const textWithCitations = groundingMetadata ? addInlineCitations(content, groundingMetadata) : content;
    
    // Custom components for ReactMarkdown
    const components = {
      // Custom citation renderer
      text: ({ children }: { children: React.ReactNode }) => {
        const text = String(children);
        // Check if this text contains citations
        if (text.match(/\[\d+\]/)) {
          const parts = text.split(/(\[\d+\])/g);
          return (
            <>
              {parts.map((part, i) => {
                const citationMatch = part.match(/^\[(\d+)\]$/);
                if (citationMatch) {
                  const citationNum = parseInt(citationMatch[1]);
                  const chunk = groundingMetadata?.groundingChunks?.[citationNum - 1];
                  if (chunk) {
                    return (
                      <a
                        key={i}
                        href={chunk.web.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium bg-blue-50 px-1 py-0.5 rounded mx-0.5 no-underline"
                        title={`Source: ${chunk.web.title}`}
                      >
                        {part}
                      </a>
                    );
                  }
                  return (
                    <span key={i} className="text-blue-600 text-xs font-medium bg-blue-50 px-1 py-0.5 rounded mx-0.5">
                      {part}
                    </span>
                  );
                }
                return part;
              })}
            </>
          );
        }
        return <>{children}</>;
      },
      // Table styling
      table: ({ children }: { children: React.ReactNode }) => (
        <div className="overflow-x-auto my-2">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg">
            {children}
          </table>
        </div>
      ),
      thead: ({ children }: { children: React.ReactNode }) => (
        <thead className="bg-gray-50">{children}</thead>
      ),
      tbody: ({ children }: { children: React.ReactNode }) => (
        <tbody className="bg-white divide-y divide-gray-200">{children}</tbody>
      ),
      th: ({ children }: { children: React.ReactNode }) => (
        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200 last:border-r-0">
          {children}
        </th>
      ),
      td: ({ children }: { children: React.ReactNode }) => (
        <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900 border-r border-gray-200 last:border-r-0">
          {children}
        </td>
      ),
      // Code blocks
      code: ({ node, inline, className, children, ...props }: any) => {
        const match = /language-(\w+)/.exec(className || '');
        return !inline && match ? (
          <SyntaxHighlighter
            style={oneDark}
            language={match[1]}
            PreTag="div"
            className="rounded-lg my-4"
            {...props}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        ) : (
          <code
            className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono"
            {...props}
          >
            {children}
          </code>
        );
      },
      // Headers
      h1: ({ children }: { children: React.ReactNode }) => (
        <h1 className="text-xl font-bold mt-3 mb-2 text-gray-900 border-b border-gray-200 pb-1">
          {children}
        </h1>
      ),
      h2: ({ children }: { children: React.ReactNode }) => (
        <h2 className="text-lg font-semibold mt-3 mb-1 text-gray-900">{children}</h2>
      ),
      h3: ({ children }: { children: React.ReactNode }) => (
        <h3 className="text-md font-medium mt-2 mb-1 text-gray-900">{children}</h3>
      ),
      // Lists
      ul: ({ children }: { children: React.ReactNode }) => (
        <ul className="list-disc list-inside my-1 space-y-0 text-gray-900">{children}</ul>
      ),
      ol: ({ children }: { children: React.ReactNode }) => (
        <ol className="list-decimal list-inside my-1 space-y-0 text-gray-900">{children}</ol>
      ),
      li: ({ children }: { children: React.ReactNode }) => (
        <li className="text-gray-900">{children}</li>
      ),
      // Paragraphs
      p: ({ children }: { children: React.ReactNode }) => (
        <p className="mb-1 text-gray-900 leading-normal">{children}</p>
      ),
      // Emphasis
      strong: ({ children }: { children: React.ReactNode }) => (
        <strong className="font-semibold text-gray-900">{children}</strong>
      ),
      em: ({ children }: { children: React.ReactNode }) => (
        <em className="italic text-gray-700">{children}</em>
      ),
      // Blockquotes
      blockquote: ({ children }: { children: React.ReactNode }) => (
        <blockquote className="border-l-4 border-blue-500 pl-4 my-2 italic text-gray-700 bg-gray-50 py-1">
          {children}
        </blockquote>
      ),
      // Links
      a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
        <a
          {...props}
          target="_blank"
          rel="noopener noreferrer"
          className={`text-blue-600 hover:text-blue-800 underline ${props.className ?? ''}`}
        >
          {props.children}
        </a>
      ),
    };

    return (
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={components as any}
        className="prose prose-sm max-w-none markdown-content"
      >
        {textWithCitations}
      </ReactMarkdown>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center space-x-2">
            <MessageSquare className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold">
              {symbol ? `Options Analysis Chat - ${symbol}` : 'Options Trading Chat'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {symbol && (
              <button
                onClick={generateCoveredCallReport}
                disabled={isLoading}
                className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:bg-gray-300 text-sm flex items-center space-x-1"
                title="Regenerate covered call report"
              >
                {isLoading ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                <span>Report</span>
              </button>
            )}
            <button
              onClick={clearChat}
              className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm flex items-center space-x-1"
              title="Clear chat history"
            >
              <Trash2 size={16} />
              <span>Clear</span>
            </button>
            {lastRawResult && (
              <button
                onClick={() => setShowGroundingTest(!showGroundingTest)}
                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm flex items-center space-x-1"
                title="Toggle grounding data display"
              >
                {showGroundingTest ? <EyeOff size={16} /> : <Eye size={16} />}
                <span>Grounding</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-gray-500 mt-8">
              <MessageSquare size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg mb-2">
                {symbol ? `Ready to analyze ${symbol}` : 'Start a conversation'}
              </p>
              <p className="text-sm">
                {symbol 
                  ? 'Click "Report" to generate a covered call analysis, or ask any questions about options trading.'
                  : 'Ask questions about options trading, covered calls, or market analysis.'
                }
              </p>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-3xl p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap">
                  {message.role === 'user' ? (
                    message.content
                  ) : (
                    <div className="space-y-2">
                      {/* Render search entry point if available */}
                      {message.groundingMetadata && renderSearchEntryPoint(message.groundingMetadata)}
                      
                      {/* Render formatted message with inline citations */}
                      <div className="prose prose-sm max-w-none">
                        {formatMessage(message.content, message.groundingMetadata)}
                      </div>
                      
                      {/* Render source citations if available */}
                      {message.groundingMetadata && renderSourceCitations(message.groundingMetadata)}
                    </div>
                  )}
                </div>
                <div className={`text-xs mt-2 ${
                  message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                }`}>
                  {new Date(message.timestamp).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 p-3 rounded-lg">
                <div className="flex items-center space-x-2">
                  <RefreshCw className="animate-spin" size={16} />
                  <span className="text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Grounding Test Component */}
        {showGroundingTest && lastRawResult && (
          <div className="border-t bg-gray-50 p-4 max-h-60 overflow-y-auto">
            <GroundingTest rawGeminiResult={lastRawResult} />
          </div>
        )}

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex space-x-2">
            <textarea
              ref={inputRef}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={symbol ? `Ask a question about ${symbol} or options trading...` : 'Ask a question about options trading...'}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={!inputMessage.trim() || isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              <Send size={16} />
              <span>Send</span>
            </button>
          </div>
        </div>

        {/* Global styles for markdown rendering */}
        <style>{`
          .markdown-content table {
            width: 100%;
            border-collapse: collapse;
            margin: 0.5rem 0;
          }
          
          .markdown-content th,
          .markdown-content td {
            border: 1px solid #e5e7eb;
            padding: 0.5rem;
            text-align: left;
          }
          
          .markdown-content th {
            background-color: #f9fafb;
            font-weight: 600;
          }
          
          .markdown-content tr:nth-child(even) {
            background-color: #f9fafb;
          }
          
          .markdown-content pre {
            overflow-x: auto;
            background-color: #1f2937;
            color: #f3f4f6;
            padding: 0.75rem;
            border-radius: 0.5rem;
            margin: 0.5rem 0;
          }
          
          .markdown-content code {
            background-color: #f3f4f6;
            color: #374151;
            padding: 0.125rem 0.25rem;
            border-radius: 0.25rem;
            font-family: ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace;
          }
          
          .markdown-content pre code {
            background-color: transparent;
            color: inherit;
            padding: 0;
          }
        `}</style>
      </div>
    </div>
  );
}

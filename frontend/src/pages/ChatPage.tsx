import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { ChatInterface } from '../components/ChatInterface';

export function ChatPage() {
  const { symbol } = useParams<{ symbol?: string }>();
  const [isChatOpen] = useState(true); // Always open on this page

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {symbol ? `Options Analysis Chat - ${symbol.toUpperCase()}` : 'Options Trading Chat'}
        </h1>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow min-h-96">
        <ChatInterface
          symbol={symbol}
          isOpen={isChatOpen}
          onClose={() => window.history.back()}
        />
      </div>
    </div>
  );
}
